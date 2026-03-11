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

const userInfo = document.getElementById("userInfo");
const logoutBtn = document.getElementById("logoutBtn");

const requestCheckoutSection = document.getElementById("requestCheckoutSection");
const requestSummaryItems = document.getElementById("requestSummaryItems");
const requestSummaryItemCount = document.getElementById("requestSummaryItemCount");
const requestSummaryMonthlyTotal = document.getElementById("requestSummaryMonthlyTotal");

const requestFullName = document.getElementById("requestFullName");
const requestPhone = document.getElementById("requestPhone");

const dashboardRequestForm = document.getElementById("dashboardRequestForm");
const requestAddress = document.getElementById("requestAddress");
const requestPincode = document.getElementById("requestPincode");
const requestDeliveryDate = document.getElementById("requestDeliveryDate");
const requestNotes = document.getElementById("requestNotes");

const userRequestsList = document.getElementById("userRequestsList");

function getEmailPrefix(email) {
  if (!email) return "User";
  return email.split("@")[0];
}

function getCart() {
  return JSON.parse(localStorage.getItem("rentillaCart")) || [];
}

function hasCheckoutIntent() {
  return localStorage.getItem("rentillaCheckoutIntent") === "true";
}

function showRequestSection() {
  if (!requestCheckoutSection) return;
  requestCheckoutSection.classList.add("active");
}

function hideRequestSection() {
  if (!requestCheckoutSection) return;
  requestCheckoutSection.classList.remove("active");
}

function calculateCartTotals(cart) {
  let totalItems = 0;
  let totalMonthlyRent = 0;

  cart.forEach(item => {
    totalItems += item.quantity;
    totalMonthlyRent += item.monthlyPrice * item.quantity;
  });

  return { totalItems, totalMonthlyRent };
}

function buildRequestItems(cart) {
  return cart.map(item => ({
    productId: item.productId,
    productName: item.name,
    category: item.category,
    quantity: item.quantity,
    durationMonths: item.durationMonths || 3,
    monthlyPrice: item.monthlyPrice,
    emoji: item.emoji || "📦",
    subtotal: item.monthlyPrice * item.quantity
  }));
}

function formatDate(value) {
  if (!value) return "Not set";

  try {
    const date = new Date(value);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  } catch {
    return value;
  }
}

function renderRequestSummaryFromCart() {
  if (!requestSummaryItems || !requestSummaryItemCount || !requestSummaryMonthlyTotal) return;

  const cart = getCart();

  if (cart.length === 0) {
    requestSummaryItems.innerHTML = `<p class="request-empty-state">No items selected.</p>`;
    requestSummaryItemCount.textContent = "0";
    requestSummaryMonthlyTotal.textContent = "₹0";
    return;
  }

  let total = 0;
  let totalItems = 0;

  requestSummaryItems.innerHTML = cart.map(item => {
    const subtotal = item.monthlyPrice * item.quantity;
    total += subtotal;
    totalItems += item.quantity;

    return `
      <div class="request-summary-item">
        <div class="request-summary-emoji">${item.emoji || "📦"}</div>

        <div>
          <h4>${item.name}</h4>
          <div class="request-summary-meta">
            Qty: ${item.quantity}<br>
            Duration: ${item.durationMonths || 3} month(s)<br>
            ₹${item.monthlyPrice}/month
          </div>
        </div>
      </div>
    `;
  }).join("");

  requestSummaryItemCount.textContent = totalItems;
  requestSummaryMonthlyTotal.textContent = `₹${total}`;
}

