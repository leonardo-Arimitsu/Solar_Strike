"use strict";

/* =========================================================
   FUNÇÕES COMUNS DAS PÁGINAS DO PAINEL
   (métricas, pedidos, licenças, avaliações)
   Depende de: utils.js, auth.js, dados.js
========================================================= */

const URL_JSON_PRODUTOS = "/shared/data/produtos.json";

function voltarDashboard() {
    window.location.href = "/dashboard/html/index.html";
}

// Catálogo atual: o editado no dashboard ou, se não houver, o JSON de exemplo.
async function carregarCatalogoAdmin() {

    const salvo = lerStorage(CHAVE_PRODUTOS, null);

    if (Array.isArray(salvo)) return salvo;

    try {
        const resposta = await fetch(URL_JSON_PRODUTOS, { cache: "no-cache" });
        const lista = await resposta.json();

        return Array.isArray(lista) ? lista : [];

    } catch (erro) {
        console.warn("Catálogo não carregado:", erro);
        return [];
    }
}

function salvarCatalogoAdmin(lista) {
    return salvarStorage(CHAVE_PRODUTOS, lista);
}

function baixarJSON(nomeArquivo, dados) {

    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: "application/json" });
    const link = document.createElement("a");

    link.href = URL.createObjectURL(blob);
    link.download = nomeArquivo;
    link.click();

    URL.revokeObjectURL(link.href);
}

function dataCurta(iso) {

    const data = new Date(iso);

    return Number.isNaN(data.getTime())
        ? "-"
        : data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function celulaTexto(texto) {
    const td = document.createElement("td");
    td.textContent = texto ?? "";
    return td;
}

// Barras horizontais: itens = [{ rotulo, valor, texto }]
function desenharBarras(container, itens, vazio = "Sem dados no período.") {

    if (!itens.length) {
        container.innerHTML = `<p class="vazio">${escapeHTML(vazio)}</p>`;
        return;
    }

    const maximo = Math.max(...itens.map(item => item.valor), 1);

    container.innerHTML = itens.map(item => `
        <div class="barra-linha">
            <span class="barra-rotulo" title="${escapeHTML(item.rotulo)}">${escapeHTML(item.rotulo)}</span>
            <div class="barra-trilho"><i style="width:${Math.max(3, (item.valor / maximo) * 100)}%"></i></div>
            <span class="barra-valor">${escapeHTML(item.texto ?? item.valor)}</span>
        </div>`).join("");
}

// Colunas verticais (linha do tempo): itens = [{ rotulo, valor }]
function desenharColunas(container, itens, formatar = valor => valor) {

    const maximo = Math.max(...itens.map(item => item.valor), 1);

    container.innerHTML = `
        <div class="colunas">
            ${itens.map(item => `
                <div class="coluna" title="${escapeHTML(item.rotulo)}: ${escapeHTML(formatar(item.valor))}">
                    <i style="height:${(item.valor / maximo) * 100}%"></i>
                </div>`).join("")}
        </div>
        <div class="colunas-eixo"><span>${escapeHTML(itens[0]?.rotulo ?? "")}</span><span>${escapeHTML(itens.at(-1)?.rotulo ?? "")}</span></div>`;
}

function contarPor(lista, chave) {

    const contagem = new Map();

    lista.forEach(item => {
        const valor = typeof chave === "function" ? chave(item) : item[chave];

        if (valor === undefined || valor === null || valor === "") return;

        contagem.set(valor, (contagem.get(valor) || 0) + 1);
    });

    return contagem;
}

function topN(mapa, n = 5) {
    return [...mapa.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}
