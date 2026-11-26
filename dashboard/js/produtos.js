"use strict";

/* =========================================================
   CADASTRO DE PRODUTOS (dashboard)
   O catálogo editado aqui é gravado em localStorage e é
   exatamente o que a loja exibe. Na primeira abertura ele é
   copiado de /shared/data/produtos.json.

   Depende de: utils.js (CHAVE_PRODUTOS, formatMoney, ...)
========================================================= */

const CHAVE = CHAVE_PRODUTOS;
const URL_JSON = "/shared/data/produtos.json";
const MAX_IMAGENS = 10;

let produtos = [];
let imagensAtuais = [null]; // um item por slot: base64/URL ou null (vazio)

function voltarDashboard() {
    window.location.href = "index.html";
}

/* ---------- Banco (JSON + localStorage) ---------- */

async function carregarProdutos() {
    const salvo = lerStorage(CHAVE, null);
    if (Array.isArray(salvo)) {
        produtos = salvo;
        return;
    }
    // primeira vez: usa o produtos.json como seed
    try {
        const resposta = await fetch(URL_JSON, { cache: "no-cache" });
        if (!resposta.ok) throw new Error("Status " + resposta.status);
        const lista = await resposta.json();
        produtos = Array.isArray(lista) ? lista : [];
        salvarLocal();
    } catch (erro) {
        console.error("Não foi possível ler o produtos.json", erro);
        produtos = [];
    }
}

function salvarLocal() {
    if (salvarStorage(CHAVE, produtos)) return true;
    alert("Espaço do navegador cheio. Use menos/menores imagens ou exporte o JSON.");
    return false;
}

