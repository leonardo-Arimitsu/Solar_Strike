"use strict";

/* Aprovação de licenças para produtos controlados. */

const $ = id => document.getElementById(id);

function renderLicencas() {

    const filtro = $("filtroLicenca").value;
    const corpo = $("tabelaLicencas");

    const lista = carregarUsuarios()
        .filter(u => u.licenca && (!filtro || u.licenca.status === filtro))
        .sort((a, b) => String(b.licenca.enviadoEm).localeCompare(String(a.licenca.enviadoEm)));

    corpo.innerHTML = "";

    if (!lista.length) {
        const linha = corpo.insertRow();
        const celula = linha.insertCell();
        celula.colSpan = 7;
        celula.textContent = "Nenhuma licença nesta lista.";
        return;
    }

    lista.forEach(usuario => {

        const l = usuario.licenca;
        const linha = corpo.insertRow();

        linha.append(
            celulaTexto(`${usuario.nome} · ${usuario.email}`),
            celulaTexto(l.tipo),
            celulaTexto(l.numero),
            celulaTexto(l.validade ? dataCurta(l.validade + "T12:00:00") : "—"),
            celulaTexto(dataCurta(l.enviadoEm)),
            celulaTexto(l.status + (l.motivo ? ` (${l.motivo})` : ""))
        );

        const acoes = linha.insertCell();

        [["Aprovar", "aprovada", "btn-painel"], ["Recusar", "recusada", "btn-painel btn-painel--perigo"]].forEach(([texto, status, classe]) => {

            const botao = document.createElement("button");

            botao.type = "button";
            botao.className = classe;
            botao.textContent = texto;
            botao.dataset.id = usuario.id;
            botao.dataset.status = status;

            acoes.append(botao, " ");
        });
    });
}

$("tabelaLicencas").addEventListener("click", evento => {

    const botao = evento.target.closest("button[data-status]");

    if (!botao) return;

    let motivo = "";

    if (botao.dataset.status === "recusada") {
        motivo = prompt("Motivo da recusa (aparece para o cliente):") ?? null;

        if (motivo === null) return;
    }

    const usuarios = carregarUsuarios();
    const usuario = usuarios.find(u => u.id === botao.dataset.id);

    if (!usuario?.licenca) return;

    usuario.licenca.status = botao.dataset.status;
    usuario.licenca.motivo = motivo.trim();
    usuario.licenca.analisadoEm = new Date().toISOString();

    salvarUsuarios(usuarios);
    renderLicencas();
});

$("filtroLicenca").addEventListener("change", renderLicencas);

renderLicencas();
