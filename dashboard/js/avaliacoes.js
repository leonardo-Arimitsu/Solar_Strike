"use strict";

/* Moderação de avaliações. */

const $ = id => document.getElementById(id);

let catalogo = [];

function renderAvaliacoes() {

    const corpo = $("tabelaAvaliacoes");
    const lista = carregarAvaliacoes().sort((a, b) => String(b.criadoEm).localeCompare(String(a.criadoEm)));

    corpo.innerHTML = "";

    if (!lista.length) {
        const linha = corpo.insertRow();
        const celula = linha.insertCell();
        celula.colSpan = 6;
        celula.textContent = "Nenhuma avaliação ainda.";
        return;
    }

    lista.forEach(avaliacao => {

        const produto = catalogo.find(p => String(p.id) === avaliacao.produtoId);
        const linha = corpo.insertRow();

        linha.append(
            celulaTexto(produto?.nome || avaliacao.produtoId),
            celulaTexto("★".repeat(avaliacao.nota) + "☆".repeat(5 - avaliacao.nota)),
            celulaTexto(avaliacao.nome),
            celulaTexto(avaliacao.texto || "—"),
            celulaTexto(dataCurta(avaliacao.criadoEm))
        );

        const botao = document.createElement("button");

        botao.type = "button";
        botao.className = "btn-painel btn-painel--perigo";
        botao.textContent = "Excluir";
        botao.dataset.id = avaliacao.id;

        linha.insertCell().appendChild(botao);
    });
}

$("tabelaAvaliacoes").addEventListener("click", evento => {

    const botao = evento.target.closest("button[data-id]");

    if (botao && confirm("Excluir esta avaliação?")) {
        excluirAvaliacao(botao.dataset.id);
        renderAvaliacoes();
    }
});

carregarCatalogoAdmin().then(lista => {
    catalogo = lista;
    renderAvaliacoes();
});
