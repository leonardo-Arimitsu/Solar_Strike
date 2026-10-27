/* =========================================================
   PÁGINA DE PRODUTO
   Lê ?id=... da URL, busca em produtos.json e monta a página
========================================================= */

const PRODUCTS_URL = "../JS/produtos.json";
const CART_KEY = "hh_cart";
const FAV_KEY = "hh_favorites";

let produtoAtual = null;
let quantidade = 1;


/* ---------- Utilidades ---------- */

const brl = (valor) =>
    valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const lerStorage = (chave, padrao) => {
    try {
        return JSON.parse(localStorage.getItem(chave)) ?? padrao;
    } catch {
        return padrao;
    }
};

const salvarStorage = (chave, valor) =>
    localStorage.setItem(chave, JSON.stringify(valor));

const nomeCategoria = {
    pesca: "Pesca",
    caca: "Caça"
};

const nomeSubcategoria = {
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


/* ---------- Carregamento ---------- */

async function carregarProdutos() {
    fetch(PRODUCTS_URL)
        .then(response => {
            if (!response.ok) {
            throw new Error(`Erro ao carregar o JSON: ${response.status} - ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            console.log("Produtos carregados com sucesso:", data);
        })
        .catch(error => {
            console.error("Falha no fetch:", error);
        });
    const resposta = await fetch(PRODUCTS_URL);
    if (!resposta.ok) throw new Error("Não foi possível carregar os produtos.");
    return resposta.json();
}

async function iniciar() {
    atualizarContadorCarrinho();

    const id = new URLSearchParams(window.location.search).get("id");

    try {
        const produtos = await carregarProdutos();
        const produto = produtos.find((p) => p.id === id);

        if (!produto) {
            mostrarNaoEncontrado();
            return;
        }

        produtoAtual = produto;
        renderizarProduto(produto);
        renderizarRelacionados(produto, produtos);
    } catch (erro) {
        console.error(erro);
        mostrarNaoEncontrado(
            "Não foi possível carregar o catálogo. Se você abriu o arquivo direto no navegador, rode um servidor local (ex.: Live Server)."
        );
    }
}


/* ---------- Renderização ---------- */

function renderizarProduto(p) {
    document.title = `${p.nome} | Homo Habilis Caça & Pesca`;

    const linkCategoria = p.categoria === "caca" ? "caca.html" : "pesca.html";

    document
        .getElementById(p.categoria === "caca" ? "navCaca" : "navPesca")
        .classList.add("nav__link--active");

    const parcela = p.parcelas > 1
        ? `ou ${p.parcelas}x de ${brl(p.preco / p.parcelas)} sem juros`
        : "";

    const estoqueClasse =
        p.estoque === 0 ? "detail__stock--out"
            : p.estoque <= 5 ? "detail__stock--low"
                : "";

    const estoqueTexto =
        p.estoque === 0 ? "Indisponível no momento"
            : p.estoque <= 5 ? `Restam apenas ${p.estoque} unidades`
                : "Em estoque";

    const especificacoes = Object.entries(p.especificacoes || {})
        .map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`)
        .join("");

    const miniaturas = p.imagens.length > 1
        ? `<div class="gallery__thumbs">
            ${p.imagens.map((src, i) => `
                <button class="gallery__thumb ${i === 0 ? "gallery__thumb--active" : ""}"
                        onclick="trocarImagem(${i}, this)"
                        aria-label="Ver imagem ${i + 1}">
                    <img src="${src}" alt="">
                </button>`).join("")}
           </div>`
        : "";

    const favoritado = lerStorage(FAV_KEY, []).includes(p.id);

    document.getElementById("productRoot").innerHTML = `
        <nav class="breadcrumb" aria-label="Você está em">
            <a href="index.html">Início</a> <span>/</span>
            <a href="${linkCategoria}">${nomeCategoria[p.categoria]}</a> <span>/</span>
            <a href="${linkCategoria}">${nomeSubcategoria[p.subcategoria] || p.subcategoria}</a> <span>/</span>
            <span aria-current="page">${p.nome}</span>
        </nav>

        <div class="product-detail">

            <div class="gallery">
                <div class="gallery__main">
                    ${p.badge ? `<span class="product-badge">${p.badge}</span>` : ""}
                    <img id="galleryImage" src="${p.imagens[0]}" alt="${p.nome}">
                </div>
                ${miniaturas}
            </div>

            <div class="detail">

                <span class="detail__category">${nomeSubcategoria[p.subcategoria] || p.subcategoria}</span>
                <h1 class="detail__title">${p.nome}</h1>
                <p class="detail__summary">${p.resumo}</p>

                <div class="detail__price">${brl(p.preco)}</div>
                ${parcela ? `<span class="detail__installment">${parcela}</span>` : ""}
                <span class="detail__stock ${estoqueClasse}">${estoqueTexto}</span>

                <div class="detail__actions">
                    <div class="qty">
                        <button onclick="alterarQuantidade(-1)" aria-label="Diminuir quantidade">−</button>
                        <span id="qtyValue">1</span>
                        <button onclick="alterarQuantidade(1)" aria-label="Aumentar quantidade">+</button>
                    </div>

                    <button class="add-cart" onclick="adicionarDaPagina()" ${p.estoque === 0 ? "disabled" : ""}>
                        Adicionar ao carrinho
                    </button>

                    <button class="detail__favorite ${favoritado ? "favorite--active" : ""}"
                            onclick="favoritarDaPagina(this)"
                            aria-label="Favoritar">
                        ${favoritado ? "♥" : "♡"}
                    </button>
                </div>

                <div class="detail__feedback" id="detailFeedback" role="status"></div>

                <div class="detail__block">
                    <h2>Sobre o produto</h2>
                    <p>${p.descricao}</p>
                </div>

                ${especificacoes ? `
                <div class="detail__block">
                    <h2>Especificações</h2>
                    <table class="specs">${especificacoes}</table>
                </div>` : ""}

            </div>
        </div>
    `;
}

function renderizarRelacionados(atual, todos) {
    const relacionados = todos
        .filter((p) => p.id !== atual.id)
        .sort((a, b) =>
            (b.subcategoria === atual.subcategoria) - (a.subcategoria === atual.subcategoria) ||
            (b.categoria === atual.categoria) - (a.categoria === atual.categoria)
        )
        .slice(0, 4);

    if (!relacionados.length) return;

    document.getElementById("relatedGrid").innerHTML =
        relacionados.map(cardHTML).join("");
    document.getElementById("relatedSection").hidden = false;
}

/* Card de produto (mesmo HTML dos seus cards, agora com link).
   Você pode reutilizar esta função nas páginas de listagem. */
function cardHTML(p) {
    const url = `produto.html?id=${encodeURIComponent(p.id)}`;
    return `
        <article class="product-card">
            <div class="product-image">
                ${p.badge ? `<span class="product-badge">${p.badge}</span>` : ""}
                <a href="${url}" class="product-link" aria-label="${p.nome}">
                    <img src="${p.imagens[0]}" alt="${p.nome}">
                </a>
            </div>
            <div class="product-info">
                <span class="product-category">${(nomeSubcategoria[p.subcategoria] || "").toUpperCase()}</span>
                <h3><a href="${url}">${p.nome}</a></h3>
                <p>${p.resumo}</p>
                <div class="product-price">${brl(p.preco)}</div>
                <a href="${url}" class="add-cart" style="display:grid;place-items:center;margin-top:14px">
                    Ver produto
                </a>
            </div>
        </article>`;
}

function mostrarNaoEncontrado(mensagem) {
    document.getElementById("productRoot").innerHTML = `
        <div class="not-found">
            <h1>Produto não encontrado</h1>
            <p>${mensagem || "O link pode estar errado ou o produto saiu do catálogo."}</p>
            <a href="index.html" class="btn btn--gold">Voltar para a loja</a>
        </div>`;
}


/* ---------- Interações da página ---------- */

function trocarImagem(indice, botao) {
    document.getElementById("galleryImage").src = produtoAtual.imagens[indice];
    document.querySelectorAll(".gallery__thumb")
        .forEach((b) => b.classList.remove("gallery__thumb--active"));
    botao.classList.add("gallery__thumb--active");
}

function alterarQuantidade(delta) {
    const max = produtoAtual.estoque || 1;
    quantidade = Math.min(max, Math.max(1, quantidade + delta));
    document.getElementById("qtyValue").textContent = quantidade;
}

function adicionarDaPagina() {
    addToCart(produtoAtual.nome, produtoAtual.preco, quantidade, produtoAtual.id);
    document.getElementById("detailFeedback").textContent =
        `${quantidade}x ${produtoAtual.nome} adicionado ao carrinho.`;
}

function favoritarDaPagina(botao) {
    let favoritos = lerStorage(FAV_KEY, []);
    const ativo = favoritos.includes(produtoAtual.id);

    favoritos = ativo
        ? favoritos.filter((id) => id !== produtoAtual.id)
        : [...favoritos, produtoAtual.id];

    salvarStorage(FAV_KEY, favoritos);
    botao.classList.toggle("favorite--active", !ativo);
    botao.textContent = ativo ? "♡" : "♥";
}


/* ---------- Carrinho (persistido em localStorage) ----------
   Ideal: mover este bloco para um cart.js e usar nas 4 páginas,
   assim o carrinho é o mesmo em toda a loja. */

function addToCart(nome, preco, qtd = 1, id = nome) {
    const carrinho = lerStorage(CART_KEY, []);
    const item = carrinho.find((i) => i.id === id);

    if (item) item.qtd += qtd;
    else carrinho.push({ id, nome, preco, qtd });

    salvarStorage(CART_KEY, carrinho);
    atualizarContadorCarrinho();
    renderizarCarrinho();
}

function removerDoCarrinho(id) {
    salvarStorage(CART_KEY, lerStorage(CART_KEY, []).filter((i) => i.id !== id));
    atualizarContadorCarrinho();
    renderizarCarrinho();
}

function atualizarContadorCarrinho() {
    const total = lerStorage(CART_KEY, []).reduce((s, i) => s + i.qtd, 0);
    document.querySelectorAll(".cart-count").forEach((el) => (el.textContent = total));
}

function renderizarCarrinho() {
    const carrinho = lerStorage(CART_KEY, []);
    const lista = document.getElementById("cartItems");

    lista.innerHTML = carrinho.length
        ? carrinho.map((i) => `
            <div class="cart-item">
                <div>
                    <strong>${i.nome}</strong>
                    <span>${i.qtd}x ${brl(i.preco)}</span>
                </div>
                <button onclick="removerDoCarrinho('${i.id}')" aria-label="Remover ${i.nome}">×</button>
            </div>`).join("")
        : "<p>Seu carrinho está vazio.</p>";

    document.getElementById("cartTotal").textContent =
        brl(carrinho.reduce((s, i) => s + i.preco * i.qtd, 0));
}

function openCart() {
    renderizarCarrinho();
    document.getElementById("cartModal").classList.add("cart-modal--active");
}

function closeCart() {
    document.getElementById("cartModal").classList.remove("cart-modal--active");
}

document.getElementById("cartModal").addEventListener("click", (e) => {
    if (e.target.id === "cartModal") closeCart();
});

iniciar();