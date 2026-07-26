/* ==========================================================
   RENTILLA — Firebase Cloud Functions
   functions/index.js

   Holds Setu client-secret server-side and proxies DigiLocker
   API calls. Requires Firebase Blaze plan (outbound network
   calls aren't available on the free Spark plan).

   SETUP (once you have Setu sandbox credentials):
     firebase functions:config:set \
       setu.client_id="YOUR_CLIENT_ID" \
       setu.client_secret="YOUR_CLIENT_SECRET" \
       setu.product_instance_id="YOUR_PRODUCT_INSTANCE_ID"

     Then deploy:
       firebase deploy --only functions

   PLACEHOLDER: SETU_BASE_URL points at Setu's sandbox for now.
   Switch to production URL only after Setu approves go-live.
   ========================================================== */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");

admin.initializeApp();
const db = admin.firestore();

const SETU_BASE_URL = "https://dg-sandbox.setu.co"; // sandbox — swap for production later

function setuHeaders() {
  const config = functions.config().setu || {};
  return {
    "content-type": "application/json",
    "x-client-id": config.client_id || "PLACEHOLDER_CLIENT_ID",
    "x-client-secret": config.client_secret || "PLACEHOLDER_CLIENT_SECRET",
    "x-product-instance-id": config.product_instance_id || "PLACEHOLDER_PRODUCT_INSTANCE_ID"
  };
}

/* ---------------------------------------------------------
   POST /kycCreateDigilockerRequest
   Body: { uid, redirectUrl }
   -> Calls Setu's "Create DigiLocker request" API.
   -> Returns { id, url } so the frontend can redirect the
      user to DigiLocker's consent screen.
--------------------------------------------------------- */
exports.kycCreateDigilockerRequest = functions.https.onRequest(async (req, res) => {
  // TODO: add CORS handling appropriate to your domain once deployed
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { uid, redirectUrl } = req.body || {};

  if (!uid || !redirectUrl) {
    return res.status(400).json({ error: "uid and redirectUrl are required" });
  }

  try {
    const setuResponse = await fetch(`${SETU_BASE_URL}/api/digilocker`, {
      method: "POST",
      headers: setuHeaders(),
      body: JSON.stringify({ redirectUrl })
    });

    if (!setuResponse.ok) {
      const errText = await setuResponse.text();
      console.error("Setu create-request error:", errText);
      return res.status(502).json({ error: "Failed to create DigiLocker request" });
    }

    const data = await setuResponse.json();
    // data.id  -> DigiLocker request id
    // data.url -> consent URL to redirect the user to

    // Track this request against the user, in case we need to
    // audit or debug later.
    await db.collection("users").doc(uid).collection("kycAttempts").add({
      digilockerRequestId: data.id,
      status: "started",
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return res.status(200).json({ id: data.id, url: data.url });
  } catch (error) {
    console.error("kycCreateDigilockerRequest error:", error);
    return res.status(500).json({ error: "Internal error starting verification" });
  }
});

/* ---------------------------------------------------------
   POST /kycFetchDigilockerAadhaar
   Body: { uid, requestId }
   -> Checks request status with Setu; if authenticated,
      fetches Aadhaar data and returns it to the frontend.
   -> Frontend (kyc.js) is responsible for writing this into
      the user's Firestore doc — this function just verifies
      and returns data, keeping the function itself stateless
      aside from the audit log below.
--------------------------------------------------------- */
exports.kycFetchDigilockerAadhaar = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { uid, requestId } = req.body || {};

  if (!uid || !requestId) {
    return res.status(400).json({ error: "uid and requestId are required" });
  }

  try {
    // 1. Check request status
    const statusResponse = await fetch(`${SETU_BASE_URL}/api/digilocker/${requestId}/status`, {
      method: "GET",
      headers: setuHeaders()
    });

    if (!statusResponse.ok) {
      throw new Error("Failed to fetch DigiLocker request status");
    }

    const statusData = await statusResponse.json();

    if (statusData.status !== "authenticated") {
      return res.status(200).json({ verified: false });
    }

    // 2. Fetch Aadhaar data now that consent is confirmed
    const aadhaarResponse = await fetch(`${SETU_BASE_URL}/api/digilocker/${requestId}/aadhaar`, {
      method: "GET",
      headers: setuHeaders()
    });

    if (!aadhaarResponse.ok) {
      throw new Error("Failed to fetch Aadhaar data");
    }

    const aadhaarData = await aadhaarResponse.json();
    // Expected fields (from Setu docs): name, dob, gender, address, etc.
    // Exact field names should be confirmed against Setu's live API
    // response once sandbox access is available — this is a best-guess
    // shape based on their public docs.

    await db.collection("users").doc(uid).collection("kycAttempts").add({
      digilockerRequestId: requestId,
      status: "verified",
      verifiedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return res.status(200).json({
      verified: true,
      name: aadhaarData.name || "",
      dob: aadhaarData.dob || "",
      gender: aadhaarData.gender || "",
      address: aadhaarData.address || ""
    });
  } catch (error) {
    console.error("kycFetchDigilockerAadhaar error:", error);
    return res.status(500).json({ error: "Internal error confirming verification" });
  }
});
