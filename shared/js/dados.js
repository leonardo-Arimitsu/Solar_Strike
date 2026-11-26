"use strict";

/* =========================================================
   DADOS DA LOJA (compartilhado)
   Carrinho por cliente, pedidos, avaliações e licença.
   Tudo no localStorage (simulação sem back-end).

   Depende de: utils.js e auth.js
========================================================= */

const LOJA_CONFIG = {
    nome: "Homo Habilis Caça & Pesca",
    // Número com DDI+DDD, só dígitos (ex.: 5511999998888). Vazio = usa e-mail.
    whatsapp: "",
    email: "contato@homohabilis.com",
    instagram: "https://www.instagram.com/",
    facebook: "https://www.facebook.com/",
    youtube: "https://www.youtube.com/"
};

const CHAVE_CARRINHOS = "carrinhos";
const CHAVE_PEDIDOS = "pedidos";
const CHAVE_AVALIACOES = "avaliacoes";
const CHAVE_EVENTOS = "eventos";
const CHAVE_META = "metaVendas";

const STATUS_PEDIDO = ["Aguardando pagamento", "Pago", "Enviado", "Entregue", "Cancelado"];
// Status que contam como venda concluída nas métricas.
const STATUS_VENDA = ["Pago", "Enviado", "Entregue"];

const TIPOS_LICENCA = [
    "Certificado de Registro (CR)",
    "Autorização de compra",
    "Outro documento exigido"
];


/* =========================================
   CARRINHO — um JSON por cliente
   localStorage["carrinhos"] = {
     "<idDoUsuario>": { nome, email, itens: [{id, quantity}], atualizadoEm },
     "visitante":     { itens: [...], atualizadoEm }
   }
========================================= */

function idDonoCarrinho() {
    return obterSessao()?.id || "visitante";
}

function carregarCarrinhos() {
    const dados = lerStorage(CHAVE_CARRINHOS, {});
    return dados && typeof dados === "object" && !Array.isArray(dados) ? dados : {};
}

function normalizarItensCarrinho(itens) {
    return (Array.isArray(itens) ? itens : [])
        .map(item => ({
            id: String(item?.id ?? ""),
            quantity: Math.floor(Number(item?.quantity)) || 0
        }))
        .filter(item => item.id && item.quantity > 0);
}

function obterCarrinho(dono = idDonoCarrinho()) {
    return normalizarItensCarrinho(carregarCarrinhos()[dono]?.itens);
}

function salvarCarrinho(itens, dono = idDonoCarrinho()) {

    const todos = carregarCarrinhos();
    const limpos = normalizarItensCarrinho(itens);

    if (!limpos.length) {
        delete todos[dono];
    } else {
        const sessao = obterSessao();

        todos[dono] = {
            ...(dono !== "visitante" && sessao?.id === dono
                ? { nome: sessao.nome, email: sessao.email }
                : todos[dono] || {}),
            itens: limpos,
            atualizadoEm: new Date().toISOString()
        };
    }

    return salvarStorage(CHAVE_CARRINHOS, todos);
}

// Ao entrar na conta, o que estava no carrinho de visitante passa para o cliente.
function mesclarCarrinhoVisitante(usuarioId) {

    const visitante = obterCarrinho("visitante");

    if (!visitante.length) return;

    const doUsuario = obterCarrinho(usuarioId);

    visitante.forEach(item => {
        const existente = doUsuario.find(i => i.id === item.id);

        if (existente) existente.quantity += item.quantity;
        else doUsuario.push({ ...item });
    });

    const todos = carregarCarrinhos();
    delete todos.visitante;
    salvarStorage(CHAVE_CARRINHOS, todos);

    salvarCarrinho(doUsuario, usuarioId);
}


/* =========================================
   USUÁRIO: FOTO E LICENÇA
========================================= */

function obterUsuarioPorId(id) {
    return carregarUsuarios().find(u => u.id === id) || null;
}

function obterFotoUsuario(id) {
    return obterUsuarioPorId(id)?.foto || "";
}

function licencaAprovada(usuarioId) {

    const licenca = obterUsuarioPorId(usuarioId)?.licenca;

    if (!licenca || licenca.status !== "aprovada") return false;

    // Validade vencida invalida a aprovação.
    return !licenca.validade || licenca.validade >= new Date().toISOString().slice(0, 10);
}


/* =========================================
   PEDIDOS
========================================= */

function carregarPedidos() {
    const lista = lerStorage(CHAVE_PEDIDOS, []);
    return Array.isArray(lista) ? lista : [];
}