function exportarJSON() {
    const blob = new Blob([JSON.stringify(produtos, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "produtos.json";
    link.click();
    URL.revokeObjectURL(link.href);
}

/* ---------- Utilidades ---------- */

function gerarId(nome) {
    const base = nome
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
    let id = base;
    let n = 2;
    while (produtos.some(p => p.id === id)) {
        id = base + "-" + n++;
    }
    return id;
}

function lerEspecificacoes(texto) {
    const specs = {};
    texto.split(/\r?\n/).forEach(linha => {
        const i = linha.indexOf(":");
        if (i > 0) {
            const chave = linha.slice(0, i).trim();
            const valor = linha.slice(i + 1).trim();
            if (chave && valor) specs[chave] = valor;
        }
    });
    return specs;
}

function especificacoesParaTexto(specs) {
    return Object.entries(specs || {}).map(([k, v]) => k + ": " + v).join("\n");
}

function formatarPreco(valor) {
    return formatMoney(valor);
}

/* ---------- Imagens ---------- */

// Redimensiona para no máximo 800px e converte para JPEG (economiza espaço)
function processarImagem(arquivo) {
    return new Promise((resolve, reject) => {
        const leitor = new FileReader();
        leitor.onerror = reject;
        leitor.onload = () => {
            const img = new Image();
            img.onerror = reject;
            img.onload = () => {
                const max = 800;
                const escala = Math.min(1, max / Math.max(img.width, img.height));
                const canvas = document.createElement("canvas");
                canvas.width = Math.round(img.width * escala);
                canvas.height = Math.round(img.height * escala);
                canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL("image/jpeg", 0.8));
            };
            img.src = leitor.result;
        };
        leitor.readAsDataURL(arquivo);
    });
}

// Lê o campo "Quantidade de imagens" e ajusta o número de slots
function ajustarQuantidade() {
    const campo = document.getElementById("qtdImagens");
    let n = parseInt(campo.value, 10);
    if (isNaN(n) || n < 1) n = 1;
    if (n > MAX_IMAGENS) n = MAX_IMAGENS;
    campo.value = n;

    while (imagensAtuais.length < n) imagensAtuais.push(null);
    imagensAtuais.length = n;

    mostrarSlots();
}

// Desenha um quadrado para cada imagem do produto
function mostrarSlots() {
    const area = document.getElementById("slots");
    area.innerHTML = "";

    imagensAtuais.forEach((src, indice) => {
        const slot = document.createElement("div");
        slot.className = "slot";

        const caixa = document.createElement("div");
        caixa.className = "slot-caixa";

        if (src) {
            caixa.classList.add("slot-cheio");

            const img = document.createElement("img");
            img.src = src;

            const remover = document.createElement("button");
            remover.type = "button";
            remover.className = "slot-remover";
            remover.title = "Remover imagem";
            remover.textContent = "×";
            remover.onclick = () => {
                imagensAtuais[indice] = null;
                mostrarSlots();
            };

            caixa.append(img, remover);
        } else {
            const rotulo = document.createElement("label");
            rotulo.className = "slot-vazio";
            rotulo.style.width = "100%";
            rotulo.style.height = "100%";

            const mais = document.createElement("span");
            mais.className = "mais";
            mais.textContent = "+";

            const texto = document.createElement("span");
            texto.className = "texto";
            texto.textContent = "Escolher imagem";

            const entrada = document.createElement("input");
            entrada.type = "file";
            entrada.accept = "image/*";
            entrada.addEventListener("change", async function () {
                const arquivo = this.files[0];
                if (!arquivo) return;
                try {
                    imagensAtuais[indice] = await processarImagem(arquivo);
                } catch (e) {
                    alert("Não foi possível ler a imagem: " + arquivo.name);
                }
                mostrarSlots();
            });

            rotulo.append(mais, texto, entrada);
            caixa.appendChild(rotulo);
        }

        const legenda = document.createElement("div");
        legenda.className = "slot-legenda";
        legenda.textContent = indice === 0 ? "Imagem 1 (principal)" : "Imagem " + (indice + 1);

        slot.append(caixa, legenda);
        area.appendChild(slot);
    });

    const preenchidas = imagensAtuais.filter(Boolean).length;
    document.getElementById("contadorImagens").textContent =
        preenchidas + " de " + imagensAtuais.length + " imagens adicionadas";
}

document.getElementById("qtdImagens").addEventListener("change", ajustarQuantidade);

/* ---------- Salvar / editar / excluir ---------- */

function salvarDados() {
    const id = document.getElementById("id").value;
    const nome = document.getElementById("nome").value.trim();

    const dados = {
        nome: nome,
        categoria: document.getElementById("categoria").value,
        subcategoria: document.getElementById("subcategoria").value.trim().toLowerCase(),
        badge: document.getElementById("badge").value,
        resumo: document.getElementById("resumo").value.trim(),
        descricao: document.getElementById("descricao").value.trim(),
        preco: parseFloat(document.getElementById("preco").value),
        parcelas: parseInt(document.getElementById("parcelas").value, 10),
        estoque: parseInt(document.getElementById("estoque").value, 10),
        imagens: imagensAtuais.filter(Boolean), // só os slots preenchidos
        especificacoes: lerEspecificacoes(document.getElementById("especificacoes").value),
        marca: document.getElementById("marca").value.trim(),
        fornecedor: document.getElementById("fornecedor_produto").value.trim(),
        status: document.getElementById("status").value,
        precoOriginal: parseFloat(document.getElementById("precoOriginal").value) || 0,
        video: document.getElementById("video").value.trim(),
        controlado: document.getElementById("controlado").checked,
        requisitos: document.getElementById("requisitos").value.trim()
    };

    if (!nome || !dados.categoria || !dados.subcategoria || !dados.status) {
        alert("Preencha nome, categoria, subcategoria e status.");
        return;
    }

    if (dados.precoOriginal && dados.precoOriginal <= dados.preco) {
        alert("O preço original precisa ser maior que o preço atual (ou deixe vazio).");
        return;
    }

    if (!Number.isFinite(dados.preco) || dados.preco < 0) {
        alert("Informe um preço válido.");
        return;
    }

    if (!Number.isInteger(dados.estoque) || dados.estoque < 0) {
        alert("Informe um estoque válido (0 ou mais).");
        return;
    }

    if (!Number.isInteger(dados.parcelas) || dados.parcelas < 1) {
        dados.parcelas = 1;
    }

    const anterior = produtos.slice();
    const i = id ? produtos.findIndex(p => p.id === id) : -1;

    if (i >= 0) {
        produtos[i] = { ...produtos[i], ...dados };
    } else {
        produtos.push({ id: gerarId(nome), ...dados });
    }

    if (!salvarLocal()) {
        produtos = anterior; // não deixa a tela diferente do que foi salvo
        return;
    }

    limparFormulario();
    mostrarDados();
}

function editarProduto(id) {
    const p = produtos.find(prod => prod.id === id);
    if (!p) return;

    document.getElementById("id").value = p.id;
    document.getElementById("nome").value = p.nome || "";
    document.getElementById("resumo").value = p.resumo || "";
    document.getElementById("descricao").value = p.descricao || "";
    document.getElementById("categoria").value = p.categoria || "";
    document.getElementById("subcategoria").value = p.subcategoria || "";
    document.getElementById("marca").value = p.marca || "";
    document.getElementById("fornecedor_produto").value = p.fornecedor || "";
    document.getElementById("preco").value = p.preco;
    document.getElementById("parcelas").value = p.parcelas || 1;
    document.getElementById("estoque").value = p.estoque;
    document.getElementById("badge").value = p.badge || "";
    document.getElementById("status").value = p.status || "disponivel";
    document.getElementById("precoOriginal").value = p.precoOriginal || "";
    document.getElementById("video").value = p.video || "";
    document.getElementById("controlado").checked = !!p.controlado;
    document.getElementById("requisitos").value = p.requisitos || "";
    document.getElementById("especificacoes").value = especificacoesParaTexto(p.especificacoes);

    imagensAtuais = [...(p.imagens || [])];
    if (imagensAtuais.length === 0) imagensAtuais = [null];
    document.getElementById("qtdImagens").value = imagensAtuais.length;
    ajustarQuantidade();

    const textarea = document.getElementById("descricao");
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function excluirProduto(id) {
    if (!confirm("Excluir este produto?")) return;
    const anterior = produtos;
    produtos = produtos.filter(p => p.id !== id);
    if (!salvarLocal()) produtos = anterior;
    mostrarDados();
}

function limparFormulario() {
    document.getElementById("formProduto").reset();
    document.getElementById("id").value = "";
    document.getElementById("qtdImagens").value = 1;
    imagensAtuais = [null];
    mostrarSlots();
}

/* ---------- Tabela ---------- */

function celula(texto) {
    const td = document.createElement("td");
    td.textContent = texto;
    return td;
}

function mostrarDados() {
    const tabela = document.getElementById("tabela");
    tabela.innerHTML = "";

    // atualiza sugestões de subcategoria
    const lista = document.getElementById("lista-sub");
    lista.innerHTML = "";
    [...new Set(produtos.map(p => p.subcategoria).filter(Boolean))].forEach(sub => {
        const opt = document.createElement("option");
        opt.value = sub;
        lista.appendChild(opt);
    });

    produtos.forEach(item => {
        const linha = document.createElement("tr");

        const tdImg = document.createElement("td");
        if (item.imagens && item.imagens[0]) {
            const img = document.createElement("img");
            img.className = "thumb";
            img.src = item.imagens[0];
            tdImg.appendChild(img);
        }

        const tdAcoes = document.createElement("td");
        tdAcoes.className = "acoes";

        const btnEditar = document.createElement("button");
        btnEditar.type = "button";
        btnEditar.className = "btn-editar";
        btnEditar.textContent = "Editar";
        btnEditar.onclick = () => editarProduto(item.id);

        const btnExcluir = document.createElement("button");
        btnExcluir.type = "button";
        btnExcluir.className = "btn-excluir";
        btnExcluir.textContent = "Excluir";
        btnExcluir.onclick = () => excluirProduto(item.id);

        tdAcoes.append(btnEditar, btnExcluir);

        linha.append(
            tdImg,
            celula(item.nome),
            celula(item.categoria),
            celula(item.subcategoria),
            celula(formatarPreco(item.preco)),
            celula(item.estoque),
            celula(item.status || "disponivel"),
            tdAcoes
        );

        tabela.appendChild(linha);
    });
}

/* ---------- Inicialização ---------- */

const textarea = document.getElementById("descricao");
textarea.addEventListener("input", function () {
    this.style.height = "auto";
    this.style.height = this.scrollHeight + "px";
});

document.getElementById("formProduto").addEventListener("submit", function (event) {
    event.preventDefault();
    salvarDados();
});

mostrarSlots();
carregarProdutos().then(mostrarDados);