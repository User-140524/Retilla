import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  getDoc,
  collection,
  query,
  getDocs,
  orderBy,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ---------------------------
   DOM ELEMENTS
--------------------------- */
const adminInfo = document.getElementById("adminInfo");
const adminLogoutBtn = document.getElementById("adminLogoutBtn");

const adminPendingCount = document.getElementById("adminPendingCount");
const adminApprovedCount = document.getElementById("adminApprovedCount");
const adminRejectedCount = document.getElementById("adminRejectedCount");
const adminTotalCount = document.getElementById("adminTotalCount");

const adminRequestsLoadingState = document.getElementById("adminRequestsLoadingState");
const adminRequestsEmptyState = document.getElementById("adminRequestsEmptyState");
const adminRequestsList = document.getElementById("adminRequestsList");

/* ---------------------------
   HELPERS
--------------------------- */
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

function normalizeStatus(status) {
  return String(status || "pending").toLowerCase();
}

/* ---------------------------
   ADMIN AUTH CHECK
--------------------------- */
async function ensureAdmin(user) {
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    alert("User profile not found.");
    window.location.href = "index.html";
    return false;
  }

  const userData = userSnap.data();
  const role = userData.role || "customer";
  const name = userData.name || user.displayName || "Admin";

  if (role !== "admin") {
    alert("Access denied.");
    window.location.href = "dashboard.html";
    return false;
  }

  if (adminInfo) {
    adminInfo.textContent = `Welcome, ${name}`;
  }

  return true;
}

/* ---------------------------
   METRICS
--------------------------- */
function renderAdminMetrics(requests) {
  const pending = requests.filter((r) => normalizeStatus(r.status) === "pending").length;
  const approved = requests.filter((r) => normalizeStatus(r.status) === "approved").length;
  const rejected = requests.filter((r) => normalizeStatus(r.status) === "rejected").length;
  const total = requests.length;

  if (adminPendingCount) adminPendingCount.textContent = String(pending);
  if (adminApprovedCount) adminApprovedCount.textContent = String(approved);
  if (adminRejectedCount) adminRejectedCount.textContent = String(rejected);
  if (adminTotalCount) adminTotalCount.textContent = String(total);
}

/* ---------------------------
   REQUEST RENDERING
--------------------------- */
function renderRequests(requests) {
  if (!adminRequestsList) return;

  adminRequestsList.innerHTML = "";

  if (adminRequestsEmptyState) {
    adminRequestsEmptyState.style.display = requests.length ? "none" : "block";
  }

  if (!requests.length) return;

  requests.forEach((request) => {
    const requestIdShort = escapeHtml(request.id?.slice(0, 8) || "Unknown");
    const status = normalizeStatus(request.status);
    const submittedAt = formatDateTime(request.createdAt);
    const preferredDeliveryDate = formatDate(request.preferredDeliveryDate);

    const itemsHtml = (request.items || [])
      .map((item) => {
        const emoji = escapeHtml(item.emoji || "📦");
        const productName = escapeHtml(item.productName || "Unnamed Item");
        const quantity = Number(item.quantity || 1);
        const durationMonths = Number(item.durationMonths || 1);
        const monthlyPrice = Number(item.monthlyPrice || 0);

        return `
          <li>
            ${emoji} ${productName} — Qty: ${quantity}, Duration: ${durationMonths} month(s), Monthly: ${formatCurrency(monthlyPrice * quantity)}
          </li>
        `;
      })
      .join("");

    const card = document.createElement("div");
    card.className = "admin-request-card";

    const isPending = status === "pending";

    card.innerHTML = `
      <div class="admin-request-top">
        <div>
          <h3>Request #${requestIdShort}</h3>
          <p class="admin-request-subtext">Submitted: ${submittedAt}</p>
        </div>
        <span class="status-badge status-${status}">${escapeHtml(status)}</span>
      </div>

      <div class="request-grid">
        <div class="request-box">
          <strong>Customer</strong>
          <span>${escapeHtml(request.userName || "N/A")}</span>
        </div>

        <div class="request-box">
          <strong>Phone</strong>
          <span>${escapeHtml(request.userPhone || "N/A")}</span>
        </div>

        <div class="request-box">
          <strong>Email</strong>
          <span>${escapeHtml(request.userEmail || "N/A")}</span>
        </div>

        <div class="request-box">
          <strong>Preferred Delivery</strong>
          <span>${preferredDeliveryDate}</span>
        </div>

        <div class="request-box">
          <strong>Total Items</strong>
          <span>${Number(request.totalItems || 0)}</span>
        </div>

        <div class="request-box">
          <strong>Monthly Rent</strong>
          <span>${formatCurrency(request.totalMonthlyRent || 0)}</span>
        </div>

        <div class="request-box">
          <strong>Payment Status</strong>
          <span>${escapeHtml(request.paymentStatus || "unpaid")}</span>
        </div>

        <div class="request-box">
          <strong>Pincode</strong>
          <span>${escapeHtml(request.pincode || "N/A")}</span>
        </div>

        <div class="request-box" style="grid-column: 1 / -1;">
          <strong>Address</strong>
          <span>${escapeHtml(request.address || "N/A")}</span>
        </div>

        <div class="request-box" style="grid-column: 1 / -1;">
          <strong>Notes</strong>
          <span>${escapeHtml(request.notes || "No notes provided")}</span>
        </div>
      </div>

      <div class="items-block">
        <h4>Requested Items</h4>
        <ul class="items-list">
          ${itemsHtml || "<li>No items found</li>"}
        </ul>
      </div>

      <div class="admin-actions">
        <button class="approve-btn" data-request-id="${request.id}" ${!isPending ? "disabled" : ""}>
          Approve
        </button>
        <button class="reject-btn" data-request-id="${request.id}" ${!isPending ? "disabled" : ""}>
          Reject
        </button>
      </div>
    `;

    adminRequestsList.appendChild(card);
  });

  bindActionButtons();
}

