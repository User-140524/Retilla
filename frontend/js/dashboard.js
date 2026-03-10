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

function getEmailPrefix(email) {
  if (!email) return "User";
  return email.split("@")[0];
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  let displayName = getEmailPrefix(user.email);

  if (userSnap.exists()) {
    const userData = userSnap.data();
    displayName = userData.name || getEmailPrefix(user.email);
  }

  if (userInfo) {
    userInfo.textContent = `Welcome, ${displayName}`;
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
