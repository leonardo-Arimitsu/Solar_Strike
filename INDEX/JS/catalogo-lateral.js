document.addEventListener("DOMContentLoaded", () => {

    const PRODUCTS_URL = "/INDEX/JS/produtos.json";

    const searchInput = document.getElementById("catalogSearch");
    const categoryFilter = document.getElementById("categoryFilter");
    const minPriceInput = document.getElementById("minPrice");
    const maxPriceInput = document.getElementById("maxPrice");
    const inStockFilter = document.getElementById("inStockFilter");
    const sortProducts = document.getElementById("sortProducts");

    const productGrid = document.getElementById("productGrid");
    const resultCount = document.getElementById("catalogResultCount");
    const emptyMessage = document.getElementById("catalogEmpty");

    const clearButton = document.getElementById("clearFilters");
    const emptyClearButton = document.getElementById("emptyClearFilters");

    if (!productGrid || !searchInput) {
        return;
    }

    const isPesca = document.querySelector(".catalog-hero--pesca") !== null;
    const currentCategory = isPesca ? "pesca" : "caca";

    let allProducts = [];
    let filteredProducts = [];

    /* =====================================
       NORMALIZA TEXTO
    ===================================== */

    function normalizeText(value) {
        return String(value ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
    }

    /* =====================================
       FORMATA MOEDA
    ===================================== */

    function formatPrice(value) {
        return Number(value).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });
    }

    /* =====================================
       FORMATA PARCELAMENTO
    ===================================== */

    function installmentText(product) {
        const installments = Number(product.parcelas);
        const price = Number(product.preco);

        if (!installments || installments <= 1) {
            return "À vista";
        }

        const installmentValue = price / installments;

        return `ou ${installments}x de ${formatPrice(installmentValue)}`;
    }

    /* =====================================
       CRIA CARD DO PRODUTO
    ===================================== */

    function createProductCard(product) {

        const article = document.createElement("article");
        article.className = "product-card";
        article.dataset.category = product.subcategoria;
        article.dataset.price = product.preco;

        const image = product.imagens?.[0] || "";

        const badge = product.badge
            ? `<span class="product-badge">${escapeHTML(product.badge)}</span>`
            : "";

        const categoryName = String(product.subcategoria || "")
            .replaceAll("_", " ")
            .toUpperCase();

        article.innerHTML = `
            <div class="product-image">

                ${badge}

                <button
                    class="favorite"
                    type="button"
                    aria-label="Adicionar aos favoritos"
                >
                    ♡
                </button>

                <a
                    href="produto.html?id=${encodeURIComponent(product.id)}"
                    class="product-link"
                >
                    <img
                        src="${escapeHTML(image)}"
                        alt="${escapeHTML(product.nome)}"
                        loading="lazy"
                    >
                </a>

            </div>

            <div class="product-info">

                <span class="product-category">
                    ${escapeHTML(categoryName)}
                </span>

                <h3>
                    <a href="produto.html?id=${encodeURIComponent(product.id)}">
                        ${escapeHTML(product.nome)}
                    </a>
                </h3>

                <p>${escapeHTML(product.resumo || "")}</p>

                <div class="product-price">
                    ${formatPrice(product.preco)}
                </div>

                <span class="installment">
                    ${installmentText(product)}
                </span>

                <button class="add-cart" type="button">
                    Adicionar ao carrinho
                </button>

            </div>
        `;

        const favoriteButton = article.querySelector(".favorite");
        const cartButton = article.querySelector(".add-cart");

        favoriteButton.addEventListener("click", () => {
            if (typeof window.toggleFavorite === "function") {
                window.toggleFavorite(favoriteButton);
            }
        });

        cartButton.addEventListener("click", () => {
            if (typeof window.addToCart === "function") {
                window.addToCart(product.nome, Number(product.preco));
            } else {
                console.error("A função addToCart não foi encontrada.");
            }
        });

        return article;
    }

    /* =====================================
       PROTEGE TEXTO INSERIDO NO HTML
    ===================================== */

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => {
            const entities = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            };

            return entities[character];
        });
    }

    /* =====================================
       CARREGA PRODUTOS DO JSON
    ===================================== */

    async function loadProducts() {

        try {
            const response = await fetch(PRODUCTS_URL);

            if (!response.ok) {
                throw new Error(`Erro ao carregar produtos: ${response.status}`);
            }

            const products = await response.json();

            allProducts = products.filter(product =>
                normalizeText(product.categoria) === currentCategory
            );

            applyFilters();

        } catch (error) {
            console.error(error);

            productGrid.innerHTML = `
                <p class="catalog-error">
                    Não foi possível carregar os produtos.
                    Verifique o caminho do arquivo produtos.json.
                </p>
            `;

            resultCount.textContent = "Erro ao carregar catálogo.";
        }
    }

    /* =====================================
       APLICA FILTROS
    ===================================== */

    function applyFilters() {

        const search = normalizeText(searchInput.value);
        const category = categoryFilter.value;

        const minPrice = minPriceInput.value === ""
            ? null
            : Number(minPriceInput.value);

        const maxPrice = maxPriceInput.value === ""
            ? null
            : Number(maxPriceInput.value);

        const onlyInStock = inStockFilter.checked;

        filteredProducts = allProducts.filter(product => {

            const searchableText = normalizeText([
                product.nome,
                product.resumo,
                product.descricao,
                product.subcategoria,
                product.categoria
            ].join(" "));

            const matchesSearch = searchableText.includes(search);

            const matchesCategory =
                category === "todos" ||
                normalizeText(product.subcategoria) === normalizeText(category);

            const price = Number(product.preco);

            const matchesMin =
                minPrice === null || price >= minPrice;

            const matchesMax =
                maxPrice === null || price <= maxPrice;

            const matchesStock =
                !onlyInStock || Number(product.estoque) > 0;

            return (
                matchesSearch &&
                matchesCategory &&
                matchesMin &&
                matchesMax &&
                matchesStock
            );
        });

        sortFilteredProducts();
        renderProducts();
    }

    /* =====================================
       ORDENAÇÃO
    ===================================== */

    function sortFilteredProducts() {

        const sort = sortProducts.value;

        switch (sort) {

            case "name-asc":
                filteredProducts.sort((a, b) =>
                    a.nome.localeCompare(b.nome, "pt-BR")
                );
                break;

            case "price-asc":
                filteredProducts.sort((a, b) =>
                    Number(a.preco) - Number(b.preco)
                );
                break;

            case "price-desc":
                filteredProducts.sort((a, b) =>
                    Number(b.preco) - Number(a.preco)
                );
                break;

            default:
                filteredProducts.sort((a, b) => {
                    const badgeA = a.badge ? 1 : 0;
                    const badgeB = b.badge ? 1 : 0;

                    return badgeB - badgeA;
                });
        }
    }

    /* =====================================
       MOSTRA PRODUTOS
    ===================================== */

    function renderProducts() {

        productGrid.innerHTML = "";

        filteredProducts.forEach(product => {
            productGrid.appendChild(createProductCard(product));
        });

        const total = filteredProducts.length;

        resultCount.textContent = total === 1
            ? "1 produto encontrado"
            : `${total} produtos encontrados`;

        emptyMessage.hidden = total !== 0;
        productGrid.hidden = total === 0;
    }

    /* =====================================
       LIMPA FILTROS
    ===================================== */

    function clearFilters() {

        searchInput.value = "";
        categoryFilter.value = "todos";
        minPriceInput.value = "";
        maxPriceInput.value = "";
        inStockFilter.checked = false;
        sortProducts.value = "relevance";

        applyFilters();
    }

    /* =====================================
       EVENTOS
    ===================================== */

    searchInput.addEventListener("input", applyFilters);

    categoryFilter.addEventListener("change", applyFilters);

    minPriceInput.addEventListener("input", applyFilters);

    maxPriceInput.addEventListener("input", applyFilters);

    inStockFilter.addEventListener("change", applyFilters);

    sortProducts.addEventListener("change", applyFilters);

    clearButton.addEventListener("click", clearFilters);

    emptyClearButton.addEventListener("click", clearFilters);

    /* =====================================
       INICIALIZAÇÃO
    ===================================== */

    loadProducts();

});