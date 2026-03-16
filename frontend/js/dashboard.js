import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ---------------------------
   DOM ELEMENTS
--------------------------- */
const userInfo = document.getElementById("userInfo");
const logoutBtn = document.getElementById("logoutBtn");
const homeBtn = document.getElementById("homeBtn");

const requestCheckoutSection = document.getElementById("requestCheckoutSection");
const requestSummaryItems = document.getElementById("requestSummaryItems");
const requestSummaryItemCount = document.getElementById("requestSummaryItemCount");
const requestSummaryMonthlyTotal = document.getElementById("requestSummaryMonthlyTotal");

const requestForm = document.getElementById("requestForm");
const requestFullName = document.getElementById("requestFullName");
const requestPhone = document.getElementById("requestPhone");
const requestAddress = document.getElementById("requestAddress");
const requestPincode = document.getElementById("requestPincode");
const requestPreferredDate = document.getElementById("requestPreferredDate");
const requestNotes = document.getElementById("requestNotes");
const requestSubmitBtn = document.getElementById("requestSubmitBtn");

const requestsList = document.getElementById("requestsList");
const requestsEmptyState = document.getElementById("requestsEmptyState");
const requestsLoadingState = document.getElementById("requestsLoadingState");

const pendingCountEl = document.getElementById("pendingCount");
const approvedCountEl = document.getElementById("approvedCount");
const activeCountEl = document.getElementById("activeCount");
const totalRequestsCountEl = document.getElementById("totalRequestsCount");

/* ---------------------------
   LOCAL STORAGE KEYS
--------------------------- */
const CART_KEY = "rentillaCart";
const CHECKOUT_INTENT_KEY = "rentillaCheckoutIntent";

/* ---------------------------
   HELPERS
--------------------------- */
function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch (error) {
    console.error("Error reading cart from localStorage:", error);
    return [];
  }
}

function hasCheckoutIntent() {
  return localStorage.getItem(CHECKOUT_INTENT_KEY) === "true";
}

function clearCheckoutFlow() {
  localStorage.removeItem(CART_KEY);
  localStorage.removeItem(CHECKOUT_INTENT_KEY);
}

function formatCurrency(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

function formatDate(value) {
  if (!value) return "Not specified";

  try {
    if (typeof value === "string") {
      return new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });
    }

    if (value?.toDate) {
      return value.toDate().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });
    }

    return "Not specified";
  } catch {
    return "Not specified";
  }
}

function formatDateTime(value) {
  if (!value) return "N/A";

  try {
    if (value?.toDate) {
      return value.toDate().toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    }

    return new Date(value).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return "N/A";
  }
}

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function calculateCartSummary(cart) {
  let totalItems = 0;
  let totalMonthlyRent = 0;

  cart.forEach((item) => {
    const quantity = Number(item.quantity || 1);
    const monthlyPrice = Number(item.price || item.monthlyPrice || 0);

    totalItems += quantity;
    totalMonthlyRent += quantity * monthlyPrice;
  });

  return { totalItems, totalMonthlyRent };
}

function normalizeStatus(status) {
  return String(status || "pending").toLowerCase();
}

/* ---------------------------
   STATUS MESSAGES
--------------------------- */
function getStatusMessage(status) {
  const messages = {
    pending:   "Your request is being reviewed.",
    approved:  "Your request has been approved. Payment will be requested shortly.",
    rejected:  "Your request was not approved.",
    active:    "Your rental is currently active.",
    completed: "Your rental has been completed."
  };
  return messages[status] || "";
}

/* ---------------------------
   USER PROFILE
--------------------------- */
async function loadUserProfile(user) {
  try {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    let displayName = user.displayName || "User";
    let phone = user.phoneNumber || "";

    if (userSnap.exists()) {
      const userData = userSnap.data();
      displayName = userData.name || displayName;
      phone = userData.phone || phone;

      if (requestFullName) requestFullName.value = userData.name || "";
      if (requestPhone) requestPhone.value = userData.phone || "";
    } else {
      if (requestFullName) requestFullName.value = user.displayName || "";
      if (requestPhone) requestPhone.value = user.phoneNumber || "";
    }

    if (userInfo) {
      userInfo.textContent = `Welcome, ${displayName}`;
    }
  } catch (error) {
    console.error("Error loading user profile:", error);

    if (userInfo) {
      userInfo.textContent = "Welcome";
    }
  }
}

