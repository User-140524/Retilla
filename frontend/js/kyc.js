import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ==========================================================
   RENTILLA — KYC / DigiLocker Verification Page
   ----------------------------------------------------------
   IMPORTANT: The Setu client-secret must NEVER live in this
   file or any frontend code — it is a browser-exposed file.
   All actual Setu API calls happen server-side, in a Firebase
   Cloud Function ("kycCreateDigilockerRequest" and
   "kycFetchDigilockerAadhaar"). This file only calls YOUR
   Cloud Functions, never Setu directly.

   PLACEHOLDER STATE: Cloud Function URLs below are placeholders
   until Setu sandbox credentials are available and the
   functions are deployed. Swap CLOUD_FUNCTIONS_BASE_URL once
   deployed (see functions/index.js scaffold).
   ========================================================== */

const CLOUD_FUNCTIONS_BASE_URL = "https://REGION-PROJECTID.cloudfunctions.net";
// Example once deployed: "https://us-central1-rentilla-app.cloudfunctions.net"

const startKycBtn = document.getElementById("startKycBtn");
const kycStatusMsg = document.getElementById("kycStatusMsg");

let currentUser = null;

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }
  currentUser = user;
  checkForDigilockerCallback();
});

function setStatus(text, type) {
  kycStatusMsg.textContent = text;
  kycStatusMsg.className = `kyc-status ${type || ""}`;
}

/* ---------------------------------------------------------
   STEP 1: User clicks "Verify with DigiLocker"
   -> Call our Cloud Function, which calls Setu's
      "Create DigiLocker request" API server-side, and
      returns a consent URL to redirect the user to.
--------------------------------------------------------- */
if (startKycBtn) {
  startKycBtn.addEventListener("click", async () => {
    if (!currentUser) return;

    startKycBtn.disabled = true;
    setStatus("Starting verification...", "pending");

    try {
      const redirectUrl = `${window.location.origin}/kyc.html`;

      const response = await fetch(`${CLOUD_FUNCTIONS_BASE_URL}/kycCreateDigilockerRequest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: currentUser.uid,
          redirectUrl
        })
      });

      if (!response.ok) throw new Error("Failed to start verification");

      const data = await response.json();
      // data.id = DigiLocker request id (Setu)
      // data.url = consent URL to redirect the user to

      // Remember the request id locally so we can check its status
      // when the user is redirected back after granting consent.
      sessionStorage.setItem("rentillaDigilockerRequestId", data.id);

      window.location.href = data.url;
    } catch (error) {
      console.error("KYC start error:", error);
      setStatus("Could not start verification. Please try again.", "error");
      startKycBtn.disabled = false;
    }
  });
}

/* ---------------------------------------------------------
   STEP 2: User is redirected back here after granting
   consent on DigiLocker's page. We check if a pending
   request id exists, confirm its status, then fetch the
   verified Aadhaar data and save it to Firestore.
--------------------------------------------------------- */
async function checkForDigilockerCallback() {
  const requestId = sessionStorage.getItem("rentillaDigilockerRequestId");
  if (!requestId) return; // not returning from a DigiLocker redirect

  setStatus("Confirming your verification...", "pending");
  if (startKycBtn) startKycBtn.disabled = true;

  try {
    const response = await fetch(`${CLOUD_FUNCTIONS_BASE_URL}/kycFetchDigilockerAadhaar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uid: currentUser.uid,
        requestId
      })
    });

    if (!response.ok) throw new Error("Verification not confirmed");

    const result = await response.json();
    // Expected shape from our Cloud Function (which itself calls
    // Setu's "Fetch Aadhaar data" API):
    // { verified: true, name, dob, gender, address }

    if (!result.verified) {
      setStatus("Verification was not completed. Please try again.", "error");
      if (startKycBtn) startKycBtn.disabled = false;
      sessionStorage.removeItem("rentillaDigilockerRequestId");
      return;
    }

    // Save verified data to Firestore. kycStatus becomes "verified"
    // and gates cart.js's startRentalRequest() from here on.
    await setDoc(doc(db, "users", currentUser.uid), {
      kycStatus: "verified",
      kycVerifiedName: result.name || "",
      kycVerifiedAddress: result.address || "",
      kycVerifiedDOB: result.dob || "",
      kycVerifiedAt: serverTimestamp()
    }, { merge: true });

    sessionStorage.removeItem("rentillaDigilockerRequestId");

    setStatus("Verified! Redirecting...", "success");

    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 1200);
  } catch (error) {
    console.error("KYC callback error:", error);
    setStatus("Could not confirm verification. Please try again.", "error");
    if (startKycBtn) startKycBtn.disabled = false;
    sessionStorage.removeItem("rentillaDigilockerRequestId");
  }
}
