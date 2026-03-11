import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const userInfo = document.getElementById("userInfo");
const logoutBtn = document.getElementById("logoutBtn");

const requestCheckoutSection = document.getElementById("requestCheckoutSection");
const requestSummaryItems = document.getElementById("requestSummaryItems");
const requestSummaryItemCount = document.getElementById("requestSummaryItemCount");
const requestSummaryMonthlyTotal = document.getElementById("requestSummaryMonthlyTotal");

const requestFullName = document.getElementById("requestFullName");
const requestPhone = document.getElementById("requestPhone");

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

    // Optional: scroll directly to request section
    setTimeout(() => {
      requestCheckoutSection?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
  } else {
    hideRequestSection();
  }

  document.body.style.visibility = "visible";
});

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    localStorage.removeItem("rentillaCheckoutIntent");
    window.location.href = "index.html";
  });
}
