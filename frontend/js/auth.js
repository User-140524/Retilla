import { auth, db } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ----- PAGE ELEMENTS -----
const loginSection = document.getElementById("loginSection");
const signupSection = document.getElementById("signupSection");

const showSignupBtn = document.getElementById("showSignupBtn");
const showLoginBtn = document.getElementById("showLoginBtn");

const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");

const authMessage = document.getElementById("authMessage");
const accountNavBtn = document.getElementById("accountNavBtn");

// ----- LOGIN STATE HELPER -----
window.isUserLoggedIn = function () {
  return !!auth.currentUser;
};

// ----- UPDATE NAV BUTTON -----
function updateAccountNav(user) {
  if (!accountNavBtn) return;

  if (user) {
    accountNavBtn.textContent = "Dashboard";
    accountNavBtn.href = "dashboard.html";
    accountNavBtn.onclick = null;
  } else {
    accountNavBtn.textContent = "Login";
    accountNavBtn.href = "#";
    accountNavBtn.onclick = function (e) {
      e.preventDefault();
      if (typeof showPage === "function") {
        showPage("login");
      }
    };
  }
}

// ----- TOGGLE BETWEEN LOGIN & SIGNUP -----
if (showSignupBtn) {
  showSignupBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (loginSection) loginSection.style.display = "none";
    if (signupSection) signupSection.style.display = "block";
    if (authMessage) authMessage.textContent = "";
  });
}

if (showLoginBtn) {
  showLoginBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (signupSection) signupSection.style.display = "none";
    if (loginSection) loginSection.style.display = "block";
    if (authMessage) authMessage.textContent = "";
  });
}

// ----- SIGNUP -----
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("signupName")?.value.trim();
    const phone = document.getElementById("signupPhone")?.value.trim();
    const email = document.getElementById("signupEmail")?.value.trim();
    const password = document.getElementById("signupPassword")?.value;
    const confirmPassword = document.getElementById("signupConfirmPassword")?.value;

    if (!name || !phone || !email || !password || !confirmPassword) {
      if (authMessage) authMessage.textContent = "Please fill all signup fields.";
      return;
    }

    if (password.length < 6) {
      if (authMessage) authMessage.textContent = "Password must be at least 6 characters.";
      return;
    }

    if (password !== confirmPassword) {
      if (authMessage) authMessage.textContent = "Passwords do not match.";
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: name });

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name,
        phone,
        email,
        role: "user",
        createdAt: serverTimestamp()
      });

      const checkoutIntent = localStorage.getItem("rentillaCheckoutIntent");

      if (checkoutIntent === "true") {
        window.location.href = "dashboard.html";
      } else {
        window.location.href = "index.html";
      }
    } catch (error) {
      if (authMessage) authMessage.textContent = error.message;
    }
  });
}

// ----- LOGIN -----
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("loginEmail")?.value.trim();
    const password = document.getElementById("loginPassword")?.value;

    if (!email || !password) {
      if (authMessage) authMessage.textContent = "Please enter email and password.";
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);

      const checkoutIntent = localStorage.getItem("rentillaCheckoutIntent");

      if (checkoutIntent === "true") {
        window.location.href = "dashboard.html";
      } else {
        window.location.href = "index.html";
      }
    } catch (error) {
      if (authMessage) authMessage.textContent = "Invalid email or password.";
    }
  });
}

// ----- AUTH STATE -----
onAuthStateChanged(auth, async (user) => {
  updateAccountNav(user);

  // Only run extra read logic when on main site
  if (user && window.location.pathname.includes("index.html")) {
    try {
      const userRef = doc(db, "users", user.uid);
      await getDoc(userRef);
    } catch (error) {
      console.error("Error loading user profile:", error);
    }
  }
});
