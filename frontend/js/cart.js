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
        cartContent.innerHTML = `
            <div class="empty-cart-state">
                <h3>Your cart is empty</h3>
                <p>Add products from the Browse Items page to continue.</p>
                <button class="btn btn-primary" onclick="showPage('items')">Browse Items</button>
            </div>
        `;
        return;
    }

    let total = 0;
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    const cartItemsHTML = cart.map(item => {
        const subtotal = item.monthlyPrice * item.quantity;
        total += subtotal;

        return `
            <div class="cart-item-card">
                <div class="cart-item-left">
                    <div class="cart-item-emoji">${item.emoji}</div>

                    <div class="cart-item-details">
                        <h3>${item.name}</h3>
                        <p class="cart-item-category">${item.category}</p>
                        <p class="cart-item-price">₹${item.monthlyPrice}/month</p>

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
                        <button onclick="updateQuantity('${item.productId}', -1)">−</button>
                        <span>${item.quantity}</span>
                        <button onclick="updateQuantity('${item.productId}', 1)">+</button>
                    </div>

                    <div class="cart-item-subtotal">₹${subtotal}/month</div>

                    <button class="cart-remove-btn" onclick="removeFromCart('${item.productId}')">
                        Remove
                    </button>
                </div>
            </div>
        `;
    }).join("");

    cartContent.innerHTML = `
        <div class="cart-layout">
            <div class="cart-list">
                ${cartItemsHTML}
            </div>

            <div class="cart-summary-card">
                <h3>Order Summary</h3>

                <div class="cart-summary-line">
                    <span>Total Items</span>
                    <span>${totalItems}</span>
                </div>

                <div class="cart-summary-line">
                    <span>Request Type</span>
                    <span>Rental</span>
                </div>

                <div class="cart-summary-total">
                    <span>Monthly Total</span>
                    <span>₹${total}</span>
                </div>

                <p class="cart-summary-note">
                    Payment will be requested only after the business owner approves item availability and delivery feasibility.
                </p>

                <button class="btn btn-primary" onclick="startRentalRequest()">
                    Proceed to Request
                </button>
            </div>
        </div>
    `;
}

function startRentalRequest() {
    if (cart.length === 0) {
        alert("Your cart is empty.");
        return;
    }

    // Save checkout intent so app knows user wants to complete a request
    localStorage.setItem("rentillaCheckoutIntent", "true");

    // If user is not logged in, send them to login page
    if (!window.isUserLoggedIn || !window.isUserLoggedIn()) {
        if (typeof showPage === "function") {
            showPage("login");
        } else {
            window.location.href = "index.html";
        }
        return;
    }

    // If already logged in, go directly to dashboard
    window.location.href = "dashboard.html";
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
