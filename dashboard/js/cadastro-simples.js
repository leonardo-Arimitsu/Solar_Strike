"use strict";

/* =========================================================
   CADASTRO SIMPLES (clientes, fornecedores e funcionários)

   Cada página chama iniciarCadastro() com sua configuração.
   Faz: salvar, editar, excluir e listar — tudo no localStorage.

   Depende de: utils.js
========================================================= */

function voltarDashboard() {
    window.location.href = "/dashboard/html/index.html";
}

/*
   config = {
     chave:    nome no localStorage,
     formId:   id do <form>,
     campos:   ids dos inputs, NA MESMA ORDEM das colunas da tabela,
     nome:     texto usado nas mensagens (ex.: "cliente"),
     migrar:   (opcional) função que ajusta registros antigos
   }
*/
function iniciarCadastro(config) {

    const form = document.getElementById(config.formId);
    const tabela = document.getElementById("tabela");
    const campoId = document.getElementById("id");
    const botaoSalvar = form.querySelector(".btn-salvar");

    const textoSalvar = botaoSalvar.textContent.trim();

    function carregar() {

        const lista = lerStorage(config.chave, []);

        if (!Array.isArray(lista)) return [];

        // Registros antigos não tinham id (impossível editar/excluir).
        return lista.map(item => {
            const registro = config.migrar ? config.migrar(item) : item;
            return { ...registro, id: registro.id || gerarIdUnico() };
        });
    }

    function salvar(lista) {

        if (!salvarStorage(config.chave, lista)) {
            alert("Não foi possível salvar: o armazenamento do navegador está cheio ou bloqueado.");
            return false;
        }

        return true;
    }

    function limpar() {

        form.reset();
        campoId.value = "";
        botaoSalvar.textContent = textoSalvar;
    }

    function renderizar() {

        const lista = carregar();

        tabela.innerHTML = "";

        if (!lista.length) {

            const linha = tabela.insertRow();
            const celula = linha.insertCell();

            celula.colSpan = config.campos.length + 1;
            celula.textContent = `Nenhum ${config.nome} cadastrado.`;
            celula.style.textAlign = "center";

            return;
        }

        lista.forEach(item => {

            const linha = tabela.insertRow();

            config.campos.forEach(campo => {
                linha.insertCell().textContent = item[campo] ?? "";
            });

            const acoes = linha.insertCell();
            acoes.className = "acoes";

            [["Editar", "btn-editar", "editar"], ["Excluir", "btn-excluir", "excluir"]]
                .forEach(([texto, classe, acao]) => {

                    const botao = document.createElement("button");

                    botao.type = "button";
                    botao.className = classe;
                    botao.textContent = texto;
                    botao.dataset.acao = acao;
                    botao.dataset.id = item.id;

                    acoes.appendChild(botao);
                });
        });
    }

    form.addEventListener("submit", evento => {

        evento.preventDefault();

        const dados = {};

        config.campos.forEach(campo => {
            dados[campo] = document.getElementById(campo).value.trim();
        });

        const lista = carregar();
        const indice = lista.findIndex(item => item.id === campoId.value);

        if (indice >= 0) lista[indice] = { ...lista[indice], ...dados };
        else lista.push({ id: gerarIdUnico(), ...dados });

        if (!salvar(lista)) return;

        limpar();
        renderizar();
    });

    tabela.addEventListener("click", evento => {

        const botao = evento.target.closest("button[data-acao]");

        if (!botao) return;

        const lista = carregar();
        const item = lista.find(registro => registro.id === botao.dataset.id);

        if (!item) return;

        if (botao.dataset.acao === "editar") {

            config.campos.forEach(campo => {
                document.getElementById(campo).value = item[campo] ?? "";
            });

            campoId.value = item.id;
            botaoSalvar.textContent = "Atualizar";

            form.scrollIntoView({ behavior: "smooth", block: "start" });
            return;
        }

        if (confirm(`Excluir este ${config.nome}?`)) {

            salvar(lista.filter(registro => registro.id !== item.id));

            if (campoId.value === item.id) limpar();

            renderizar();
        }
    });

    // Os botões "Novo" do HTML chamam limparFormulario().
    window.limparFormulario = limpar;

    renderizar();
}
