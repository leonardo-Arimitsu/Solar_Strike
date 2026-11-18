"use strict";

/* =========================================
   CONFIGURAÇÕES
========================================= */

const PRODUCTS_URL = "/INDEX/JS/produtos.json";

const CART_KEY = "homoHabilisCart";
const FAVORITES_KEY = "homoHabilisFavorites";

let products = [];
let currentCatalog = null;


/* =========================================
   FUNÇÕES AUXILIARES
========================================= */

function formatMoney(value) {
    return Number(value || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function normalizeText(value = "") {
    return String(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function escapeHTML(value = "") {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

function getProductById(id) {
    return products.find(product => String(product.id) === String(id));
}

function getProductImage(product) {
    return product.imagens?.[0] || "";
}

function getInstallmentText(product) {
    const installments = Number(product.parcelas) || 1;
    const price = Number(product.preco) || 0;

    if (installments <= 1) {
        return "À vista";
    }

    return `ou ${installments}x de ${formatMoney(price / installments)}`;
}

function getCategoryName(category) {
    const names = {
        pesca: "Pesca",
        caca: "Caça & Campo"
    };

    return names[category] || category;
}


/* =========================================
   LOCAL STORAGE
========================================= */

function getCart() {
    try {
        const cart = JSON.parse(localStorage.getItem(CART_KEY)) || [];
        return Array.isArray(cart) ? cart : [];
    } catch (error) {
        console.error("Erro ao ler carrinho:", error);
        return [];
    }
}

function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function getFavorites() {
    try {
        const favorites = JSON.parse(localStorage.getItem(FAVORITES_KEY)) || [];
        return Array.isArray(favorites) ? favorites : [];
    } catch (error) {
        console.error("Erro ao ler favoritos:", error);
        return [];
    }
}

function saveFavorites(favorites) {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}


/* =========================================
   CARDS DOS PRODUTOS
========================================= */

function renderProductCard(product) {

    const id = escapeHTML(product.id);
    const name = escapeHTML(product.nome);
    const image = escapeHTML(getProductImage(product));
    const category = escapeHTML(product.subcategoria || getCategoryName(product.categoria));
    const description = escapeHTML(product.resumo || "");
    const price = formatMoney(product.preco);
    const installment = getInstallmentText(product);

    const stock = Number(product.estoque) || 0;
    const favorites = getFavorites();
    const isFavorite = favorites.includes(String(product.id));

    let badgeHTML = "";

    if (product.badge) {
        const badgeClass = normalizeText(product.badge) === "novo"
            ? "product-badge product-badge--new"
            : "product-badge";

        badgeHTML = `
            <span class="${badgeClass}">
                ${escapeHTML(product.badge)}
            </span>
        `;
    }

    let stockHTML = "";

    if (stock <= 0) {
        stockHTML = `
            <span class="product-stock product-stock--out">
                Indisponível
            </span>
        `;
    } else if (stock <= 5) {
        stockHTML = `
            <span class="product-stock product-stock--low">
                Últimas ${stock} unidades
            </span>
        `;
    } else {
        stockHTML = `
            <span class="product-stock">
                Em estoque
            </span>
        `;
    }

    const buttonText = stock <= 0
        ? "Produto indisponível"
        : "Adicionar ao carrinho";

    return `
        <article class="product-card">

            <div class="product-image">

                ${badgeHTML}

                <button
                    class="favorite ${isFavorite ? "favorite--active" : ""}"
                    type="button"
                    onclick="toggleFavorite('${id}', this)"
                    aria-label="Adicionar ${name} aos favoritos"
                    aria-pressed="${isFavorite}"
                >
                    ${isFavorite ? "♥" : "♡"}
                </button>

                <a
                    href="produto.html?id=${encodeURIComponent(product.id)}"
                    class="product-link"
                >
                    <img
                        src="${image}"
                        alt="${name}"
                        loading="lazy"
                        onerror="this.onerror=null;this.src='https://placehold.co/600x600?text=Produto'"
                    >
                </a>

            </div>

            <div class="product-info">

                <span class="product-category">
                    ${category}
                </span>

                <h3>
                    <a href="produto.html?id=${encodeURIComponent(product.id)}">
                        ${name}
                    </a>
                </h3>

                <p>${description}</p>

                <div class="product-commerce">

                    <strong class="product-price">
                        ${price}
                    </strong>

                    <span class="installment">
                        ${installment}
                    </span>

                    ${stockHTML}

                </div>

                <button
                    class="add-cart"
                    type="button"
                    onclick="addToCart('${id}')"
                    ${stock <= 0 ? "disabled" : ""}
                >
                    ${buttonText}
                </button>

            </div>

        </article>
    `;
}


/* =========================================
   RENDERIZAÇÃO DOS GRIDS
========================================= */

function renderProducts(container, productList) {

    if (!container) return;

    if (!productList.length) {
        container.innerHTML = `
            <div class="catalog-empty">
                <h3>Nenhum produto encontrado</h3>
                <p>Tente alterar os filtros ou o termo da busca.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = productList
        .map(product => renderProductCard(product))
        .join("");
}


/* =========================================
   PÁGINA INICIAL
========================================= */

function renderHome() {

    const featuredGrid = document.getElementById("featuredGrid");
    const fishingGrid = document.getElementById("homeFishingGrid");
    const huntingGrid = document.getElementById("homeHuntingGrid");

    if (featuredGrid) {
        const featured = products
            .filter(product => product.badge && product.badge.trim() !== "")
            .slice(0, 4);

        renderProducts(featuredGrid, featured);
    }

    if (fishingGrid) {
        const fishingProducts = products
            .filter(product => product.categoria === "pesca")
            .slice(0, 4);

        renderProducts(fishingGrid, fishingProducts);
    }

    if (huntingGrid) {
        const huntingProducts = products
            .filter(product => product.categoria === "caca")
            .slice(0, 4);

        renderProducts(huntingGrid, huntingProducts);
    }
}


/* =========================================
   CATÁLOGO E FILTROS
========================================= */

function setupCatalog() {

    const grid = document.querySelector("[data-catalog]");

    if (!grid) return;

    currentCatalog = grid.dataset.catalog;

    const search = document.getElementById("catalogSearch");
    const category = document.getElementById("categoryFilter");
    const sort = document.getElementById("sortFilter");
    const minPrice = document.getElementById("minPrice");
    const maxPrice = document.getElementById("maxPrice");
    const stock = document.getElementById("stockFilter");
    const clearButton = document.getElementById("clearFilters");

    [
        search,
        category,
        sort,
        minPrice,
        maxPrice,
        stock
    ].forEach(element => {

        if (!element) return;

        element.addEventListener("input", applyCatalogFilters);
        element.addEventListener("change", applyCatalogFilters);

    });

    if (clearButton) {
        clearButton.addEventListener("click", clearCatalogFilters);
    }

    // Permite abrir a página já com uma categoria selecionada.
    const params = new URLSearchParams(window.location.search);
    const requestedCategory = params.get("categoria");

    if (
        requestedCategory &&
        category &&
        [...category.options].some(option => option.value === requestedCategory)
    ) {
        category.value = requestedCategory;
    }

    applyCatalogFilters();
}


function applyCatalogFilters() {

    const grid = document.querySelector("[data-catalog]");

    if (!grid || !currentCatalog) return;

    const searchInput = document.getElementById("catalogSearch");
    const categoryInput = document.getElementById("categoryFilter");
    const sortInput = document.getElementById("sortFilter");
    const minInput = document.getElementById("minPrice");
    const maxInput = document.getElementById("maxPrice");
    const stockInput = document.getElementById("stockFilter");

    const search = normalizeText(searchInput?.value || "");
    const selectedCategory = categoryInput?.value || "todos";
    const sort = sortInput?.value || "default";

    const minPrice = minInput?.value === ""
        ? 0
        : Number(minInput?.value || 0);

    const maxPrice = maxInput?.value === ""
        ? Infinity
        : Number(maxInput?.value || Infinity);

    const stockFilter = stockInput?.value || "all";

    let filtered = products.filter(product => {

        // Separa pesca e caça.
        if (product.categoria !== currentCatalog) {
            return false;
        }

        // Filtra subcategoria.
        if (
            selectedCategory !== "todos" &&
            product.subcategoria !== selectedCategory
        ) {
            return false;
        }

        // Busca em nome, resumo, descrição e categoria.
        const searchableContent = normalizeText([
            product.nome,
            product.resumo,
            product.descricao,
            product.subcategoria,
            product.categoria
        ].join(" "));

        if (search && !searchableContent.includes(search)) {
            return false;
        }

        // Faixa de preço.
        const price = Number(product.preco) || 0;

        if (price < minPrice || price > maxPrice) {
            return false;
        }

        // Estoque.
        const quantity = Number(product.estoque) || 0;

        if (stockFilter === "available" && quantity <= 0) {
            return false;
        }

        if (stockFilter === "low" && (quantity <= 0 || quantity > 5)) {
            return false;
        }

        return true;
    });

    // Ordenação.
    switch (sort) {

        case "price-asc":
            filtered.sort((a, b) => Number(a.preco) - Number(b.preco));
            break;

        case "price-desc":
            filtered.sort((a, b) => Number(b.preco) - Number(a.preco));
            break;

        case "name-asc":
            filtered.sort((a, b) =>
                a.nome.localeCompare(b.nome, "pt-BR")
            );
            break;

        case "name-desc":
            filtered.sort((a, b) =>
                b.nome.localeCompare(a.nome, "pt-BR")
            );
            break;
    }

    renderProducts(grid, filtered);

    const resultsCount = document.getElementById("resultsCount");

    if (resultsCount) {
        const total = filtered.length;

        resultsCount.textContent =
            `${total} ${total === 1 ? "produto encontrado" : "produtos encontrados"}`;
    }
}


function clearCatalogFilters() {

    const ids = [
        "catalogSearch",
        "minPrice",
        "maxPrice"
    ];

    ids.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.value = "";
    });

    const category = document.getElementById("categoryFilter");
    const sort = document.getElementById("sortFilter");
    const stock = document.getElementById("stockFilter");

    if (category) category.value = "todos";
    if (sort) sort.value = "default";
    if (stock) stock.value = "all";

    // Remove o parâmetro de categoria da URL.
    const url = new URL(window.location.href);
    url.searchParams.delete("categoria");
    window.history.replaceState({}, "", url);

    applyCatalogFilters();
}


/* =========================================
   CARRINHO
========================================= */

function addToCart(productId) {

    const product = getProductById(productId);

    if (!product) {
        alert("Produto não encontrado.");
        return;
    }

    const availableStock = Number(product.estoque) || 0;

    if (availableStock <= 0) {
        alert("Este produto está indisponível.");
        return;
    }

    const cart = getCart();

    const existingItem = cart.find(
        item => String(item.id) === String(productId)
    );

    if (existingItem) {

        if (existingItem.quantity >= availableStock) {
            alert("Você atingiu o limite de unidades disponíveis.");
            return;
        }

        existingItem.quantity += 1;

    } else {

        cart.push({
            id: product.id,
            name: product.nome,
            price: Number(product.preco),
            quantity: 1
        });

    }

    saveCart(cart);
    updateCartCount();
    renderCart();

    const modal = document.getElementById("cartModal");

    if (modal) {
        modal.classList.add("cart-modal--active");
    }
}


function changeCartQuantity(productId, amount) {

    const cart = getCart();

    const item = cart.find(
        entry => String(entry.id) === String(productId)
    );

    if (!item) return;

    const product = getProductById(productId);
    const nextQuantity = item.quantity + amount;

    if (nextQuantity <= 0) {
        removeFromCart(productId);
        return;
    }

    if (product && nextQuantity > Number(product.estoque)) {
        alert("Não há mais unidades disponíveis.");
        return;
    }

    item.quantity = nextQuantity;

    saveCart(cart);
    updateCartCount();
    renderCart();
}


function removeFromCart(productId) {

    const cart = getCart().filter(
        item => String(item.id) !== String(productId)
    );

    saveCart(cart);
    updateCartCount();
    renderCart();
}


function updateCartCount() {

    const total = getCart().reduce(
        (sum, item) => sum + Number(item.quantity || 0),
        0
    );

    document.querySelectorAll(".cart-count").forEach(element => {
        element.textContent = total;
    });
}


function renderCart() {

    const container = document.getElementById("cartItems");
    const totalElement = document.getElementById("cartTotal");

    if (!container || !totalElement) return;

    const cart = getCart();

    if (cart.length === 0) {

        container.innerHTML = `
            <div class="cart-empty">
                <span>🛒</span>
                <p>Seu carrinho está vazio.</p>
                <small>Adicione produtos para continuar.</small>
            </div>
        `;

        totalElement.textContent = formatMoney(0);
        return;
    }

    let total = 0;

    container.innerHTML = cart.map(item => {

        const quantity = Number(item.quantity) || 0;
        const price = Number(item.price) || 0;
        const subtotal = price * quantity;

        total += subtotal;

        return `
            <div class="cart-item">

                <div class="cart-item__details">
                    <strong>${escapeHTML(item.name)}</strong>
                    <span>${formatMoney(price)} cada</span>
                    <small>Subtotal: ${formatMoney(subtotal)}</small>
                </div>

                <div class="cart-item__actions">

                    <div class="quantity-control">

                        <button
                            type="button"
                            aria-label="Diminuir quantidade"
                            onclick="changeCartQuantity('${escapeHTML(item.id)}', -1)"
                        >
                            −
                        </button>

                        <span>${quantity}</span>

                        <button
                            type="button"
                            aria-label="Aumentar quantidade"
                            onclick="changeCartQuantity('${escapeHTML(item.id)}', 1)"
                        >
                            +
                        </button>

                    </div>

                    <button
                        class="cart-remove"
                        type="button"
                        onclick="removeFromCart('${escapeHTML(item.id)}')"
                    >
                        Remover
                    </button>

                </div>

            </div>
        `;

    }).join("");

    totalElement.textContent = formatMoney(total);
}


function openCart() {

    renderCart();

    document
        .getElementById("cartModal")
        ?.classList.add("cart-modal--active");
}


function closeCart() {

    document
        .getElementById("cartModal")
        ?.classList.remove("cart-modal--active");
}


/* =========================================
   FAVORITOS
========================================= */

function toggleFavorite(productId, button) {

    const favorites = getFavorites();
    const index = favorites.indexOf(String(productId));

    if (index >= 0) {
        favorites.splice(index, 1);
    } else {
        favorites.push(String(productId));
    }

    saveFavorites(favorites);

    if (button) {

        const active = favorites.includes(String(productId));

        button.classList.toggle("favorite--active", active);
        button.textContent = active ? "♥" : "♡";
        button.setAttribute("aria-pressed", String(active));
    }
}


/* =========================================
   FINALIZAÇÃO VISUAL DO PEDIDO
========================================= */

function checkout() {

    const cart = getCart();

    if (cart.length === 0) {
        alert("Seu carrinho está vazio.");
        return;
    }

    alert(
        "O carrinho está funcionando, mas a finalização de compra ainda precisa ser conectada a um sistema de pedidos e pagamento."
    );
}


/* =========================================
   CARREGAMENTO DO JSON
========================================= */

async function loadProducts() {

    const response = await fetch(PRODUCTS_URL, {
        cache: "no-cache"
    });

    if (!response.ok) {
        throw new Error(
            `Não foi possível carregar produtos.json. Status: ${response.status}`
        );
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
        throw new Error("O arquivo JSON precisa conter uma lista de produtos.");
    }

    products = data;

    renderHome();
    setupCatalog();

    updateCartCount();
    renderCart();
}


/* =========================================
   TRATAMENTO DE ERRO
========================================= */

function showCatalogError(error) {

    console.error("Erro ao carregar a loja:", error);

    document.querySelectorAll(
        "#featuredGrid, #homeFishingGrid, #homeHuntingGrid, [data-catalog]"
    ).forEach(grid => {

        grid.innerHTML = `
            <div class="catalog-error">
                <h3>Não foi possível carregar os produtos.</h3>
                <p>Verifique se o arquivo produtos.json está no caminho correto.</p>
                <small>${escapeHTML(error.message)}</small>
            </div>
        `;

    });

    const count = document.getElementById("resultsCount");

    if (count) {
        count.textContent = "Falha ao carregar o catálogo.";
    }
}


/* =========================================
   INICIALIZAÇÃO
========================================= */

document.addEventListener("DOMContentLoaded", async () => {

    // Fecha o carrinho ao clicar fora da caixa.
    document.getElementById("cartModal")?.addEventListener("click", event => {

        if (event.target.id === "cartModal") {
            closeCart();
        }

    });

    // Carrega o catálogo.
    try {
        await loadProducts();
    } catch (error) {
        showCatalogError(error);
    }

});