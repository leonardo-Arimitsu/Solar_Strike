"use strict";

/* =========================================================
   AUTENTICAÇÃO E SESSÃO (compartilhado)

   ATENÇÃO: isto é uma simulação 100% no navegador.
   Senhas ficam no localStorage e a sessão pode ser alterada
   por qualquer pessoa pelo DevTools. Serve para demonstração.
   Em produção, login, perfis e senhas precisam de um back-end.

   Depende de: utils.js
========================================================= */

const CHAVE_USUARIOS = "usuarios";
const CHAVE_SESSAO = "sessao";
const CHAVE_TENTATIVAS = "tentativasLogin";
const CHAVE_TOKENS_RESET = "tokensRedefinicao";

const URL_LOJA = "/loja/html/index.html";
const URL_DASHBOARD = "/dashboard/html/index.html";
const URL_LOGIN = "/login/html/login.html";
const URL_REDEFINIR = "/login/html/redefinir-senha.html";
const URL_USUARIOS_JSON = "/shared/data/usuarios.json";

const DIAS_LEMBRAR = 30;
const MAX_TENTATIVAS = 5;
const BLOQUEIO_SEGUNDOS = 30;
const MIN_SENHA = 8;
const VALIDADE_TOKEN_MINUTOS = 30;

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REGEX_CEP = /^\d{5}-?\d{3}$/;
const UFS = [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
    "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];


/* =========================================
   USUÁRIOS
========================================= */

function carregarUsuarios() {
    const lista = lerStorage(CHAVE_USUARIOS, []);
    return Array.isArray(lista) ? lista : [];
}

function salvarUsuarios(lista) {
    return salvarStorage(CHAVE_USUARIOS, lista);
}

// Na primeira visita, copia os usuários de exemplo do JSON.
async function semearUsuarios() {

    if (localStorage.getItem(CHAVE_USUARIOS) !== null) return;

    try {
        const resposta = await fetch(URL_USUARIOS_JSON, { cache: "no-store" });

        if (!resposta.ok) return;

        const lista = await resposta.json();

        if (Array.isArray(lista)) salvarUsuarios(lista);

    } catch (error) {
        console.warn("Usuários de exemplo não carregados:", error);
    }
}

function dadosPublicos(usuario) {
    return {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil || "usuario"
    };
}

function normalizarEmail(email) {
    return String(email ?? "").trim().toLowerCase();
}

function normalizarCep(cep) {
    const digitos = String(cep ?? "").replace(/\D/g, "");
    return digitos.length === 8 ? `${digitos.slice(0, 5)}-${digitos.slice(5)}` : String(cep ?? "").trim();
}

function validarSenha(senha) {
    if (String(senha ?? "").length < MIN_SENHA) {
        throw new Error(`A senha precisa ter pelo menos ${MIN_SENHA} caracteres.`);
    }
}


/* =========================================
   CADASTRO
========================================= */

async function cadastrarUsuario({ nome, email, senha, cep = "", uf = "" }) {

    await semearUsuarios();

    nome = String(nome ?? "").trim().replace(/\s+/g, " ");
    email = normalizarEmail(email);
    uf = String(uf ?? "").trim().toUpperCase();
    cep = String(cep ?? "").trim();

    if (!nome || !email || !senha) {
        throw new Error("Preencha nome, e-mail e senha.");
    }

    if (!REGEX_EMAIL.test(email)) {
        throw new Error("Informe um e-mail válido.");
    }

    validarSenha(senha);

    if (cep && !REGEX_CEP.test(cep)) {
        throw new Error("CEP inválido. Use o formato 00000-000.");
    }

    if (uf && !UFS.includes(uf)) {
        throw new Error("UF inválida. Exemplo: SP.");
    }

    const usuarios = carregarUsuarios();

    if (usuarios.some(u => normalizarEmail(u.email) === email)) {
        throw new Error("Já existe uma conta com este e-mail.");
    }

    const usuario = {
        id: gerarIdUnico(),
        nome,
        email,
        senha,
        perfil: "usuario",      // o perfil nunca vem do formulário
        cep: cep ? normalizarCep(cep) : "",
        uf,
        foto: "",
        licenca: null,
        criadoEm: new Date().toISOString()
    };

    usuarios.push(usuario);

    if (!salvarUsuarios(usuarios)) {
        throw new Error("Não foi possível salvar o cadastro neste navegador.");
    }

    return dadosPublicos(usuario);
}


/* =========================================
   AUTENTICAÇÃO
========================================= */

async function autenticar(email, senha) {

    const usuario = carregarUsuarios().find(
        u => normalizarEmail(u.email) === normalizarEmail(email)
    );

    if (!usuario || usuario.senha !== senha) {
        throw new Error("E-mail ou senha incorretos.");
    }

    return dadosPublicos(usuario);
}


/* =========================================
   REDEFINIÇÃO DE SENHA (demonstração)
   Sem back-end não há como enviar e-mail. O token é gerado e
   guardado aqui; em produção o servidor envia o link ao usuário.
========================================= */

function solicitarRedefinicao(email) {

    email = normalizarEmail(email);

    const existe = carregarUsuarios().some(u => normalizarEmail(u.email) === email);

    if (!existe) return null;

    const agora = Date.now();

    // Descarta tokens vencidos e antigos do mesmo e-mail.
    const tokens = lerStorage(CHAVE_TOKENS_RESET, [])
        .filter(t => t.expira > agora && t.email !== email);

    const token = gerarToken();

    tokens.push({
        token,
        email,
        expira: agora + VALIDADE_TOKEN_MINUTOS * 60 * 1000
    });

    salvarStorage(CHAVE_TOKENS_RESET, tokens);

    return token;
}

function tokenRedefinicaoValido(token) {
    return lerStorage(CHAVE_TOKENS_RESET, [])
        .some(t => t.token === token && t.expira > Date.now());
}

function redefinirSenha(token, novaSenha) {

    validarSenha(novaSenha);

    const tokens = lerStorage(CHAVE_TOKENS_RESET, []);
    const registro = tokens.find(t => t.token === token && t.expira > Date.now());

    if (!registro) {
        throw new Error("Link inválido ou expirado. Solicite um novo.");
    }

    const usuarios = carregarUsuarios();
    const indice = usuarios.findIndex(u => normalizarEmail(u.email) === registro.email);

    if (indice < 0) {
        throw new Error("Conta não encontrada.");
    }

    usuarios[indice].senha = novaSenha;
    salvarUsuarios(usuarios);

    // Token de uso único.
    salvarStorage(CHAVE_TOKENS_RESET, tokens.filter(t => t.token !== token));
}


/* =========================================
   SESSÃO
========================================= */

function criarSessao(usuario, lembrar) {

    const dados = {
        ...usuario,
        expiraEm: lembrar
            ? Date.now() + DIAS_LEMBRAR * 24 * 60 * 60 * 1000
            : null
    };

    localStorage.removeItem(CHAVE_SESSAO);
    sessionStorage.removeItem(CHAVE_SESSAO);

    salvarStorage(CHAVE_SESSAO, dados, lembrar ? localStorage : sessionStorage);

    // O carrinho montado como visitante passa a ser do cliente.
    if (typeof mesclarCarrinhoVisitante === "function") mesclarCarrinhoVisitante(usuario.id);
}

function obterSessao() {

    const sessao =
        lerStorage(CHAVE_SESSAO, null, sessionStorage) ||
        lerStorage(CHAVE_SESSAO, null, localStorage);

    if (!sessao || typeof sessao !== "object" || !sessao.email) return null;

    if (sessao.expiraEm && sessao.expiraEm < Date.now()) {
        sair(false);
        return null;
    }

    return sessao;
}

// Altera campos da sessão ativa (ex.: nome) no storage em que ela está.
function atualizarSessao(alteracoes) {

    const storage = sessionStorage.getItem(CHAVE_SESSAO) ? sessionStorage : localStorage;
    const atual = lerStorage(CHAVE_SESSAO, null, storage);

    if (!atual) return;

    salvarStorage(CHAVE_SESSAO, { ...atual, ...alteracoes }, storage);
}

function sair(redirecionar = true) {

    localStorage.removeItem(CHAVE_SESSAO);
    sessionStorage.removeItem(CHAVE_SESSAO);

    if (redirecionar) window.location.href = URL_LOGIN;
}

function redirecionarPorPerfil(usuario) {
    window.location.href = usuario.perfil === "admin" ? URL_DASHBOARD : URL_LOJA;
}

// Protege uma página. Devolve a sessão ou null (e já redireciona).
function exigirLogin(perfilNecessario) {

    const sessao = obterSessao();

    if (!sessao) {
        window.location.replace(URL_LOGIN);
        return null;
    }

    if (perfilNecessario && sessao.perfil !== perfilNecessario) {
        window.location.replace(sessao.perfil === "admin" ? URL_DASHBOARD : URL_LOJA);
        return null;
    }

    return sessao;
}

function ehAdmin() {
    return obterSessao()?.perfil === "admin";
}


/* =========================================
   LIMITE DE TENTATIVAS DE LOGIN
   Fica no localStorage para valer em todas as abas.
========================================= */

function lerTentativas() {
    const dados = lerStorage(CHAVE_TENTATIVAS, null);

    return {
        falhas: Number(dados?.falhas) || 0,
        ate: Number(dados?.ate) || 0
    };
}

function segundosBloqueado() {
    return Math.max(0, Math.ceil((lerTentativas().ate - Date.now()) / 1000));
}

function registrarFalha() {

    const tentativas = lerTentativas();

    tentativas.falhas += 1;

    if (tentativas.falhas >= MAX_TENTATIVAS) {
        tentativas.falhas = 0;
        tentativas.ate = Date.now() + BLOQUEIO_SEGUNDOS * 1000;
    }

    salvarStorage(CHAVE_TENTATIVAS, tentativas);
}

function zerarFalhas() {
    localStorage.removeItem(CHAVE_TENTATIVAS);
}
