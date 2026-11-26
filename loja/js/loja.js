"use strict";

/* =========================================================
   LOJA — NÚCLEO
   Catálogo, carrinho, favoritos, menu do usuário e avisos.

   Depende de: utils.js, auth.js, dados.js e analytics.js (carregados antes).
   Usado por: index, pesca, caca, produto e conta.

   Outros scripts da loja usam:
   - renderProductCard(produto)        → HTML do card
   - getAllProducts() / getProductById(id)
   - whenProductsReady(aoCarregar, aoFalhar)
   - addToCart(id, quantidade)
========================================================= */


/* =========================================
   CONFIGURAÇÕES
========================================= */

const PRODUCTS_URL = "/shared/data/produtos.json";
const CONTA_URL = "/loja/html/conta.html";

const FAVORITES_KEY = "homoHabilisFavorites";

// Valor mínimo para frete grátis (barra do carrinho).
const FREE_SHIPPING_MIN = 500;

// Até quantas unidades o selo "Últimas unidades" aparece.
const LOW_STOCK_LIMIT = 5;

const TOAST_DURATION = 3500;


/* =========================================
   ESTADO DOS PRODUTOS
========================================= */

let products = [];
let rawProducts = [];                   // catálogo como veio (usado para baixar estoque)
let productsState = "loading";          // "loading" | "ready" | "error"
let productsError = null;

const productListeners = [];

function getAllProducts() {
    return products;
}

function getProductById(id) {
    return products.find(product => product.id === String(id));
}

/*
   Avisa quando o catálogo carregou. Se isso já aconteceu,
   chama na hora — assim a ordem de carregamento dos scripts
   não importa.
*/
function whenProductsReady(onReady, onError) {

    if (productsState === "ready") {
        onReady?.(products);
        return;
    }

    if (productsState === "error") {
        onError?.(productsError);
        return;
    }

    productListeners.push({ onReady, onError });
}

function settleProducts(state, error = null) {

    productsState = state;
    productsError = error;

    productListeners.splice(0).forEach(listener => {

        if (state === "ready") listener.onReady?.(products);
        else listener.onError?.(error);
    });
}

// Garante tipos corretos e descarta produtos inválidos.
function normalizeProduct(raw) {

    if (!raw || typeof raw !== "object") return null;

    const id = String(raw.id ?? "").trim();

    if (!id || !raw.nome) return null;

    // Produtos descontinuados saem da vitrine.
    const status = normalizeText(raw.status || "disponivel");

    if (status === "descontinuado") return null;

    let stock = Math.max(0, parseInt(raw.estoque, 10) || 0);

    if (status === "indisponivel") stock = 0;

    return {
        ...raw,
        id,
        nome: String(raw.nome),
        preco: Math.max(0, Number(raw.preco) || 0),
        parcelas: Math.max(1, parseInt(raw.parcelas, 10) || 1),
        estoque: stock,
        marca: String(raw.marca || "").trim(),
        precoOriginal: Number(raw.precoOriginal) > Number(raw.preco) ? Number(raw.precoOriginal) : 0,
        controlado: raw.controlado === true || raw.controlado === "true",
        requisitos: String(raw.requisitos || ""),
        video: String(raw.video || "").trim(),
        imagens: Array.isArray(raw.imagens) ? raw.imagens.filter(Boolean) : [],
        especificacoes: raw.especificacoes && typeof raw.especificacoes === "object"
            ? raw.especificacoes
            : {}
    };
}

