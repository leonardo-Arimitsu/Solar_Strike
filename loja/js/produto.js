"use strict";

/* =========================================================
   PÁGINA DE PRODUTO
   Lê ?id=... da URL e monta a página com os dados do catálogo.

   Depende do loja.js (mesmo carrinho, favoritos e login das
   demais páginas).
========================================================= */

(() => {

    const SUBCATEGORY_NAMES = {
        varas: "Varas",
        carretilhas: "Carretilhas",
        molinetes: "Molinetes",
        iscas: "Iscas",
        linhas: "Linhas",
        acessorios: "Acessórios",
        vestuario: "Vestuário",
        optica: "Óptica",
        mochilas: "Mochilas",
        equipamentos: "Equipamentos"
    };

    const root = document.getElementById("productRoot");

    let currentProduct = null;
    let quantity = 1;

    function subcategoryName(product) {
        return SUBCATEGORY_NAMES[product.subcategoria] || product.subcategoria || "";
    }


    /* ---------- Renderização ---------- */

    function renderNotFound(message) {

        root.innerHTML = `
            <div class="not-found">
                <h1>Produto não encontrado</h1>
                <p>${escapeHTML(message || "O link pode estar errado ou o produto saiu do catálogo.")}</p>
                <a href="index.html" class="btn btn--gold">Voltar para a loja</a>
            </div>
        `;
    }

    function renderProduct(product) {

        const isHunting = product.categoria === "caca";
        const categoryLink = isHunting ? "caca.html" : "pesca.html";
        const categoryName = getCategoryName(product.categoria);
        const subName = escapeHTML(subcategoryName(product));
        const name = escapeHTML(product.nome);
        const soldOut = product.estoque <= 0;
        const stockText = soldOut
            ? "Indisponível no momento"
            : product.estoque <= LOW_STOCK_LIMIT
                ? `Restam apenas ${product.estoque} ${product.estoque === 1 ? "unidade" : "unidades"}`
                : "Em estoque";
        const isFavorite = getFavorites().includes(product.id);

        document.title = `${product.nome} | Homo Habilis Caça & Pesca`;

        document.getElementById(isHunting ? "navCaca" : "navPesca")
            ?.classList.add("nav__link--active");

        const images = product.imagens.length ? product.imagens : [COR_FALLBACK_IMAGEM];

        const thumbs = images.length > 1
            ? `<div class="gallery__thumbs">
                ${images.map((src, index) => `
                    <button
                        type="button"
                        class="gallery__thumb ${index === 0 ? "gallery__thumb--active" : ""}"
                        data-image-index="${index}"
                        aria-label="Ver imagem ${index + 1}"
                    >
                        <img src="${escapeHTML(src)}" alt="">
                    </button>`).join("")}
               </div>`
            : "";

        const specs = Object.entries(product.especificacoes)
            .map(([key, value]) => `<tr><th>${escapeHTML(key)}</th><td>${escapeHTML(value)}</td></tr>`)
            .join("");

        const brand = product.marca
            ? `<span class="detail__brand">Marca: ${escapeHTML(product.marca)}</span>`
            : "";

        root.innerHTML = `
            <nav class="breadcrumb" aria-label="Você está em">
                <a href="index.html">Início</a> <span>/</span>
                <a href="${categoryLink}">${escapeHTML(categoryName)}</a> <span>/</span>
                <a href="${categoryLink}?categoria=${encodeURIComponent(product.subcategoria)}">${subName}</a> <span>/</span>
                <span aria-current="page">${name}</span>
            </nav>

            <div class="product-detail">

                <div class="gallery">
                    <div class="gallery__main">
                        ${product.badge ? `<span class="product-badge">${escapeHTML(product.badge)}</span>` : ""}
                        <img id="galleryImage" src="${escapeHTML(images[0])}" alt="${name}">
                    </div>
                    ${thumbs}
                </div>

                <div class="detail">

                    <span class="detail__category">${subName}</span>
                    <h1 class="detail__title">${name}</h1>
                    ${brand}
                    <a class="detail__rating" href="#reviews" id="detailRating"></a>
                    <p class="detail__summary">${escapeHTML(product.resumo || "")}</p>

                    ${product.precoOriginal ? `<div class="detail__old-price">${formatMoney(product.precoOriginal)} <span class="product-discount">-${Math.round((1 - product.preco / product.precoOriginal) * 100)}%</span></div>` : ""}
                    <div class="detail__price">${formatMoney(product.preco)}</div>
                    ${product.parcelas > 1
                        ? `<span class="detail__installment">ou ${product.parcelas}x de ${formatMoney(product.preco / product.parcelas)} sem juros</span>`
                        : ""}
                    <span class="detail__stock ${soldOut ? "detail__stock--out" : product.estoque <= LOW_STOCK_LIMIT ? "detail__stock--low" : ""}">
                        ${stockText}
                    </span>

                    ${controlledNoticeHTML(product)}

                    <div class="detail__actions">

                        <div class="qty">
                            <button type="button" data-qty="-1" aria-label="Diminuir quantidade" ${soldOut ? "disabled" : ""}>−</button>
                            <span id="qtyValue" aria-live="polite">1</span>
                            <button type="button" data-qty="1" aria-label="Aumentar quantidade" ${soldOut ? "disabled" : ""}>+</button>
                        </div>

                        <button class="add-cart" type="button" data-detail-add ${soldOut ? "disabled" : ""}>
                            ${soldOut ? "Produto indisponível" : "Adicionar ao carrinho"}
                        </button>

                        <button
                            type="button"
                            class="detail__favorite ${isFavorite ? "favorite--active" : ""}"
                            data-favorite="${escapeHTML(product.id)}"
                            aria-label="Favoritar"
                            aria-pressed="${isFavorite}"
                        >${isFavorite ? "♥" : "♡"}</button>

                    </div>

                    <div class="detail__feedback" id="detailFeedback" role="status"></div>

                    <a class="detail__contact" target="_blank" rel="noopener"
                       href="${escapeHTML(linkContato(`Olá! Tenho interesse em: ${product.nome}`))}">
                        Tirar dúvidas com a loja
                    </a>

                    ${videoHTML(product)}

                    ${product.descricao ? `
                    <div class="detail__block">
                        <h2>Sobre o produto</h2>
                        <p>${escapeHTML(product.descricao)}</p>
                    </div>` : ""}

                    ${specs ? `
                    <div class="detail__block">
                        <h2>Especificações</h2>
                        <table class="specs">${specs}</table>
                    </div>` : ""}

                </div>
            </div>

            <section class="reviews" id="reviews"></section>
        `;

        renderReviews();
    }

    function renderRelated(product) {

        // Mesma categoria primeiro; dentro dela, mesma subcategoria primeiro.
        const related = getAllProducts()
            .filter(item => item.id !== product.id && item.categoria === product.categoria)
            .sort((a, b) =>
                (b.subcategoria === product.subcategoria) - (a.subcategoria === product.subcategoria)
            )
            .slice(0, 4);

        if (!related.length) return;

        document.getElementById("relatedGrid").innerHTML = related.map(renderProductCard).join("");
        document.getElementById("relatedSection").hidden = false;
    }


    /* ---------- Controlado, vídeo ---------- */

    function controlledNoticeHTML(product) {

        if (!product.controlado) return "";

        const session = obterSessao();
        const approved = session && licencaAprovada(session.id);
        const license = session ? obterUsuarioPorId(session.id)?.licenca : null;

        let status;

        if (approved) status = "Sua licença está aprovada. Você pode comprar este produto.";
        else if (!session) status = `Para comprar, <a href="${URL_LOGIN}?next=${encodeURIComponent(location.pathname + location.search)}">entre na sua conta</a> e envie sua licença.`;
        else if (license?.status === "pendente") status = "Sua licença está em análise pela loja.";
        else if (license?.status === "recusada") status = `Sua licença foi recusada${license.motivo ? `: ${escapeHTML(license.motivo)}` : ""}. <a href="${CONTA_URL}#licenca">Enviar novamente</a>.`;
        else status = `<a href="${CONTA_URL}#licenca">Envie sua licença</a> em Minha conta para liberar a compra.`;

        return `
            <div class="controlled-notice" role="note">
                <strong>⚠ Produto controlado</strong>
                <p>${escapeHTML(product.requisitos || "A venda depende de comprovação de licença ou autorização, conforme a legislação aplicável.")}</p>
                <p>${status}</p>
            </div>`;
    }

    function videoHTML(product) {

        if (!product.video) return "";

        const id = youtubeId(product.video);

        if (id) {
            return `
                <div class="detail__block">
                    <h2>Vídeo</h2>
                    <div class="video-card__media video-card__media--detail" data-youtube="${escapeHTML(id)}">
                        <img src="https://i.ytimg.com/vi/${escapeHTML(id)}/hqdefault.jpg" alt="" loading="lazy">
                        <button type="button" class="video-play" aria-label="Assistir vídeo">▶</button>
                    </div>
                </div>`;
        }

        if (/\.(mp4|webm)(\?.*)?$/i.test(product.video)) {
            return `
                <div class="detail__block">
                    <h2>Vídeo</h2>
                    <video controls preload="none" src="${escapeHTML(product.video)}" style="width:100%;border-radius:12px"></video>
                </div>`;
        }

        return "";
    }


    /* ---------- Avaliações ---------- */

    let chosenRating = 0;

    function renderReviews() {

        const box = document.getElementById("reviews");
        const reviews = avaliacoesDoProduto(currentProduct.id);
        const summary = resumoAvaliacoes(reviews)[currentProduct.id];
        const session = obterSessao();
        const mine = session ? reviews.find(review => review.usuarioId === session.id) : null;

        // Nota no topo da página.
        const top = document.getElementById("detailRating");

        if (top) {
            top.innerHTML = summary
                ? `${estrelasHTML(summary.media)} <small>${summary.media.toFixed(1).replace(".", ",")} · ${summary.total} ${summary.total === 1 ? "avaliação" : "avaliações"}</small>`
                : `<small>Seja o primeiro a avaliar</small>`;
        }

        const bars = [5, 4, 3, 2, 1].map(stars => {
            const count = reviews.filter(review => review.nota === stars).length;
            const percent = reviews.length ? (count / reviews.length) * 100 : 0;

            return `<div class="rating-bar"><span>${stars}★</span><div><i style="width:${percent}%"></i></div><small>${count}</small></div>`;
        }).join("");

        const list = reviews.map(review => `
            <article class="review-item">
                <header>
                    ${estrelasHTML(review.nota)}
                    <strong>${escapeHTML(review.nome)}</strong>
                    ${usuarioComprouProduto(review.usuarioId, currentProduct.id) ? `<span class="verified">Compra verificada</span>` : ""}
                    <time>${new Date(review.criadoEm).toLocaleDateString("pt-BR")}</time>
                </header>
                ${review.texto ? `<p>${escapeHTML(review.texto)}</p>` : ""}
                ${session && review.usuarioId === session.id ? `<button type="button" class="review-delete" data-review-delete="${escapeHTML(review.id)}">Excluir minha avaliação</button>` : ""}
            </article>`).join("");

        const form = session
            ? `
                <form class="review-form" id="reviewForm" novalidate>
                    <h3>${mine ? "Editar sua avaliação" : "Avalie este produto"}</h3>
                    <div class="star-input" role="radiogroup" aria-label="Sua nota">
                        ${[1, 2, 3, 4, 5].map(n => `<button type="button" role="radio" aria-checked="false" data-star="${n}" aria-label="${n} estrela${n > 1 ? "s" : ""}">★</button>`).join("")}
                    </div>
                    <textarea id="reviewText" maxlength="600" placeholder="Conte como foi usar o produto (opcional)">${escapeHTML(mine?.texto || "")}</textarea>
                    <p class="form-message" id="reviewMessage" role="status" hidden></p>
                    <button type="submit" class="add-cart">${mine ? "Atualizar avaliação" : "Enviar avaliação"}</button>
                </form>`
            : `<p class="review-login">Para avaliar, <a href="${URL_LOGIN}?next=${encodeURIComponent(location.pathname + location.search)}">entre na sua conta</a>.</p>`;

        box.innerHTML = `
            <h2>Avaliações dos clientes</h2>
            <div class="reviews__layout">
                <div class="reviews__summary">
                    ${summary
                        ? `<div class="reviews__average"><strong>${summary.media.toFixed(1).replace(".", ",")}</strong>${estrelasHTML(summary.media)}<small>${summary.total} ${summary.total === 1 ? "avaliação" : "avaliações"}</small></div>${bars}`
                        : `<p>Este produto ainda não tem avaliações.</p>`}
                    ${form}
                </div>
                <div class="reviews__list">${list || ""}</div>
            </div>`;

        chosenRating = mine?.nota || 0;
        paintStars();
    }

    function paintStars() {

        document.querySelectorAll(".star-input [data-star]").forEach(button => {
            const active = Number(button.dataset.star) <= chosenRating;

            button.classList.toggle("is-on", active);
            button.setAttribute("aria-checked", String(Number(button.dataset.star) === chosenRating));
        });
    }

    function submitReview(form) {

        const message = document.getElementById("reviewMessage");

        try {
            salvarAvaliacao({
                produtoId: currentProduct.id,
                nota: chosenRating,
                texto: document.getElementById("reviewText").value
            });

            renderReviews();
            showToast("Avaliação enviada. Obrigado!");

        } catch (error) {
            message.textContent = error.message;
            message.hidden = false;
            message.className = "form-message form-message--error";
        }
    }


    /* ---------- Interações ---------- */

    function changeQuantity(delta) {

        const max = Math.max(1, currentProduct.estoque);

        quantity = Math.min(max, Math.max(1, quantity + delta));

        document.getElementById("qtyValue").textContent = quantity;
    }

    function addFromPage() {

        const feedback = document.getElementById("detailFeedback");

        if (addToCart(currentProduct.id, quantity)) {
            feedback.textContent = `${quantity}x ${currentProduct.nome} adicionado ao carrinho.`;
        } else {
            feedback.textContent = "";
        }
    }

    function changeImage(index) {

        const src = currentProduct.imagens[index];

        if (!src) return;

        const main = document.getElementById("galleryImage");

        main.src = src;
        main.removeAttribute("data-fallback");

        document.querySelectorAll(".gallery__thumb").forEach((thumb, i) => {
            thumb.classList.toggle("gallery__thumb--active", i === index);
        });
    }

    root.addEventListener("click", event => {

        const thumb = event.target.closest("[data-image-index]");
        const qtyButton = event.target.closest("[data-qty]");

        if (thumb) changeImage(Number(thumb.dataset.imageIndex));
        if (qtyButton) changeQuantity(Number(qtyButton.dataset.qty));
        if (event.target.closest("[data-detail-add]")) addFromPage();

        const star = event.target.closest("[data-star]");

        if (star) {
            chosenRating = Number(star.dataset.star);
            paintStars();
        }

        const remove = event.target.closest("[data-review-delete]");

        if (remove && confirm("Excluir sua avaliação?")) {
            excluirAvaliacao(remove.dataset.reviewDelete);
            renderReviews();
        }

        const media = event.target.closest("[data-youtube]");

        if (media) playYoutube(media, media.dataset.youtube);
    });

    root.addEventListener("submit", event => {

        if (event.target.id !== "reviewForm") return;

        event.preventDefault();
        submitReview(event.target);
    });


    /* ---------- Inicialização ---------- */

    whenProductsReady(() => {

        const id = new URLSearchParams(window.location.search).get("id");

        currentProduct = id ? getProductById(id) : null;

        if (!currentProduct) {
            renderNotFound();
            return;
        }

        renderProduct(currentProduct);
        renderRelated(currentProduct);

        rastrear("produto", { produtoId: currentProduct.id, depto: currentProduct.categoria });

    }, error => {

        renderNotFound(
            "Não foi possível carregar o catálogo. Se você abriu o arquivo direto no navegador, use um servidor local (ex.: Live Server)."
        );
    });

})();