/* ---------------------------
   CHECKOUT SUMMARY
--------------------------- */
function renderCheckoutSummary() {
  if (!requestCheckoutSection || !requestSummaryItems || !requestSummaryItemCount || !requestSummaryMonthlyTotal) {
    return;
  }

  const cart = getCart();
  const checkoutIntent = hasCheckoutIntent();

  if (!checkoutIntent || cart.length === 0) {
    requestCheckoutSection.style.display = "none";
    requestSummaryItems.innerHTML = "";
    requestSummaryItemCount.textContent = "0";
    requestSummaryMonthlyTotal.textContent = formatCurrency(0);
    return;
  }

  requestCheckoutSection.style.display = "block";

  const { totalItems, totalMonthlyRent } = calculateCartSummary(cart);

  requestSummaryItemCount.textContent = String(totalItems);
  requestSummaryMonthlyTotal.textContent = formatCurrency(totalMonthlyRent);

  requestSummaryItems.innerHTML = cart
    .map((item) => {
      const emoji = escapeHtml(item.emoji || "📦");
      const productName = escapeHtml(item.name || item.productName || "Unnamed Item");
      const quantity = Number(item.quantity || 1);
      const durationMonths = Number(item.durationMonths || 1);
      const monthlyPrice = Number(item.price || item.monthlyPrice || 0);
      const subtotal = quantity * monthlyPrice;

      return `
        <div class="request-summary-item">
          <div class="request-summary-item-top">
            <strong>${emoji} ${productName}</strong>
          </div>
          <div class="request-summary-item-meta">
            <span>Qty: ${quantity}</span>
            <span>Duration: ${durationMonths} month(s)</span>
          </div>
          <div class="request-summary-item-price">
            Monthly: ${formatCurrency(subtotal)}
          </div>
        </div>
      `;
    })
    .join("");
}

/* ---------------------------
   DASHBOARD METRICS
--------------------------- */
function renderDashboardMetrics(requests) {
  const pendingCount = requests.filter((req) => normalizeStatus(req.status) === "pending").length;
  const approvedCount = requests.filter((req) => normalizeStatus(req.status) === "approved").length;
  const activeCount = requests.filter((req) => normalizeStatus(req.status) === "active").length;
  const totalRequestsCount = requests.length;

  if (pendingCountEl) pendingCountEl.textContent = String(pendingCount);
  if (approvedCountEl) approvedCountEl.textContent = String(approvedCount);
  if (activeCountEl) activeCountEl.textContent = String(activeCount);
  if (totalRequestsCountEl) totalRequestsCountEl.textContent = String(totalRequestsCount);
}

/* ---------------------------
   REQUEST HISTORY RENDER
--------------------------- */
function renderRequestHistory(requests) {
  if (!requestsList) return;

  requestsList.innerHTML = "";

  if (requestsEmptyState) {
    requestsEmptyState.style.display = requests.length ? "none" : "block";
  }

  if (!requests.length) return;

  requests.forEach((request) => {
    const requestIdShort = escapeHtml(request.id?.slice(0, 8) || "Unknown");
    const submittedAt = formatDateTime(request.createdAt);
    const preferredDeliveryDate = formatDate(request.preferredDeliveryDate);
    const totalItems = Number(request.totalItems || 0);
    const totalMonthlyRent = Number(request.totalMonthlyRent || 0);
    const status = normalizeStatus(request.status);
    const paymentStatus = escapeHtml(request.paymentStatus || "unpaid");
    const statusMessage = getStatusMessage(status);

    const itemsHtml = (request.items || [])
      .map((item) => {
        const emoji = escapeHtml(item.emoji || "📦");
        const productName = escapeHtml(item.productName || item.name || "Unnamed Item");
        const quantity = Number(item.quantity || 1);
        const durationMonths = Number(item.durationMonths || 1);
        const monthlyPrice = Number(item.monthlyPrice || item.price || 0);

        return `
          <li>
            ${emoji} ${productName}
            <span class="request-item-meta">
              — Qty: ${quantity}, Duration: ${durationMonths} month(s), Monthly: ${formatCurrency(monthlyPrice * quantity)}
            </span>
          </li>
        `;
      })
      .join("");

    const card = document.createElement("div");
    card.className = "request-card";

    card.innerHTML = `
      <div class="request-card-header">
        <div>
          <h3>Request #${requestIdShort}</h3>
          <p class="request-submitted-text">Submitted: ${submittedAt}</p>
        </div>
        <span class="status-badge status-${status}">${escapeHtml(status)}</span>
      </div>

      ${statusMessage ? `<p class="request-status-message request-status-message-${status}">${statusMessage}</p>` : ""}

      <div class="request-card-body">
        <div class="request-card-grid">
          <p><strong>Preferred Delivery:</strong> ${preferredDeliveryDate}</p>
          <p><strong>Total Items:</strong> ${totalItems}</p>
          <p><strong>Monthly Rent:</strong> ${formatCurrency(totalMonthlyRent)}</p>
          <p><strong>Payment:</strong> ${paymentStatus}</p>
        </div>

        <div class="request-items-block">
          <strong>Requested Items:</strong>
          <ul class="request-items-list">
            ${itemsHtml || "<li>No items found</li>"}
          </ul>
        </div>
      </div>
    `;

    requestsList.appendChild(card);
  });
}