function renderUserRequests(requests) {
  if (!userRequestsList) return;

  if (!requests || requests.length === 0) {
    userRequestsList.innerHTML = `
      <div class="request-list-empty">
        <p>No rental requests found yet.</p>
      </div>
    `;
    return;
  }

  userRequestsList.innerHTML = requests.map(request => {
    const statusClass = `request-status-${request.status || "pending"}`;
    const items = request.items || [];

    return `
      <div class="user-request-card">
        <div class="user-request-top">
          <div>
            <h3 class="user-request-title">Rental Request</h3>
            <div class="user-request-date">
              Submitted: ${request.createdAt?.toDate
                ? request.createdAt.toDate().toLocaleString("en-IN")
                : "Recently"}
            </div>
          </div>

          <span class="request-status-badge ${statusClass}">
            ${request.status || "pending"}
          </span>
        </div>

        <div class="user-request-meta">
          <div class="user-request-meta-box">
            <span class="user-request-meta-label">Preferred Delivery</span>
            <span class="user-request-meta-value">${formatDate(request.preferredDeliveryDate)}</span>
          </div>

          <div class="user-request-meta-box">
            <span class="user-request-meta-label">Monthly Total</span>
            <span class="user-request-meta-value">₹${request.totalMonthlyRent || 0}</span>
          </div>

          <div class="user-request-meta-box">
            <span class="user-request-meta-label">Total Items</span>
            <span class="user-request-meta-value">${request.totalItems || 0}</span>
          </div>
        </div>

        <div class="user-request-items">
          <h4>Requested Items</h4>
          ${items.map(item => `
            <div class="user-request-item">
              ${item.emoji || "📦"} ${item.productName}
              — Qty: ${item.quantity}
              — Duration: ${item.durationMonths} month(s)
              — ₹${item.monthlyPrice}/month
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }).join("");
}

async function loadUserRequests(userId) {
  if (!userId || !userRequestsList) return;

  try {
    const requestsRef = collection(db, "rentalRequests");
    const requestsQuery = query(
      requestsRef,
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(requestsQuery);

    const requests = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));

    renderUserRequests(requests);
  } catch (error) {
    console.error("Error loading user requests:", error);

    userRequestsList.innerHTML = `
      <div class="request-list-empty">
        <p>Unable to load requests right now.</p>
      </div>
    `;
  }
}

function prefillRequestForm(userData, user) {
  if (requestFullName) {
    requestFullName.value =
      userData?.name ||
      user?.displayName ||
      getEmailPrefix(user?.email);
  }

  if (requestPhone) {
    requestPhone.value = userData?.phone || "";
  }
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  let userData = null;
  let displayName = getEmailPrefix(user.email);

  try {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      userData = userSnap.data();
      displayName = userData.name || getEmailPrefix(user.email);
    }
  } catch (error) {
    console.error("Error loading user profile:", error);
  }

  if (userInfo) {
    userInfo.textContent = `Welcome, ${displayName}`;
  }

  await loadUserRequests(user.uid);

  const cart = getCart();
  const checkoutIntent = hasCheckoutIntent();

  if (checkoutIntent && cart.length > 0) {
    showRequestSection();
    renderRequestSummaryFromCart();
    prefillRequestForm(userData, user);

    setTimeout(() => {
      requestCheckoutSection?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
  } else {
    hideRequestSection();
  }

  document.body.style.visibility = "visible";
});

if (dashboardRequestForm) {
  dashboardRequestForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const user = auth.currentUser;
    if (!user) {
      alert("You must be logged in to submit a rental request.");
      window.location.href = "index.html";
      return;
    }

    const cart = getCart();
    if (cart.length === 0) {
      alert("Your cart is empty.");
      return;
    }

    const fullName = requestFullName?.value.trim();
    const phone = requestPhone?.value.trim();
    const address = requestAddress?.value.trim();
    const pincode = requestPincode?.value.trim();
    const preferredDeliveryDate = requestDeliveryDate?.value;
    const notes = requestNotes?.value.trim() || "";

    if (!fullName || !phone || !address || !pincode || !preferredDeliveryDate) {
      alert("Please fill in all required request details.");
      return;
    }

    const items = buildRequestItems(cart);
    const { totalItems, totalMonthlyRent } = calculateCartTotals(cart);

    try {
      await addDoc(collection(db, "rentalRequests"), {
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
      });

      alert("Your rental request has been submitted successfully.");

      localStorage.removeItem("rentillaCart");
      localStorage.removeItem("rentillaCheckoutIntent");

      dashboardRequestForm.reset();
      hideRequestSection();
      renderRequestSummaryFromCart();

      await loadUserRequests(user.uid);

      window.location.reload();
    } catch (error) {
      console.error("Error submitting rental request:", error);
      alert("Could not submit your rental request. Please try again.");
    }
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    localStorage.removeItem("rentillaCheckoutIntent");
    window.location.href = "index.html";
  });
}
