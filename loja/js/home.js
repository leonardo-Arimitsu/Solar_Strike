"use strict";

/* =========================================================
   PÁGINA INICIAL — vitrines e seções
   Depende do loja.js (whenProductsReady, renderProducts…).
========================================================= */

(() => {

    const $ = id => document.getElementById(id);

    // Só roda na home.
    if (!$("featuredGrid")) return;


    /* ---------- Vitrines de produtos ---------- */

    function fillShowcase(sectionId, gridId, list) {

        const grid = $(gridId);
        const section = $(sectionId);

        if (!list.length) return;

        renderProducts(grid, list.slice(0, 4));

        if (section) section.hidden = false;
    }

    function bestSellers(products) {

        const sold = {};

        carregarPedidos().filter(pedidoContaComoVenda).forEach(order => {
            order.itens.forEach(item => {
                sold[item.id] = (sold[item.id] || 0) + item.quantidade;
            });
        });

        const ranked = products
            .filter(product => sold[product.id])
            .sort((a, b) => sold[b.id] - sold[a.id]);

        // Sem vendas ainda: usa o selo "Mais vendido" do cadastro.
        return ranked.length
            ? ranked
            : products.filter(product => normalizeText(product.badge) === "mais vendido");
    }

    function newest(products) {

        const marked = products.filter(product => normalizeText(product.badge) === "novo");

        return marked.length ? marked : products.slice(-4).reverse();
    }

    function renderShowcases(products) {

        renderProducts($("featuredGrid"), products.filter(p => p.badge && !p.controlado).slice(0, 4));
        renderProducts($("homeFishingGrid"), products.filter(p => p.categoria === "pesca").slice(0, 4));
        renderProducts($("homeHuntingGrid"), products.filter(p => p.categoria === "caca" && !p.controlado).slice(0, 4));

        fillShowcase("secOfertas", "promoGrid", products.filter(p => p.precoOriginal));
        fillShowcase("secMaisVendidos", "bestGrid", bestSellers(products));
        fillShowcase("secNovidades", "newGrid", newest(products));
    }


    /* ---------- Vídeos ---------- */

    function renderVideos(videos) {

        const grid = $("videoGrid");

        grid.innerHTML = videos.map(video => {

            const id = youtubeId(video.youtube);
            const title = escapeHTML(video.titulo);
            const description = escapeHTML(video.descricao || "");

            if (!id) {
                return `
                    <article class="video-card video-card--soon">
                        <div class="video-card__media"><span>Em breve</span></div>
                        <div class="video-card__body"><h3>${title}</h3><p>${description}</p></div>
                    </article>`;
            }

            return `
                <article class="video-card">
                    <div class="video-card__media" data-youtube="${escapeHTML(id)}">
                        <img src="https://i.ytimg.com/vi/${escapeHTML(id)}/hqdefault.jpg" alt="" loading="lazy">
                        <button type="button" class="video-play" aria-label="Assistir: ${title}">▶</button>
                    </div>
                    <div class="video-card__body"><h3>${title}</h3><p>${description}</p></div>
                </article>`;
        }).join("");
    }

    async function loadVideos() {

        try {
            const response = await fetch("/shared/data/videos.json", { cache: "no-cache" });
            const videos = await response.json();

            renderVideos(Array.isArray(videos) ? videos : []);

        } catch (error) {
            console.warn("Vídeos não carregados:", error);
            $("videos").hidden = true;
        }
    }


    /* ---------- Avaliações de clientes ---------- */

    function renderReviews(products) {

        const grid = $("homeReviews");

        const reviews = carregarAvaliacoes()
            .filter(review => review.nota >= 4 && review.texto)
            .sort((a, b) => String(b.criadoEm).localeCompare(String(a.criadoEm)))
            .slice(0, 3);

        if (!reviews.length) {
            grid.innerHTML = `<p class="review-empty">Ainda não há avaliações. Compre e seja o primeiro a avaliar!</p>`;
            return;
        }

        grid.innerHTML = reviews.map(review => {

            const product = products.find(item => item.id === review.produtoId);

            return `
                <article class="review-card">
                    ${estrelasHTML(review.nota)}
                    <p>“${escapeHTML(review.texto)}”</p>
                    <footer>
                        <strong>${escapeHTML(review.nome)}</strong>
                        ${product ? `<a href="produto.html?id=${encodeURIComponent(product.id)}">${escapeHTML(product.nome)}</a>` : ""}
                    </footer>
                </article>`;
        }).join("");
    }


    /* ---------- Inicialização ---------- */

    $("videoGrid").addEventListener("click", event => {

        const media = event.target.closest("[data-youtube]");

        if (media) playYoutube(media, media.dataset.youtube);
    });

    loadVideos();

    whenProductsReady(products => {
        renderShowcases(products);
        renderReviews(products);
    });

})();
