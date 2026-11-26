"use strict";

/* Página inicial do dashboard: navegação e saída. */

function abrirClientes() { window.location.href = "clientes.html"; }
function abrirFornecedores() { window.location.href = "fornecedores.html"; }
function abrirFuncionarios() { window.location.href = "funcionarios.html"; }
function abrirProdutos() { window.location.href = "produtos.html"; }
function abrirManutencao() { window.location.href = "manutencao.html"; }

document.getElementById("BTN_sair")?.addEventListener("click", () => sair());

// Cumprimenta o administrador logado.
const sessaoAdmin = obterSessao();
const boasVindas = document.querySelector(".BEMVINDO");

if (sessaoAdmin && boasVindas) {
    boasVindas.textContent = `Seja bem-vindo, ${sessaoAdmin.nome.split(" ")[0]}!`;
}
