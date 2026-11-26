"use strict";

/* =========================================================
   UTILITÁRIOS COMPARTILHADOS
   Carregado em todas as páginas (loja, login e dashboard).
   Não depende de nenhum outro script.
========================================================= */

// Chave onde o dashboard guarda o catálogo editado (a loja lê daqui).
const CHAVE_PRODUTOS = "produtos";

const COR_FALLBACK_IMAGEM =
    "data:image/svg+xml;utf8," + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">' +
        '<rect width="600" height="600" fill="#e9ede7"/>' +
        '<text x="300" y="310" font-family="Arial,sans-serif" font-size="28" fill="#7a8579" text-anchor="middle">Sem imagem</text>' +
        '</svg>'
    );


/* ---------- Texto ---------- */

function escapeHTML(value = "") {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

function normalizeText(value = "") {
    return String(value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function formatMoney(value) {
    const number = Number(value);

    return (Number.isFinite(number) ? number : 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}


/* ---------- Armazenamento seguro ---------- */

// Lê um JSON do localStorage sem nunca lançar erro.
function lerStorage(key, fallback, storage = localStorage) {
    try {
        const raw = storage.getItem(key);
        if (raw === null) return fallback;

        const value = JSON.parse(raw);
        return value ?? fallback;

    } catch (error) {
        console.warn(`Não foi possível ler "${key}" do armazenamento.`, error);
        return fallback;
    }
}

// Grava um JSON. Devolve false se o navegador recusar (ex.: cota cheia).
function salvarStorage(key, value, storage = localStorage) {
    try {
        storage.setItem(key, JSON.stringify(value));
        return true;

    } catch (error) {
        console.error(`Não foi possível gravar "${key}".`, error);
        return false;
    }
}


/* ---------- Identificadores e tokens ---------- */

function gerarIdUnico() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

// Token aleatório criptograficamente seguro (hex).
function gerarToken(bytes = 16) {
    const array = new Uint8Array(bytes);
    crypto.getRandomValues(array);

    return Array.from(array, byte => byte.toString(16).padStart(2, "0")).join("");
}


/* ---------- Funções de apoio ---------- */

function debounce(callback, delay = 150) {
    let timer;

    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => callback(...args), delay);
    };
}