/* ---------------------------
   LOAD USER REQUESTS
--------------------------- */
async function loadUserRequests(user) {
  if (!requestsList) return;

  if (requestsLoadingState) requestsLoadingState.style.display = "block";
  if (requestsEmptyState) requestsEmptyState.style.display = "none";
  requestsList.innerHTML = "";

  try {
    const requestsQuery = query(
      collection(db, "rentalRequests"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(requestsQuery);

    const requests = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));

    renderDashboardMetrics(requests);
    renderRequestHistory(requests);
  } catch (error) {
    console.error("Error loading user requests:", error);

    requestsList.innerHTML = `
      <div class="error-box">
        Unable to load your rental requests right now.
      </div>
    `;

    renderDashboardMetrics([]);
  } finally {
    if (requestsLoadingState) requestsLoadingState.style.display = "none";
  }
}

/* ---------------------------
   SUBMIT RENTAL REQUEST
--------------------------- */
async function submitRentalRequest(user) {
  const cart = getCart();

  if (!cart.length) {
    alert("Your cart is empty.");
    return;
  }

  const fullName = requestFullName?.value.trim() || "";
  const phone = requestPhone?.value.trim() || "";
  const address = requestAddress?.value.trim() || "";
  const pincode = requestPincode?.value.trim() || "";
  const preferredDeliveryDate = requestPreferredDate?.value || "";
  const notes = requestNotes?.value.trim() || "";

  if (!fullName || !phone || !address || !pincode || !preferredDeliveryDate) {
    alert("Please fill in all required request details.");
    return;
  }

  const items = cart.map((item) => {
    const quantity = Number(item.quantity || 1);
    const durationMonths = Number(item.durationMonths || 1);
    const monthlyPrice = Number(item.price || item.monthlyPrice || 0);

    return {
      productId: item.id || item.productId || "",
      productName: item.name || item.productName || "Unnamed Item",
      category: item.category || "",
      quantity,
      durationMonths,
      monthlyPrice,
      emoji: item.emoji || "📦",
      subtotal: quantity * monthlyPrice
    };
  });

  const { totalItems, totalMonthlyRent } = calculateCartSummary(cart);

  const payload = {
    userId: user.uid,
    userName: fullName,
    userEmail: user.email || "",
    userPhone: phone,

    address,
    pincode,
    preferredDeliveryDate,
    notes,

    items,
    totalItems,
    totalMonthlyRent,

    status: "pending",
    paymentStatus: "unpaid",

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  try {
    if (requestSubmitBtn) {
      requestSubmitBtn.disabled = true;
      requestSubmitBtn.textContent = "Submitting...";
    }

    await addDoc(collection(db, "rentalRequests"), payload);

    clearCheckoutFlow();

    if (requestForm) requestForm.reset();

    alert("Your rental request has been submitted successfully.");

    if (requestCheckoutSection) {
      requestCheckoutSection.style.display = "none";
    }

    renderCheckoutSummary();
    await loadUserRequests(user);

    // Refill name/phone after form reset
    await loadUserProfile(user);
  } catch (error) {
    console.error("Error submitting rental request:", error);
    alert("Failed to submit request. Please try again.");
  } finally {
    if (requestSubmitBtn) {
      requestSubmitBtn.disabled = false;
      requestSubmitBtn.textContent = "Submit Request";
    }
  }
}

/* ---------------------------
   EVENTS
--------------------------- */
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      window.location.href = "index.html";
    } catch (error) {
      console.error("Logout error:", error);
      alert("Failed to log out. Please try again.");
    }
  });
}

if (homeBtn) {
  homeBtn.addEventListener("click", () => {
    window.location.href = "index.html";
  });
}

if (requestForm) {
  requestForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const user = auth.currentUser;
    if (!user) {
      alert("You must be logged in to submit a request.");
      window.location.href = "index.html";
      return;
    }

    await submitRentalRequest(user);
  });
}

/* ---------------------------
   AUTH STATE
--------------------------- */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  document.body.style.visibility = "visible";

  await loadUserProfile(user);
  renderCheckoutSummary();
  await loadUserRequests(user);
});
