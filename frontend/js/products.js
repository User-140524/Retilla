import { db } from "./firebase-config.js";
import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let allProducts = [];

async function fetchProducts() {
  try {
    const productsRef = collection(db, "products");
    const snapshot = await getDocs(productsRef);

    allProducts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    renderProducts(allProducts);
  } catch (error) {
    console.error("Error fetching products:", error);
    const grid = document.getElementById("itemsGrid");
    if (grid) {
      grid.innerHTML = `<p>Unable to load products right now.</p>`;
    }
  }
}

function renderProducts(items) {
  const grid = document.getElementById("itemsGrid");
  if (!grid) return;

  grid.innerHTML = items.map(item => `
    <div class="item-card">
      <img src="${item.imageUrl || 'images/placeholder.jpg'}" class="item-image" alt="${item.name || 'Product'}">
      
      <div class="item-content">
        <div class="item-category">${item.category || ""}</div>
        <h3 class="item-title">${item.name || ""}</h3>
        <div class="item-price">
          <span class="monthly">₹${item.price || 0}</span>/month
        </div>
        <button class="btn-small" onclick="addProductToCart('${item.id}')">
          Add to Cart
        </button>
      </div>
    </div>
  `).join("");
}

window.filterItems = function(category, event) {
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.classList.remove("active");
  });

  if (event) event.target.classList.add("active");

  if (category === "all") {
    renderProducts(allProducts);
    return;
  }

  const filtered = allProducts.filter(item => item.category === category);
  renderProducts(filtered);
};

window.addProductToCart = function(productId) {
  const product = allProducts.find(item => item.id === productId);
  if (!product) return;

  if (!window.addToCart) {
    alert("Cart system not loaded.");
    return;
  }

  window.addToCart({
    productId: product.id,
    name: product.name,
    category: product.category,
    monthlyPrice: product.price,
    // CHANGED: Sending the imageUrl to the cart instead of the emoji
    imageUrl: product.imageUrl || 'images/placeholder.jpg'
  });
};

window.fetchProducts = fetchProducts;
