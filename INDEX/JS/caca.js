const CART_KEY = "homoHabilisCart";


        function getCart() {

            return JSON.parse(
                localStorage.getItem(CART_KEY)
            ) || [];

        }


        function saveCart(cart) {

            localStorage.setItem(
                CART_KEY,
                JSON.stringify(cart)
            );

        }


        function addToCart(name, price) {

            const cart = getCart();

            const existing =
                cart.find(item => item.name === name);

            if (existing) {

                existing.quantity++;

            } else {

                cart.push({
                    name,
                    price,
                    quantity: 1
                });

            }

            saveCart(cart);

            updateCartCount();

            alert("Produto adicionado ao carrinho.");

        }


        function updateCartCount() {

            const cart = getCart();

            const count = cart.reduce(
                (sum, item) =>
                    sum + item.quantity,
                0
            );

            document
                .querySelectorAll(".cart-count")
                .forEach(element => {
                    element.textContent = count;
                });

        }


        function filterProducts(category, button) {

            document
                .querySelectorAll(".filter-button")
                .forEach(btn => {
                    btn.classList.remove(
                        "filter-button--active"
                    );
                });

            button.classList.add(
                "filter-button--active"
            );


            document
                .querySelectorAll(".product-card")
                .forEach(card => {

                    card.style.display =
                        category === "todos" ||
                        card.dataset.category === category
                            ? "flex"
                            : "none";

                });

        }


        function toggleFavorite(button) {

            button.classList.toggle(
                "favorite--active"
            );

            button.textContent =
                button.classList.contains(
                    "favorite--active"
                )
                    ? "♥"
                    : "♡";

        }


        function openCart() {

            renderCart();

            document
                .getElementById("cartModal")
                .classList.add(
                    "cart-modal--active"
                );

        }


        function closeCart() {

            document
                .getElementById("cartModal")
                .classList.remove(
                    "cart-modal--active"
                );

        }


        function renderCart() {

            const cart = getCart();

            const container =
                document.getElementById("cartItems");

            let total = 0;

            if (!cart.length) {

                container.innerHTML =
                    "<p>Seu carrinho está vazio.</p>";

                document.getElementById(
                    "cartTotal"
                ).textContent = "R$ 0,00";

                return;

            }


            container.innerHTML =
                cart.map((item, index) => {

                    total +=
                        item.price * item.quantity;

                    return `
                        <div class="cart-item">

                            <div>
                                <strong>
                                    ${item.name}
                                </strong>

                                <span>
                                    ${item.quantity}x
                                </span>
                            </div>

                            <button
                                onclick="removeFromCart(${index})">
                                ×
                            </button>

                        </div>
                    `;

                }).join("");


            document.getElementById(
                "cartTotal"
            ).textContent =
                "R$ " +
                total.toFixed(2)
                    .replace(".", ",");

        }


        function removeFromCart(index) {

            const cart = getCart();

            cart.splice(index, 1);

            saveCart(cart);

            updateCartCount();

            renderCart();

        }


        updateCartCount();