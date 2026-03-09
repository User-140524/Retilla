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

    cartContent.innerHTML = `
        <div class="cart-list">
            ${cart.map(item => {
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
                            </div>
                        </div>

                        <div class="cart-item-right">
                            <div class="cart-quantity-controls">
                                <button onclick="updateQuantity('${item.productId}', -1)">-</button>
                                <span>${item.quantity}</span>
                                <button onclick="updateQuantity('${item.productId}', 1)">+</button>
                            </div>
                            <p><strong>₹${subtotal}/month</strong></p>
                            <button onclick="removeFromCart('${item.productId}')">Remove</button>
                        </div>
                    </div>
                `;
            }).join("")}
        </div>

        <div class="cart-summary">
            <h3>Total Monthly Rent: ₹${total}</h3>
            <button class="btn btn-primary" onclick="startRentalRequest()">Proceed to Request</button>
        </div>
    `;
}

function startRentalRequest() {
    if (cart.length === 0) {
        alert("Your cart is empty.");
        return;
    }

    alert("Rental request form will be added next.");
}

window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateQuantity = updateQuantity;
window.renderCart = renderCart;
window.startRentalRequest = startRentalRequest;