function salvarPedidos(lista) {
    return salvarStorage(CHAVE_PEDIDOS, lista);
}

function gerarNumeroPedido() {
    return "HH-" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 4).toUpperCase();
}

/*
   itens: [{ id, nome, preco, quantidade, categoria, subcategoria }]
   extras: { canal, origem, campanha, status, usuario, demo, criadoEm }
*/
function criarPedido(itens, extras = {}) {

    const usuario = extras.usuario || null;

    const pedido = {
        id: gerarNumeroPedido(),
        usuarioId: usuario?.id || null,
        nome: usuario?.nome || extras.nomeCliente || "Cliente balcão",
        email: usuario?.email || extras.emailCliente || "",
        canal: extras.canal || "Site",
        origem: extras.origem || "Site",
        campanha: extras.campanha || "",
        status: extras.status || "Aguardando pagamento",
        itens,
        total: itens.reduce((soma, item) => soma + item.preco * item.quantidade, 0),
        criadoEm: extras.criadoEm || new Date().toISOString(),
        ...(extras.demo ? { demo: true } : {})
    };

    const lista = carregarPedidos();
    lista.push(pedido);

    if (!salvarPedidos(lista)) throw new Error("Não foi possível salvar o pedido neste navegador.");

    return pedido;
}

function pedidoContaComoVenda(pedido) {
    return STATUS_VENDA.includes(pedido.status);
}

function usuarioComprouProduto(usuarioId, produtoId) {
    return carregarPedidos().some(p =>
        p.usuarioId === usuarioId && pedidoContaComoVenda(p) &&
        p.itens.some(item => item.id === produtoId)
    );
}


/* =========================================
   AVALIAÇÕES (1 a 5 estrelas)
========================================= */

function carregarAvaliacoes() {
    const lista = lerStorage(CHAVE_AVALIACOES, []);
    return Array.isArray(lista) ? lista : [];
}

function avaliacoesDoProduto(produtoId) {
    return carregarAvaliacoes()
        .filter(a => a.produtoId === produtoId)
        .sort((a, b) => String(b.criadoEm).localeCompare(String(a.criadoEm)));
}

// Uma avaliação por cliente em cada produto (reenviar atualiza a anterior).
function salvarAvaliacao({ produtoId, nota, texto }) {

    const sessao = obterSessao();

    if (!sessao) throw new Error("Entre na sua conta para avaliar.");

    nota = Math.round(Number(nota));
    texto = String(texto ?? "").trim().slice(0, 600);

    if (!(nota >= 1 && nota <= 5)) throw new Error("Escolha uma nota de 1 a 5 estrelas.");

    const lista = carregarAvaliacoes();
    const existente = lista.find(a => a.produtoId === produtoId && a.usuarioId === sessao.id);

    if (existente) {
        Object.assign(existente, { nota, texto, nome: sessao.nome, criadoEm: new Date().toISOString() });
    } else {
        lista.push({
            id: gerarIdUnico(),
            produtoId,
            usuarioId: sessao.id,
            nome: sessao.nome,
            nota,
            texto,
            criadoEm: new Date().toISOString()
        });
    }

    if (!salvarStorage(CHAVE_AVALIACOES, lista)) throw new Error("Não foi possível salvar a avaliação.");
}

function excluirAvaliacao(id) {
    salvarStorage(CHAVE_AVALIACOES, carregarAvaliacoes().filter(a => a.id !== id));
}

// { media, total } de um produto, ou de todos de uma vez: { [produtoId]: {media,total} }
function resumoAvaliacoes(lista = carregarAvaliacoes()) {

    const grupos = {};

    lista.forEach(a => {
        (grupos[a.produtoId] ||= []).push(Number(a.nota) || 0);
    });

    const resumo = {};

    Object.entries(grupos).forEach(([id, notas]) => {
        resumo[id] = {
            total: notas.length,
            media: notas.reduce((s, n) => s + n, 0) / notas.length
        };
    });

    return resumo;
}

function estrelasHTML(media) {

    const cheias = Math.round(Number(media) || 0);

    return `<span class="stars" aria-hidden="true">${"★".repeat(cheias)}${"☆".repeat(5 - cheias)}</span>`;
}


/* =========================================
   CONTATO
========================================= */

function linkContato(mensagem = "Olá! Vim pelo site da Homo Habilis.") {

    const numero = String(LOJA_CONFIG.whatsapp).replace(/\D/g, "");

    return numero
        ? `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`
        : `mailto:${LOJA_CONFIG.email}?subject=${encodeURIComponent("Contato pelo site")}&body=${encodeURIComponent(mensagem)}`;
}
