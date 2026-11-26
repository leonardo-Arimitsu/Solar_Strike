"use strict";

/* =========================================================
   CATÁLOGO COM FILTRO LATERAL (pesca.html e caca.html)

   Depende do loja.js (getAllProducts, renderProductCard,
   whenProductsReady). Cuida só de filtros, ordenação e lista;
   carrinho e favoritos ficam no loja.js.
========================================================= */

(() => {

    const $ = id => document.getElementById(id);

    const searchInput = $("catalogSearch");
    const categoryFilter = $("categoryFilter");
    const minPriceInput = $("minPrice");
    const maxPriceInput = $("maxPrice");
    const brandFilter = $("brandFilter");
    const ratingFilter = $("ratingFilter");
    const inStockFilter = $("inStockFilter");
    const sortProducts = $("sortProducts");

    const productGrid = $("productGrid");
    const resultCount = $("catalogResultCount");
    const emptyMessage = $("catalogEmpty");

    const clearButton = $("clearFilters");
    const emptyClearButton = $("emptyClearFilters");

    // Página sem catálogo: nada a fazer.
    if (!productGrid || !searchInput) return;

    const currentCategory = document.querySelector(".catalog-hero--pesca") ? "pesca" : "caca";

    let allProducts = [];


    /* ---------- Filtros ---------- */

    function readNumber(input) {

        if (input.value.trim() === "") return null;

        const number = Number(input.value);

        return Number.isFinite(number) ? number : null;
    }

    function getFilteredProducts() {

        const search = normalizeText(searchInput.value);
        const category = categoryFilter.value;
        const minPrice = readNumber(minPriceInput);
        const maxPrice = readNumber(maxPriceInput);
        const onlyInStock = inStockFilter.checked;
        const brand = brandFilter.value;
        const minRating = Number(ratingFilter.value) || 0;
        const ratings = resumoAvaliacoes();

        const filtered = allProducts.filter(product => {

            if (category !== "todos" && normalizeText(product.subcategoria) !== normalizeText(category)) {
                return false;
            }

            if (minPrice !== null && product.preco < minPrice) return false;
            if (maxPrice !== null && product.preco > maxPrice) return false;

            if (onlyInStock && product.estoque <= 0) return false;
            if (brand !== "todas" && product.marca !== brand) return false;
            if (minRating && (ratings[product.id]?.media || 0) < minRating) return false;

            if (!search) return true;

            const searchable = normalizeText([
                product.nome,
                product.resumo,
                product.descricao,
                product.subcategoria,
                product.marca
            ].join(" "));

            // Todas as palavras digitadas precisam aparecer (em qualquer ordem).
            return search.split(/\s+/).every(word => searchable.includes(word));
        });

        return sortList(filtered, ratings);
    }

    function sortList(list, ratings) {

        const byName = (a, b) => a.nome.localeCompare(b.nome, "pt-BR");

        switch (sortProducts.value) {

            case "name-asc":
                return list.sort(byName);

            case "price-asc":
                return list.sort((a, b) => a.preco - b.preco || byName(a, b));

            case "rating":
                return list.sort((a, b) =>
                    (ratings[b.id]?.media || 0) - (ratings[a.id]?.media || 0) || byName(a, b)
                );

            case "price-desc":
                return list.sort((a, b) => b.preco - a.preco || byName(a, b));

            default:
                // Relevância: com selo (Novo, Destaque...) primeiro; disponíveis antes dos esgotados.
                return list.sort((a, b) =>
                    (b.badge ? 1 : 0) - (a.badge ? 1 : 0) ||
                    (b.estoque > 0) - (a.estoque > 0) ||
                    byName(a, b)
                );
        }
    }


    /* ---------- Exibição ---------- */

    function applyFilters() {

        const list = getFilteredProducts();
        const total = list.length;

        productGrid.innerHTML = list.map(renderProductCard).join("");

        resultCount.textContent = total === 1
            ? "1 produto encontrado"
            : `${total} produtos encontrados`;

        emptyMessage.hidden = total !== 0;
        productGrid.hidden = total === 0;
    }

    function clearFilters() {

        searchInput.value = "";
        categoryFilter.value = "todos";
        minPriceInput.value = "";
        maxPriceInput.value = "";
        inStockFilter.checked = false;
        brandFilter.value = "todas";
        ratingFilter.value = "0";
        sortProducts.value = "relevance";

        // Remove ?categoria=... da URL.
        const url = new URL(window.location.href);
        url.searchParams.delete("categoria");
        window.history.replaceState({}, "", url);

        applyFilters();
    }

    function selectCategoryFromUrl() {

        const requested = new URLSearchParams(window.location.search).get("categoria");

        if (requested && [...categoryFilter.options].some(option => option.value === requested)) {
            categoryFilter.value = requested;
        }
    }


    /* ---------- Inicialização ---------- */

    const applyFiltersLater = debounce(applyFilters, 120);

    searchInput.addEventListener("input", applyFiltersLater);
    minPriceInput.addEventListener("input", applyFiltersLater);
    maxPriceInput.addEventListener("input", applyFiltersLater);

    categoryFilter.addEventListener("change", applyFilters);
    brandFilter.addEventListener("change", applyFilters);
    ratingFilter.addEventListener("change", applyFilters);
    inStockFilter.addEventListener("change", applyFilters);
    sortProducts.addEventListener("change", applyFilters);

    clearButton?.addEventListener("click", clearFilters);
    emptyClearButton?.addEventListener("click", clearFilters);

    // Registra o que as pessoas procuram (só termos digitados e parados por um instante).
    const trackSearch = debounce(() => {

        const term = normalizeText(searchInput.value);

        if (term.length >= 3) rastrear("busca", { termo: term, depto: currentCategory });

    }, 1000);

    searchInput.addEventListener("input", trackSearch);

    whenProductsReady(products => {

        allProducts = products.filter(product => product.categoria === currentCategory);

        // Marcas existentes neste departamento.
        [...new Set(allProducts.map(product => product.marca).filter(Boolean))]
            .sort((a, b) => a.localeCompare(b, "pt-BR"))
            .forEach(brand => brandFilter.add(new Option(brand, brand)));

        selectCategoryFromUrl();
        applyFilters();

    }, () => {
        // A mensagem de erro já é mostrada pelo loja.js.
    });

})();
