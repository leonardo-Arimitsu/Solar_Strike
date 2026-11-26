"use strict";

/* Pedidos, vendas manuais e carrinhos por cliente. */

const $ = id => document.getElementById(id);

let catalogo = [];

function atualizarCatalogoEmMemoria() {
    return carregarCatalogoAdmin().then(lista => {
        catalogo = lista;

        $("vendaProduto").innerHTML = lista
            .filter(p => (parseInt(p.estoque, 10) || 0) > 0 && p.status !== "descontinuado")
            .map(p => `<option value="${escapeHTML(p.id)}">${escapeHTML(p.nome)} (${parseInt(p.estoque, 10)} em estoque)</option>`)
            .join("");
    });
}

// Mexe no estoque gravado do catálogo (delta negativo = baixa, positivo = devolução).
function ajustarEstoque(itens, sinal) {

    const lista = catalogo.map(p => ({ ...p }));

    itens.forEach(item => {
        const alvo = lista.find(p => String(p.id) === String(item.id));

        if (alvo) alvo.estoque = Math.max(0, (parseInt(alvo.estoque, 10) || 0) + sinal * item.quantidade);
    });

    if (salvarCatalogoAdmin(lista)) catalogo = lista;
}

function renderPedidos() {

    const filtro = $("filtroStatus").value;

    const lista = carregarPedidos()
        .filter(p => !filtro || p.status === filtro)
        .sort((a, b) => String(b.criadoEm).localeCompare(String(a.criadoEm)));

    const corpo = $("tabelaPedidos");
    corpo.innerHTML = "";

    if (!lista.length) {
        const linha = corpo.insertRow();
        const celula = linha.insertCell();
        celula.colSpan = 7;
        celula.textContent = "Nenhum pedido.";
        return;
    }

    lista.forEach(pedido => {

        const linha = corpo.insertRow();

        linha.append(
            celulaTexto(pedido.id + (pedido.demo ? " (demo)" : "")),
            celulaTexto(dataCurta(pedido.criadoEm)),
            celulaTexto(`${pedido.nome}${pedido.email ? " · " + pedido.email : ""}`),
            celulaTexto(`${pedido.canal} / ${pedido.origem}${pedido.campanha ? " / " + pedido.campanha : ""}`),
            celulaTexto(pedido.itens.map(i => `${i.quantidade}× ${i.nome}`).join(", ")),
            celulaTexto(formatMoney(pedido.total))
        );

        const tdStatus = linha.insertCell();
        const select = document.createElement("select");

        select.dataset.pedido = pedido.id;

        STATUS_PEDIDO.forEach(status => select.add(new Option(status, status, false, status === pedido.status)));

        tdStatus.appendChild(select);
    });
}

function renderCarrinhos() {

    const corpo = $("tabelaCarrinhos");
    const carrinhos = carregarCarrinhos();
    const entradas = Object.entries(carrinhos);

    corpo.innerHTML = "";

    if (!entradas.length) {
        const linha = corpo.insertRow();
        const celula = linha.insertCell();
        celula.colSpan = 4;
        celula.textContent = "Nenhum carrinho salvo.";
        return;
    }

    entradas.forEach(([dono, carrinho]) => {

        const itens = carrinho.itens.map(item => {
            const produto = catalogo.find(p => String(p.id) === item.id);
            return { nome: produto?.nome || item.id, quantidade: item.quantity, preco: Number(produto?.preco) || 0 };
        });

        const linha = corpo.insertRow();

        linha.append(
            celulaTexto(dono === "visitante" ? "Visitante (sem login)" : `${carrinho.nome || "Cliente"} · ${carrinho.email || dono}`),
            celulaTexto(itens.map(i => `${i.quantidade}× ${i.nome}`).join(", ")),
            celulaTexto(formatMoney(itens.reduce((s, i) => s + i.preco * i.quantidade, 0))),
            celulaTexto(dataCurta(carrinho.atualizadoEm))
        );
    });
}

$("tabelaPedidos").addEventListener("change", evento => {

    const select = evento.target.closest("select[data-pedido]");

    if (!select) return;

    const lista = carregarPedidos();
    const pedido = lista.find(p => p.id === select.dataset.pedido);

    if (!pedido) return;

    const antes = pedido.status;
    pedido.status = select.value;

    // Cancelar devolve o estoque (uma única vez).
    if (pedido.status === "Cancelado" && antes !== "Cancelado" && !pedido.estoqueDevolvido) {
        ajustarEstoque(pedido.itens, +1);
        pedido.estoqueDevolvido = true;
    }

    salvarPedidos(lista);
});

$("filtroStatus").addEventListener("change", renderPedidos);

$("formVenda").addEventListener("submit", evento => {

    evento.preventDefault();

    const produto = catalogo.find(p => String(p.id) === $("vendaProduto").value);
    const quantidade = Math.max(1, parseInt($("vendaQtd").value, 10) || 1);
    const mensagem = $("msgVenda");

    if (!produto) return;

    if (quantidade > (parseInt(produto.estoque, 10) || 0)) {
        mensagem.textContent = "Quantidade maior que o estoque.";
        return;
    }

    const pedido = criarPedido(
        [{
            id: String(produto.id),
            nome: produto.nome,
            preco: Number(produto.preco) || 0,
            quantidade,
            categoria: produto.categoria,
            subcategoria: produto.subcategoria
        }],
        {
            nomeCliente: $("vendaCliente").value.trim(),
            canal: $("vendaCanal").value,
            origem: $("vendaOrigem").value,
            status: "Pago"
        }
    );

    ajustarEstoque(pedido.itens, -1);

    mensagem.textContent = `Venda ${pedido.id} registrada.`;
    evento.target.reset();

    atualizarCatalogoEmMemoria().then(() => {
        renderPedidos();
        renderCarrinhos();
    });
});

$("baixarPedidos").addEventListener("click", () => baixarJSON("pedidos.json", carregarPedidos()));
$("baixarCarrinhos").addEventListener("click", () => baixarJSON("carrinhos.json", carregarCarrinhos()));

STATUS_PEDIDO.forEach(status => $("filtroStatus").add(new Option(status, status)));

atualizarCatalogoEmMemoria().then(() => {
    renderPedidos();
    renderCarrinhos();
});
