/*
   CATÁLOGO COM FILTRO LATERAL (pesca.html e caca.html)

   Depende do loja.js, que fornece:
   - products (lista carregada do produtos.json)
   - renderProductCard (card do produto, com carrinho e favoritos)
   - eventos "products:loaded" e "products:error"

   Este arquivo só cuida dos filtros, da ordenação e da lista.
   O carrinho, o login e os favoritos ficam no loja.js.
*/

document.addEventListener("DOMContentLoaded", () => {

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

    function normalize(value) {
        return String(value ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
    }


    /* =====================================
       DADOS (vêm do loja.js)
    ===================================== */

    function loadFromStore() {

        allProducts = products.filter(product =>
            normalize(product.categoria) === currentCategory
        );

        // Abre já com a categoria do link (ex.: pesca.html?categoria=varas).
        const requested = new URLSearchParams(window.location.search).get("categoria");

        if (
            requested &&
            [...categoryFilter.options].some(option => option.value === requested)
        ) {
            categoryFilter.value = requested;
        }

        applyFilters();
    }

    function showLoadError() {

        productGrid.innerHTML = `
            <p class="catalog-error">
                Não foi possível carregar os produtos.
                Verifique o caminho do arquivo produtos.json.
            </p>
        `;

        resultCount.textContent = "Erro ao carregar catálogo.";
    }


    /* =====================================
       APLICA FILTROS
    ===================================== */

    function applyFilters() {

        const search = normalize(searchInput.value);
        const category = categoryFilter.value;

        const minPrice = minPriceInput.value === ""
            ? null
            : Number(minPriceInput.value);

        const maxPrice = maxPriceInput.value === ""
            ? null
            : Number(maxPriceInput.value);

        const onlyInStock = inStockFilter.checked;

        filteredProducts = allProducts.filter(product => {

            const searchableText = normalize([
                product.nome,
                product.resumo,
                product.descricao,
                product.subcategoria,
                product.categoria
            ].join(" "));

            const matchesSearch = searchableText.includes(search);

            const matchesCategory =
                category === "todos" ||
                normalize(product.subcategoria) === normalize(category);

            const price = Number(product.preco);

            const matchesMin = minPrice === null || price >= minPrice;
            const matchesMax = maxPrice === null || price <= maxPrice;

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

        switch (sortProducts.value) {

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
                // Relevância: produtos com selo (Novo, Oferta...) primeiro.
                filteredProducts.sort((a, b) =>
                    (b.badge ? 1 : 0) - (a.badge ? 1 : 0)
                );
        }
    }


    /* =====================================
       MOSTRA PRODUTOS
    ===================================== */

    function renderProducts() {

        productGrid.innerHTML = filteredProducts
            .map(product => renderProductCard(product))
            .join("");

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

        // Remove ?categoria=... da URL.
        const url = new URL(window.location.href);
        url.searchParams.delete("categoria");
        window.history.replaceState({}, "", url);

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
       Espera o loja.js terminar de carregar o produtos.json.
    ===================================== */

    document.addEventListener("products:loaded", loadFromStore);
    document.addEventListener("products:error", showLoadError);

    // Caso os produtos já tenham sido carregados antes deste ponto.
    if (typeof products !== "undefined" && products.length) {
        loadFromStore();
    }

});