/* ---------------------------
   LOAD ALL REQUESTS
--------------------------- */
async function loadAllRequests() {
  if (!adminRequestsList) return;

  if (adminRequestsLoadingState) adminRequestsLoadingState.style.display = "block";
  if (adminRequestsEmptyState) adminRequestsEmptyState.style.display = "none";
  adminRequestsList.innerHTML = "";

  try {
    const requestsQuery = query(
      collection(db, "rentalRequests"),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(requestsQuery);

    const requests = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));

    renderAdminMetrics(requests);
    renderRequests(requests);
  } catch (error) {
    console.error("Error loading admin requests:", error);
    adminRequestsList.innerHTML = `
      <div class="error-box">
        Unable to load rental requests right now.
      </div>
    `;
    renderAdminMetrics([]);
  } finally {
    if (adminRequestsLoadingState) adminRequestsLoadingState.style.display = "none";
  }
}

/* ---------------------------
   UPDATE REQUEST STATUS
   - Sets approvedAt timestamp when approving
   - Sets paymentStatus to "unpaid" on any status change
   - Always updates updatedAt
--------------------------- */
async function updateRequestStatus(requestId, newStatus) {
  try {
    const requestRef = doc(db, "rentalRequests", requestId);

    await updateDoc(requestRef, {
      status: newStatus,
      paymentStatus: "unpaid",
      approvedAt: newStatus === "approved" ? serverTimestamp() : null,
      updatedAt: serverTimestamp()
    });

    await loadAllRequests();
  } catch (error) {
    console.error(`Error updating request ${requestId} to ${newStatus}:`, error);
    alert("Failed to update request status.");
  }
}

/* ---------------------------
   ACTION BUTTONS
--------------------------- */
function bindActionButtons() {
  const approveButtons = document.querySelectorAll(".approve-btn");
  const rejectButtons = document.querySelectorAll(".reject-btn");

  approveButtons.forEach((btn) => {
    btn.addEventListener("click", async () => {
      const requestId = btn.dataset.requestId;
      if (!requestId) return;

      btn.disabled = true;
      await updateRequestStatus(requestId, "approved");
    });
  });

  rejectButtons.forEach((btn) => {
    btn.addEventListener("click", async () => {
      const requestId = btn.dataset.requestId;
      if (!requestId) return;

      btn.disabled = true;
      await updateRequestStatus(requestId, "rejected");
    });
  });
}

/* ---------------------------
   EVENTS
--------------------------- */
if (adminLogoutBtn) {
  adminLogoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      window.location.href = "index.html";
    } catch (error) {
      console.error("Admin logout error:", error);
      alert("Failed to log out.");
    }
  });
}

/* ---------------------------
   AUTH FLOW
--------------------------- */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  try {
    const allowed = await ensureAdmin(user);
    if (!allowed) return;

    document.body.style.visibility = "visible";
    await loadAllRequests();
  } catch (error) {
    console.error("Admin auth error:", error);
    alert("Something went wrong while checking admin access.");
    window.location.href = "index.html";
  }
});