/*
   Origem do catálogo:
   1) o que foi cadastrado/editado no dashboard (localStorage);
   2) se não houver, o produtos.json de exemplo.
*/
async function fetchProducts() {

    const saved = lerStorage(CHAVE_PRODUTOS, null);

    if (Array.isArray(saved)) return saved;

    const response = await fetch(PRODUCTS_URL, { cache: "no-cache" });

    if (!response.ok) {
        throw new Error(`Não foi possível carregar produtos.json (status ${response.status}).`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
        throw new Error("O arquivo de produtos precisa conter uma lista.");
    }

    return data;
}


/* =========================================
   FUNÇÕES AUXILIARES DE PRODUTO
========================================= */

function getProductImage(product) {
    return product.imagens?.[0] || COR_FALLBACK_IMAGEM;
}

function getInstallmentText(product) {

    if (product.parcelas <= 1) return "À vista";

    return `ou ${product.parcelas}x de ${formatMoney(product.preco / product.parcelas)}`;
}

function getCategoryName(category) {

    const names = {
        pesca: "Pesca",
        caca: "Caça & Campo"
    };

    return names[category] || category;
}

function getStockInfo(product) {

    if (product.estoque <= 0) {
        return { className: "product-stock product-stock--out", text: "Indisponível" };
    }

    if (product.estoque <= LOW_STOCK_LIMIT) {
        return {
            className: "product-stock product-stock--low",
            text: `Últimas ${product.estoque} ${product.estoque === 1 ? "unidade" : "unidades"}`
        };
    }

    return { className: "product-stock", text: "Em estoque" };
}


/* =========================================
   ARMAZENAMENTO: CARRINHO E FAVORITOS

   O carrinho guarda só { id, quantity }. Nome, preço e imagem
   vêm sempre do catálogo, então nunca aparece preço antigo.
========================================= */

// O carrinho é gravado por cliente (veja dados.js → carrinhos).
function getCart() {
    return obterCarrinho();
}

function saveCart(cart) {
    salvarCarrinho(cart);
}

function getFavorites() {

    const favorites = lerStorage(FAVORITES_KEY, []);

    return Array.isArray(favorites) ? favorites.map(String) : [];
}

function saveFavorites(favorites) {
    salvarStorage(FAVORITES_KEY, favorites);
}

// Carrinho + dados atuais do catálogo, com quantidade limitada ao estoque.
function getCartDetailed() {

    return getCart()
        .map(item => {

            const product = getProductById(item.id);

            if (!product || product.estoque <= 0) return null;

            return {
                product,
                quantity: Math.min(item.quantity, product.estoque)
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

    toastTimer = setTimeout(
        () => toast.classList.remove("toast--show"),
        TOAST_DURATION
    );
}


/* =========================================
   MENU DO USUÁRIO
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

    const session = obterSessao();

    // Visitante: botão "Entrar".
    if (!session) {

        box.innerHTML = `
            <a href="${URL_LOGIN}" class="header-login">
                <span class="header-login__icon">👤</span>
                <span>Entrar</span>
            </a>
        `;

        return;
    }

    const fullName = String(session.nome || "Usuário").trim();
    const firstName = escapeHTML(fullName.split(" ")[0]);
    const initial = escapeHTML(fullName.charAt(0).toUpperCase());
    const photo = obterFotoUsuario(session.id);
    const avatar = photo
        ? `<span class="user-avatar user-avatar--photo"><img src="${escapeHTML(photo)}" alt=""></span>`
        : `<span class="user-avatar">${initial}</span>`;

    const adminLink = session.perfil === "admin"
        ? `<a href="${URL_DASHBOARD}">Painel administrativo</a>`
        : "";

    box.innerHTML = `
        <button class="user-trigger" type="button" aria-haspopup="true" aria-expanded="false">
            ${avatar}
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
}

function logoutFromMenu() {

    sair(false);
    renderUserMenu();
    refreshCart();      // volta para o carrinho de visitante
    showToast("Você saiu da sua conta.");

    // Páginas que exigem login (ex.: Minha conta) escutam isto.
    document.dispatchEvent(new Event("session:ended"));
}

function toggleUserMenu(trigger) {

    const dropdown = trigger.parentElement.querySelector(".user-dropdown");
    const willOpen = dropdown.hidden;

    dropdown.hidden = !willOpen;
    trigger.setAttribute("aria-expanded", String(willOpen));
}


/* =========================================
   CARD DO PRODUTO
========================================= */

function renderProductCard(product) {

    const id = escapeHTML(product.id);
    const name = escapeHTML(product.nome);
    const image = escapeHTML(getProductImage(product));
    const category = escapeHTML(product.subcategoria || getCategoryName(product.categoria));
    const description = escapeHTML(product.resumo || "");
    const url = `produto.html?id=${encodeURIComponent(product.id)}`;

    const isFavorite = getFavorites().includes(product.id);
    const stock = getStockInfo(product);
    const soldOut = product.estoque <= 0;

    const badgeText = product.controlado ? "Controlado" : product.badge;

    const badge = badgeText
        ? `<span class="product-badge${normalizeText(badgeText) === "novo" ? " product-badge--new" : ""}${product.controlado ? " product-badge--controlled" : ""}">${escapeHTML(badgeText)}</span>`
        : "";

    const rating = resumoAvaliacoes(avaliacoesDoProduto(product.id))[product.id];
    const ratingHTML = rating
        ? `<span class="product-rating">${estrelasHTML(rating.media)} <small>${rating.media.toFixed(1).replace(".", ",")} (${rating.total})</small></span>`
        : "";

    const discount = product.precoOriginal
        ? Math.round((1 - product.preco / product.precoOriginal) * 100)
        : 0;

    const oldPrice = discount
        ? `<span class="product-old-price">${formatMoney(product.precoOriginal)}</span><span class="product-discount">-${discount}%</span>`
        : "";

    return `
        <article class="product-card">

            <div class="product-image">

                ${badge}

                <button
                    class="favorite ${isFavorite ? "favorite--active" : ""}"
                    type="button"
                    data-favorite="${id}"
                    aria-label="Favoritar ${name}"
                    aria-pressed="${isFavorite}"
                >${isFavorite ? "♥" : "♡"}</button>

                <a href="${url}" class="product-link" aria-label="${name}">
                    <img src="${image}" alt="${name}" loading="lazy" decoding="async">
                </a>

            </div>

            <div class="product-info">

                <span class="product-category">${category}</span>

                <h3><a href="${url}">${name}</a></h3>

                ${ratingHTML}

                <p>${description}</p>

                <div class="product-commerce">
                    ${oldPrice}
                    <strong class="product-price">${formatMoney(product.preco)}</strong>
                    <span class="installment">${getInstallmentText(product)}</span>
                    <span class="${stock.className}">${stock.text}</span>
                </div>

                <button
                    class="add-cart"
                    type="button"
                    data-add-cart="${id}"
                    ${soldOut ? "disabled" : ""}
                >${soldOut ? "Produto indisponível" : product.controlado ? "Comprar (exige licença)" : "Adicionar ao carrinho"}</button>

            </div>

        </article>
    `;
}

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

    container.innerHTML = productList.map(renderProductCard).join("");
}


/* =========================================
   PRODUTOS CONTROLADOS
   Só quem tem licença aprovada pela loja pode comprar.
========================================= */

function canBuyControlled(product, notify = false) {

    if (!product.controlado) return true;

    const session = obterSession();

    if (session && licencaAprovada(session.id)) return true;

    if (notify) {
        showToast(
            session
                ? "Produto controlado: envie sua licença em Minha conta e aguarde a aprovação."
                : "Produto controlado: entre na sua conta e envie sua licença para comprar."
        );

        if (!session) {
            setTimeout(() => {
                window.location.href = `${URL_LOGIN}?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
            }, 1800);
        } else {
            setTimeout(() => { window.location.href = `${CONTA_URL}#licenca`; }, 1800);
        }
    }

    return false;
}

function obterSession() {
    return obterSessao();
}


/* =========================================
   CARRINHO — AÇÕES
========================================= */

function addToCart(productId, quantity = 1) {

    const product = getProductById(productId);

    if (!product) {
        showToast("Produto não encontrado.");
        return false;
    }

    if (product.estoque <= 0) {
        showToast("Este produto está indisponível.");
        return false;
    }

    if (!canBuyControlled(product, true)) return false;

    const amount = Math.max(1, Math.floor(Number(quantity)) || 1);
    const cart = getCart();
    const item = cart.find(entry => entry.id === product.id);
    const current = item ? item.quantity : 0;

    if (current >= product.estoque) {
        showToast("Você já tem todas as unidades em estoque no carrinho.");
        return false;
    }

    const next = Math.min(current + amount, product.estoque);

    if (item) item.quantity = next;
    else cart.push({ id: product.id, quantity: next });

    saveCart(cart);
    refreshCart();

    rastrear("carrinho", { produtoId: product.id, depto: product.categoria });

    const limited = current + amount > product.estoque;

    showToast(
        limited
            ? `Adicionamos só ${next - current} — limite do estoque.`
            : `${product.nome} adicionado ao carrinho.`,
        true
    );

    return true;
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

    if (product && next > product.estoque) {
        showToast("Não há mais unidades disponíveis.");
        return;
    }

    item.quantity = next;

    saveCart(cart);
    refreshCart();
}

function removeFromCart(productId) {

    saveCart(getCart().filter(item => item.id !== String(productId)));
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
    document.dispatchEvent(new Event("cart:changed"));
}


/* =========================================
   CARRINHO — EXIBIÇÃO
========================================= */

function updateCartCount() {

    // Mostra o que realmente vale (itens sem estoque não contam).
    // Antes do catálogo carregar, usa o que está salvo.
    const total = productsState === "ready"
        ? getCartDetailed().reduce((sum, item) => sum + item.quantity, 0)
        : getCart().reduce((sum, item) => sum + item.quantity, 0);

    document.querySelectorAll(".cart-count").forEach(element => {
        element.textContent = total;
    });

    const summary = document.getElementById("cartSummaryCount");

    if (summary) summary.textContent = total ? `(${total})` : "";
}

function renderCart() {

    const container = document.getElementById("cartItems");
    const totalElement = document.getElementById("cartTotal");
    const shipping = document.getElementById("cartShipping");

    if (!container || !totalElement) return;

    // Catálogo ainda não chegou: evita mostrar "carrinho vazio" por engano.
    if (productsState === "loading") {
        container.innerHTML = `<p class="cart-loading">Carregando...</p>`;
        return;
    }

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

        const subtotal = product.preco * quantity;

        total += subtotal;

        return `
            <div class="cart-item" data-id="${escapeHTML(product.id)}">

                <img
                    class="cart-item__image"
                    src="${escapeHTML(getProductImage(product))}"
                    alt=""
                >

                <div class="cart-item__details">

                    <a href="produto.html?id=${encodeURIComponent(product.id)}">
                        ${escapeHTML(product.nome)}
                    </a>

                    <span>${formatMoney(product.preco)} cada</span>

                    <div class="quantity-control">
                        <button type="button" data-action="dec" aria-label="Diminuir quantidade">−</button>
                        <span>${quantity}</span>
                        <button type="button" data-action="inc" aria-label="Aumentar quantidade">+</button>
                    </div>

                </div>

                <div class="cart-item__side">
                    <strong>${formatMoney(subtotal)}</strong>
                    <button class="cart-remove" type="button" data-action="remove">Remover</button>
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

let lastFocusedElement = null;

function openCart() {

    const drawer = document.getElementById("cartDrawer");
    const overlay = document.getElementById("cartOverlay");

    if (!drawer) return;

    renderCart();

    lastFocusedElement = document.activeElement;

    drawer.classList.add("cart-drawer--open");
    drawer.setAttribute("aria-hidden", "false");

    if (overlay) overlay.hidden = false;

    document.body.classList.add("no-scroll");

    drawer.querySelector("[data-cart-close]")?.focus();
}

function closeCart() {

    const drawer = document.getElementById("cartDrawer");
    const overlay = document.getElementById("cartOverlay");

    if (!drawer?.classList.contains("cart-drawer--open")) return;

    drawer.classList.remove("cart-drawer--open");
    drawer.setAttribute("aria-hidden", "true");

    if (overlay) overlay.hidden = true;

    document.body.classList.remove("no-scroll");

    // Devolve o foco para quem abriu o carrinho.
    if (lastFocusedElement?.isConnected) lastFocusedElement.focus();

    lastFocusedElement = null;
}


/* =========================================
   FAVORITOS
========================================= */

function toggleFavorite(productId, button) {

    const id = String(productId);
    const favorites = getFavorites();
    const index = favorites.indexOf(id);

    if (index >= 0) favorites.splice(index, 1);
    else favorites.push(id);

    saveFavorites(favorites);

    if (button) {

        const active = index < 0;

        button.classList.toggle("favorite--active", active);
        button.textContent = active ? "♥" : "♡";
        button.setAttribute("aria-pressed", String(active));
    }

    document.dispatchEvent(new Event("favorites:changed"));
}

// Mantém os corações de todos os cards sincronizados (ex.: outra aba).
function syncFavoriteButtons() {

    const favorites = getFavorites();

    document.querySelectorAll("[data-favorite]").forEach(button => {

        const active = favorites.includes(button.dataset.favorite);

        button.classList.toggle("favorite--active", active);
        button.textContent = active ? "♥" : "♡";
        button.setAttribute("aria-pressed", String(active));
    });
}


/* =========================================
   FINALIZAÇÃO DO PEDIDO
========================================= */

function checkout() {

    const items = getCartDetailed();

    if (!items.length) {
        showToast("Seu carrinho está vazio.");
        return;
    }

    // Exige login e volta para a mesma página depois.
    const session = obterSessao();

    if (!session) {

        const next = window.location.pathname + window.location.search;

        window.location.href = `${URL_LOGIN}?next=${encodeURIComponent(next)}`;
        return;
    }

    // Produtos controlados exigem licença aprovada.
    const blocked = items.find(({ product }) => !canBuyControlled(product));

    if (blocked) {
        showToast(`"${blocked.product.nome}" exige licença aprovada. Veja Minha conta > Licença.`);
        return;
    }

    let order;

    try {
        order = criarPedido(
            items.map(({ product, quantity }) => ({
                id: product.id,
                nome: product.nome,
                preco: product.preco,
                quantidade: quantity,
                categoria: product.categoria,
                subcategoria: product.subcategoria
            })),
            { usuario: session, canal: "Site", ...origemAtual() }
        );
    } catch (error) {
        showToast(error.message);
        return;
    }

    decreaseStock(items);

    saveCart([]);
    refreshCart();
    closeCart();

    rastrear("pedido", { pedidoId: order.id, total: order.total });

    showToast(`Pedido ${order.id} registrado! Aguardando confirmação de pagamento.`);

    setTimeout(() => { window.location.href = `${CONTA_URL}#pedidos`; }, 1600);
}

// Baixa o estoque e grava o catálogo (o dashboard passa a ver o novo estoque).
function decreaseStock(items) {

    const list = rawProducts.map(product => ({ ...product }));

    items.forEach(({ product, quantity }) => {
        const target = list.find(entry => String(entry.id) === product.id);

        if (target) target.estoque = Math.max(0, (parseInt(target.estoque, 10) || 0) - quantity);
    });

    salvarStorage(CHAVE_PRODUTOS, list);

    rawProducts = list;
    products = normalizeList(list);
}


/* =========================================
   EVENTOS GLOBAIS (um único listener por tipo)
========================================= */

function setupGlobalEvents() {

    document.addEventListener("click", event => {

        const target = event.target;

        // Produto: carrinho e favoritos (funcionam em qualquer grid).
        const addButton = target.closest("[data-add-cart]");

        if (addButton) {
            addToCart(addButton.dataset.addCart);
            return;
        }

        const favoriteButton = target.closest("[data-favorite]");

        if (favoriteButton) {
            toggleFavorite(favoriteButton.dataset.favorite, favoriteButton);
            return;
        }

        // Carrinho.
        if (target.closest("[data-cart-open]")) openCart();
        if (target.closest("[data-cart-close]")) closeCart();
        if (target.closest("[data-cart-clear]")) clearCart();
        if (target.closest("[data-cart-checkout]")) checkout();

        if (target.id === "cartOverlay") closeCart();

        // Itens do carrinho (+, −, remover).
        const actionButton = target.closest("#cartItems [data-action]");
        const cartItem = target.closest("#cartItems .cart-item");

        if (actionButton && cartItem) {

            const id = cartItem.dataset.id;
            const action = actionButton.dataset.action;

            if (action === "inc") changeCartQuantity(id, 1);
            if (action === "dec") changeCartQuantity(id, -1);
            if (action === "remove") removeFromCart(id);
        }

        // Menu do usuário.
        const userTrigger = target.closest(".user-trigger");

        if (userTrigger) {
            toggleUserMenu(userTrigger);
            return;
        }

        if (target.closest('[data-user-action="logout"]')) {
            logoutFromMenu();
            return;
        }

        closeUserMenu();
    });

    // Esc fecha carrinho e menu do usuário.
    document.addEventListener("keydown", event => {

        if (event.key !== "Escape") return;

        closeCart();
        closeUserMenu();
    });

    // Imagem quebrada → imagem padrão (uma única vez, sem loop).
    document.addEventListener("error", event => {

        const image = event.target;

        if (image.tagName !== "IMG" || image.dataset.fallback) return;

        image.dataset.fallback = "1";
        image.src = COR_FALLBACK_IMAGEM;

    }, true);

    // Sincroniza carrinho, sessão e favoritos entre abas.
    window.addEventListener("storage", event => {

        if (event.key === CHAVE_CARRINHOS) refreshCart();

        if (event.key === CHAVE_SESSAO) {
            renderUserMenu();
            refreshCart();
        }

        if (event.key === FAVORITES_KEY) {
            syncFavoriteButtons();
            document.dispatchEvent(new Event("favorites:changed"));
        }

        // O dashboard alterou o catálogo em outra aba.
        if (event.key === CHAVE_PRODUTOS) window.location.reload();
    });
}


/* =========================================
   TRATAMENTO DE ERRO
========================================= */

function showCatalogError(error) {

    console.error("Erro ao carregar a loja:", error);

    document.querySelectorAll(
        "#featuredGrid, #homeFishingGrid, #homeHuntingGrid, #productGrid, #promoGrid, #bestGrid, #newGrid"
    ).forEach(grid => {

        grid.innerHTML = `
            <div class="catalog-error">
                <h3>Não foi possível carregar os produtos.</h3>
                <p>Abra o site por um servidor local (ex.: Live Server) e confira o caminho do produtos.json.</p>
                <small>${escapeHTML(error.message)}</small>
            </div>
        `;
    });

    const count = document.getElementById("catalogResultCount");

    if (count) count.textContent = "Falha ao carregar o catálogo.";
}


/* =========================================
   VÍDEOS (YouTube com clique para carregar)
========================================= */

function youtubeId(url) {

    const match = String(url || "").match(
        /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/))([\w-]{11})/
    );

    return match ? match[1] : "";
}

// Só carrega o player do YouTube depois do clique (mais rápido e mais privado).
function playYoutube(container, id) {

    container.innerHTML = `
        <iframe
            src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0"
            title="Vídeo"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowfullscreen
            loading="lazy"
        ></iframe>
    `;
}


/* =========================================
   LINKS DE CONTATO (rodapé, botão flutuante)
========================================= */

function setupContactLinks() {

    document.querySelectorAll("[data-link]").forEach(link => {

        const type = link.dataset.link;

        if (type === "contato") link.href = linkContato();
        if (type === "instagram") link.href = LOJA_CONFIG.instagram;
        if (type === "email") link.href = `mailto:${LOJA_CONFIG.email}`;
    });
}


/* =========================================
   INICIALIZAÇÃO
========================================= */

function normalizeList(data) {

    const seen = new Set();

    return data
        .map(normalizeProduct)
        .filter(product => {
            if (!product || seen.has(product.id)) return false;
            seen.add(product.id);
            return true;
        });
}

async function initStore() {

    // Menu e carrinho aparecem mesmo se o catálogo falhar.
    renderUserMenu();
    setupGlobalEvents();
    setupContactLinks();
    updateCartCount();

    try {
        const data = await fetchProducts();

        rawProducts = data;
        products = normalizeList(data);

        productsState = "ready";

        refreshCart();

        settleProducts("ready");

    } catch (error) {

        showCatalogError(error);
        settleProducts("error", error);
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initStore);
} else {
    initStore();
}
