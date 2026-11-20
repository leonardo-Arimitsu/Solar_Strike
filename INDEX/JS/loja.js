"use strict";

/* =========================================
   CONFIGURAÇÕES
========================================= */

const PRODUCTS_URL = "/INDEX/JS/produtos.json";

const CART_KEY = "homoHabilisCart";
const FAVORITES_KEY = "homoHabilisFavorites";

// Caminho da página de login (fixo aqui, não depende do login.js)
const LOGIN_URL = "/LOGIN/HTML/login.html";

// Página "Minha conta"
const CONTA_URL = "/INDEX/HTML/conta.html";

// Valor mínimo para frete grátis (apague a barra no HTML/JS se não quiser)
const FREE_SHIPPING_MIN = 500;

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

/*
   O carrinho guarda apenas { id, quantity }.
   Nome, preço e imagem vêm sempre do produtos.json,
   então o cliente nunca vê um preço desatualizado.
*/
function getCart() {
    try {
        const raw = JSON.parse(localStorage.getItem(CART_KEY)) || [];

        if (!Array.isArray(raw)) return [];

        // Compatível com o formato antigo (ignora name/price).
        return raw
            .map(item => ({
                id: String(item.id),
                quantity: Number(item.quantity) || 0
            }))
            .filter(item => item.quantity > 0);

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

// Junta o carrinho com os dados atuais dos produtos e corrige o estoque.
function getCartDetailed() {
    return getCart()
        .map(item => {
            const product = getProductById(item.id);
            if (!product) return null;

            const stock = Number(product.estoque) || 0;
            if (stock <= 0) return null;

            return {
                product,
                quantity: Math.min(item.quantity, stock),
                stock
            };
        })
        .filter(Boolean);
}


/* =========================================
   AVISO (TOAST)
========================================= */

let toastTimer;

function showToast(message, withCartButton = false) {

    const toast = document.getElementById("toast");

    if (!toast) return;

    toast.innerHTML =
        `<span>${escapeHTML(message)}</span>` +
        (withCartButton
            ? `<button type="button" data-cart-open>Ver carrinho</button>`
            : "");

    toast.classList.add("toast--show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.classList.remove("toast--show");
    }, 3500);
}


/* =========================================
   MENU DO USUÁRIO (SESSÃO)
   Depende do login.js (obterSessao, sair, URL_DASHBOARD)
========================================= */

function closeUserMenu() {

    const dropdown = document.querySelector(".user-dropdown");
    const trigger = document.querySelector(".user-trigger");

    if (dropdown) dropdown.hidden = true;
    if (trigger) trigger.setAttribute("aria-expanded", "false");
}

function renderUserMenu() {

    const box = document.getElementById("headerUser");

    if (!box) return;

    const session = typeof obterSessao === "function"
        ? obterSessao()
        : null;

    // Visitante: botão "Entrar".
    if (!session) {

        box.innerHTML = `
            <a href="${LOGIN_URL}" class="header-login">
                <span class="header-login__icon">👤</span>
                <span>Entrar</span>
            </a>
        `;

        return;
    }

    // Usuário logado.
    const fullName = String(session.nome || "Usuário").trim();
    const firstName = escapeHTML(fullName.split(" ")[0]);
    const initial = escapeHTML(fullName.charAt(0).toUpperCase());

    const adminLink = session.perfil === "admin" && typeof URL_DASHBOARD === "string"
        ? `<a href="${URL_DASHBOARD}">Painel administrativo</a>`
        : "";

    box.innerHTML = `
        <button
            class="user-trigger"
            type="button"
            aria-haspopup="true"
            aria-expanded="false"
        >
            <span class="user-avatar">${initial}</span>
            <span class="user-name">Olá, ${firstName}</span>
            <span aria-hidden="true">▾</span>
        </button>

        <div class="user-dropdown" hidden>

            <div class="user-dropdown__info">
                <strong>${escapeHTML(fullName)}</strong>
                <small>${escapeHTML(session.email || "")}</small>
            </div>

            <a href="${CONTA_URL}">Minha conta</a>
            <a href="${CONTA_URL}#favoritos">Meus favoritos</a>

            ${adminLink}

            <button type="button" data-user-action="logout">Sair</button>

        </div>
    `;

    const trigger = box.querySelector(".user-trigger");
    const dropdown = box.querySelector(".user-dropdown");

    trigger.addEventListener("click", event => {

        event.stopPropagation();

        const willOpen = dropdown.hidden;

        dropdown.hidden = !willOpen;
        trigger.setAttribute("aria-expanded", String(willOpen));
    });

    box.querySelector('[data-user-action="logout"]')
        .addEventListener("click", () => {

            sair(false);        // limpa a sessão sem redirecionar
            renderUserMenu();   // volta o botão "Entrar"
            showToast("Você saiu da sua conta.");

            // Páginas que exigem login (ex.: Minha conta) escutam isto e saem da tela.
            document.dispatchEvent(new Event("session:ended"));
        });
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
   CARRINHO — AÇÕES
========================================= */

function addToCart(productId) {

    const product = getProductById(productId);

    if (!product) {
        showToast("Produto não encontrado.");
        return;
    }

    const stock = Number(product.estoque) || 0;

    if (stock <= 0) {
        showToast("Este produto está indisponível.");
        return;
    }

    const cart = getCart();
    const item = cart.find(entry => entry.id === String(productId));

    if (item) {

        if (item.quantity >= stock) {
            showToast("Você atingiu o limite de unidades em estoque.");
            return;
        }

        item.quantity += 1;

    } else {

        cart.push({
            id: String(productId),
            quantity: 1
        });

    }

    saveCart(cart);
    refreshCart();

    showToast(`${product.nome} adicionado ao carrinho.`, true);
}


function changeCartQuantity(productId, amount) {

    const cart = getCart();
    const item = cart.find(entry => entry.id === String(productId));

    if (!item) return;

    const product = getProductById(productId);
    const next = item.quantity + amount;

    if (next <= 0) {
        removeFromCart(productId);
        return;
    }

    if (product && next > Number(product.estoque)) {
        showToast("Não há mais unidades disponíveis.");
        return;
    }

    item.quantity = next;

    saveCart(cart);
    refreshCart();
}


function removeFromCart(productId) {

    saveCart(
        getCart().filter(item => item.id !== String(productId))
    );

    refreshCart();
}


function clearCart() {

    if (!getCart().length) return;

    if (!confirm("Remover todos os itens do carrinho?")) return;

    saveCart([]);
    refreshCart();
}


function refreshCart() {
    updateCartCount();
    renderCart();
}


/* =========================================
   CARRINHO — EXIBIÇÃO
========================================= */

function updateCartCount() {

    const total = getCart().reduce(
        (sum, item) => sum + item.quantity,
        0
    );

    document.querySelectorAll(".cart-count").forEach(element => {
        element.textContent = total;
    });

    const summary = document.getElementById("cartSummaryCount");

    if (summary) {
        summary.textContent = total ? `(${total})` : "";
    }
}


function renderCart() {

    const container = document.getElementById("cartItems");
    const totalElement = document.getElementById("cartTotal");
    const shipping = document.getElementById("cartShipping");

    if (!container || !totalElement) return;

    const items = getCartDetailed();

    if (!items.length) {

        container.innerHTML = `
            <div class="cart-empty">
                <span>🛒</span>
                <p>Seu carrinho está vazio.</p>
                <small>Adicione produtos para continuar.</small>
            </div>
        `;

        totalElement.textContent = formatMoney(0);

        if (shipping) shipping.innerHTML = "";

        return;
    }

    let total = 0;

    container.innerHTML = items.map(({ product, quantity }) => {

        const price = Number(product.preco) || 0;
        const subtotal = price * quantity;

        total += subtotal;

        const id = escapeHTML(product.id);

        return `
            <div class="cart-item" data-id="${id}">

                <img
                    class="cart-item__image"
                    src="${escapeHTML(getProductImage(product))}"
                    alt=""
                    onerror="this.onerror=null;this.src='https://placehold.co/120x120?text=Produto'"
                >

                <div class="cart-item__details">

                    <a href="produto.html?id=${encodeURIComponent(product.id)}">
                        ${escapeHTML(product.nome)}
                    </a>

                    <span>${formatMoney(price)} cada</span>

                    <div class="quantity-control">

                        <button type="button" data-action="dec" aria-label="Diminuir quantidade">−</button>

                        <span>${quantity}</span>

                        <button type="button" data-action="inc" aria-label="Aumentar quantidade">+</button>

                    </div>

                </div>

                <div class="cart-item__side">

                    <strong>${formatMoney(subtotal)}</strong>

                    <button class="cart-remove" type="button" data-action="remove">
                        Remover
                    </button>

                </div>

            </div>
        `;

    }).join("");

    totalElement.textContent = formatMoney(total);

    if (shipping) {

        const missing = FREE_SHIPPING_MIN - total;
        const percent = Math.min(100, (total / FREE_SHIPPING_MIN) * 100);

        shipping.innerHTML = missing > 0
            ? `
                <p>Faltam <strong>${formatMoney(missing)}</strong> para frete grátis</p>
                <div class="cart-shipping__bar"><span style="width:${percent}%"></span></div>
            `
            : `
                <p>🎉 Você ganhou <strong>frete grátis</strong>!</p>
                <div class="cart-shipping__bar"><span style="width:100%"></span></div>
            `;
    }
}


/* =========================================
   CARRINHO — ABRIR / FECHAR
========================================= */

function openCart() {

    renderCart();

    const drawer = document.getElementById("cartDrawer");
    const overlay = document.getElementById("cartOverlay");

    drawer?.classList.add("cart-drawer--open");
    drawer?.setAttribute("aria-hidden", "false");

    if (overlay) overlay.hidden = false;

    document.body.classList.add("no-scroll");
}


function closeCart() {

    const drawer = document.getElementById("cartDrawer");
    const overlay = document.getElementById("cartOverlay");

    drawer?.classList.remove("cart-drawer--open");
    drawer?.setAttribute("aria-hidden", "true");

    if (overlay) overlay.hidden = true;

    document.body.classList.remove("no-scroll");
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

    document.dispatchEvent(new Event("favorites:changed"));
}


/* =========================================
   FINALIZAÇÃO DO PEDIDO
========================================= */

function checkout() {

    if (!getCartDetailed().length) {
        showToast("Seu carrinho está vazio.");
        return;
    }

    // Exige login para finalizar.
    if (typeof obterSessao === "function" && !obterSessao()) {

        alert("Entre na sua conta para finalizar a compra.");

        window.location.href = LOGIN_URL;

        return;
    }

    alert(
        "O carrinho está funcionando, mas a finalização de compra ainda precisa ser conectada a um sistema de pedidos e pagamento."
    );
}


/* =========================================
   EVENTOS GLOBAIS
========================================= */

function setupGlobalEvents() {

    // Clique no fundo escuro fecha o carrinho.
    document.getElementById("cartOverlay")
        ?.addEventListener("click", closeCart);

    // Delegação: botões com data-cart-* e fechar menu do usuário.
    document.addEventListener("click", event => {

        if (event.target.closest("[data-cart-close]")) closeCart();
        if (event.target.closest("[data-cart-open]")) openCart();
        if (event.target.closest("[data-cart-clear]")) clearCart();
        if (event.target.closest("[data-cart-checkout]")) checkout();

        // Clique fora do menu do usuário fecha o dropdown.
        if (!event.target.closest(".user-trigger")) closeUserMenu();
    });

    // Botões dentro do carrinho (+, −, remover).
    document.getElementById("cartItems")?.addEventListener("click", event => {

        const button = event.target.closest("[data-action]");
        const item = event.target.closest(".cart-item");

        if (!button || !item) return;

        const id = item.dataset.id;
        const action = button.dataset.action;

        if (action === "inc") changeCartQuantity(id, 1);
        if (action === "dec") changeCartQuantity(id, -1);
        if (action === "remove") removeFromCart(id);
    });

    // Esc fecha carrinho e menu do usuário.
    document.addEventListener("keydown", event => {

        if (event.key === "Escape") {
            closeCart();
            closeUserMenu();
        }
    });

    // Sincroniza carrinho e sessão entre abas.
    window.addEventListener("storage", event => {

        if (event.key === CART_KEY) refreshCart();

        if (event.key === "sessao") renderUserMenu();

        if (event.key === FAVORITES_KEY) {
            document.dispatchEvent(new Event("favorites:changed"));
        }
    });
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

    // O carrinho depende dos produtos carregados.
    updateCartCount();
    renderCart();

    document.dispatchEvent(new Event("products:loaded"));
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

    // Menu do usuário primeiro: aparece mesmo se o JSON falhar.
    renderUserMenu();

    setupGlobalEvents();
    updateCartCount();

    try {
        await loadProducts();
    } catch (error) {
        showCatalogError(error);
        document.dispatchEvent(new Event("products:error"));
    }

});