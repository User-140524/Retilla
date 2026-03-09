let cart = JSON.parse(localStorage.getItem("rentillaCart")) || [];

function saveCart() {
    localStorage.setItem("rentillaCart", JSON.stringify(cart));
}

function addToCart(product) {
    const existingItem = cart.find(item => item.productId === product.productId);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            productId: product.productId,
            name: product.name,
            category: product.category,
            monthlyPrice: product.monthlyPrice,
            quantity: 1,
            durationMonths: 3,
            emoji: product.emoji || "📦"
        });
    }

    saveCart();
    alert(`${product.name} added to cart.`);
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.productId !== productId);
    saveCart();
    renderCart();
}

function updateDuration(productId, duration) {
    const item = cart.find(item => item.productId === productId);
    if (!item) return;

    item.durationMonths = parseInt(duration, 10);
    saveCart();
    renderCart();
}

function updateQuantity(productId, change) {
    const item = cart.find(item => item.productId === productId);
    if (!item) return;

    item.quantity += change;

    if (item.quantity <= 0) {
        removeFromCart(productId);
        return;
    }

    saveCart();
    renderCart();
}

function renderCart() {
    const cartContent = document.getElementById("cartContent");
    if (!cartContent) return;

    if (cart.length === 0) {
        cartContent.innerHTML = `<p>Your cart is empty.</p>`;
        return;
    }

    let total = 0;

    const cartItemsHTML = cart.map(item => {
        const subtotal = item.monthlyPrice * item.quantity;
        total += subtotal;

        return `
            <div class="cart-item-card">
                <div class="cart-item-left">
                    <div class="cart-item-emoji">${item.emoji}</div>

                    <div>
                        <h3>${item.name}</h3>
                        <p>${item.category}</p>
                        <p>₹${item.monthlyPrice}/month</p>

                        <label class="cart-duration-label">Rental Duration</label>
                        <select onchange="updateDuration('${item.productId}', this.value)" class="cart-duration-select">
                            <option value="1" ${item.durationMonths === 1 ? "selected" : ""}>1 Month</option>
                            <option value="3" ${item.durationMonths === 3 ? "selected" : ""}>3 Months</option>
                            <option value="6" ${item.durationMonths === 6 ? "selected" : ""}>6 Months</option>
                            <option value="12" ${item.durationMonths === 12 ? "selected" : ""}>12 Months</option>
                        </select>
                    </div>
                </div>

                <div class="cart-item-right">
                    <div class="cart-quantity-controls">
                        <button onclick="updateQuantity('${item.productId}', -1)">-</button>
                        <span>${item.quantity}</span>
                        <button onclick="updateQuantity('${item.productId}', 1)">+</button>
                    </div>

                    <p><strong>₹${subtotal}/month</strong></p>

                    <button onclick="removeFromCart('${item.productId}')">
                        Remove
                    </button>
                </div>
            </div>
        `;
    }).join("");

    cartContent.innerHTML = `
        <div class="cart-list">
            ${cartItemsHTML}
        </div>

        <div class="cart-summary">
            <h3>Total Monthly Rent: ₹${total}</h3>
            <p>Total Items: ${cart.reduce((sum, item) => sum + item.quantity, 0)}</p>
            <p>Payment will be requested only after approval.</p>
            <button class="btn btn-primary" onclick="startRentalRequest()">Proceed to Request</button>
        </div>
    `;
}

function startRentalRequest() {
    if (cart.length === 0) {
        alert("Your cart is empty.");
        return;
    }

    if (typeof showPage === "function") {
        showPage("request");
    } else {
        const requestPage = document.getElementById("request");
        document.querySelectorAll(".page").forEach(page => page.classList.remove("active"));
        if (requestPage) requestPage.classList.add("active");
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    renderRequestSummary();
}

function renderRequestSummary() {
    const requestSummary = document.getElementById("requestSummary");
    if (!requestSummary) return;

    const total = cart.reduce((sum, item) => sum + (item.monthlyPrice * item.quantity), 0);

    requestSummary.innerHTML = `
        <div class="cart-summary" style="margin-bottom: 2rem;">
            <h3>Request Summary</h3>
            ${cart.map(item => `
                <p>
                    ${item.name} — Qty: ${item.quantity}, Duration: ${item.durationMonths} month(s),
                    ₹${item.monthlyPrice}/month
                </p>
            `).join("")}
            <hr style="margin: 1rem 0;">
            <p><strong>Total Monthly Rent: ₹${total}</strong></p>
        </div>
    `;
}

window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateQuantity = updateQuantity;
window.renderCart = renderCart;
window.startRentalRequest = startRentalRequest;
window.updateDuration = updateDuration;
window.renderRequestSummary = renderRequestSummary;
