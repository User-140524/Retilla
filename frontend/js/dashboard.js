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
  serverTimestamp
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
