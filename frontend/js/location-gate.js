/* ==========================================================
   RENTILLA — Service Area Gate
   Blocks the entire site behind a full-screen overlay until
   the visitor enters a pincode inside our service area
   (Delhi NCR + Dehradun). Re-asked every session (sessionStorage,
   not localStorage) per product decision.
   ========================================================== */

// Approximate pincode ranges for the service area.
// NOTE: these ranges are a reasonable approximation based on general
// postal-code knowledge, not an official, exhaustive list — some edge
// pincodes near district borders may be misclassified. Recommend
// spot-checking a few known pincodes per city and expanding this list
// over time as you get real customer pincodes that fail incorrectly.
const SERVICE_AREA_RANGES = [
  { label: "Delhi",      min: 110001, max: 110099 },
  { label: "Gurugram",   min: 122001, max: 122505 },
  { label: "Noida",      min: 201301, max: 201318 },
  { label: "Ghaziabad",  min: 201001, max: 201017 },
  { label: "Faridabad",  min: 121001, max: 121012 },
  { label: "Dehradun",   min: 248001, max: 248198 }
];

const SESSION_KEY = "rentillaLocationVerified";

function isPincodeInServiceArea(pincode) {
  const num = parseInt(pincode, 10);
  if (isNaN(num) || String(pincode).length !== 6) return false;
  return SERVICE_AREA_RANGES.some(range => num >= range.min && num <= range.max);
}

function showLocationGate() {
  if (document.getElementById("locationGateOverlay")) return;

  const overlay = document.createElement("div");
  overlay.id = "locationGateOverlay";
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 99999;
    background: rgba(10,10,10,0.92);
    display: flex; align-items: center; justify-content: center;
    padding: 1.5rem;
  `;

  overlay.innerHTML = `
    <div style="background:#fff; border-radius:12px; max-width:400px; width:100%; padding:2rem; text-align:center; font-family:inherit;">
      <h2 style="margin-bottom:0.5rem;">Check delivery availability</h2>
      <p style="color:#555; margin-bottom:1.25rem;">
        We currently deliver in <strong>Delhi NCR</strong> and <strong>Dehradun</strong> only.
        Enter your pincode to continue.
      </p>
      <input
        id="locationGatePincodeInput"
        type="text"
        inputmode="numeric"
        maxlength="6"
        placeholder="Enter 6-digit pincode"
        style="width:100%; padding:0.75rem; font-size:1rem; border:1px solid #ccc; border-radius:8px; margin-bottom:0.75rem; box-sizing:border-box;"
      />
      <div id="locationGateError" style="color:#c0392b; font-size:0.9rem; margin-bottom:0.75rem; min-height:1.2em;"></div>
      <button id="locationGateSubmitBtn" class="btn btn-primary" style="width:100%; padding:0.75rem; border:none; border-radius:8px; background:#111; color:#fff; font-size:1rem; cursor:pointer;">
        Continue
      </button>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.style.overflow = "hidden";

  const input = document.getElementById("locationGatePincodeInput");
  const errorEl = document.getElementById("locationGateError");
  const submitBtn = document.getElementById("locationGateSubmitBtn");

  function attemptSubmit() {
    const pincode = input.value.trim();

    if (isPincodeInServiceArea(pincode)) {
      sessionStorage.setItem(SESSION_KEY, "true");
      document.body.style.overflow = "";
      overlay.remove();
    } else {
      errorEl.textContent = "Sorry, we don't currently deliver to this pincode. We serve Delhi NCR and Dehradun only.";
    }
  }

  submitBtn.addEventListener("click", attemptSubmit);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") attemptSubmit();
  });
  input.focus();
}

// Run the check as early as possible.
(function initLocationGate() {
  const alreadyVerified = sessionStorage.getItem(SESSION_KEY) === "true";
  if (!alreadyVerified) {
    // If DOM isn't ready yet, wait for it.
    if (document.body) {
      showLocationGate();
    } else {
      document.addEventListener("DOMContentLoaded", showLocationGate);
    }
  }
})();
