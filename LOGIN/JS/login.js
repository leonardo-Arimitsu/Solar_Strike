
/*
   CONFIGURAÇÃO
*/

const CHAVE_USUARIOS = "usuarios";
const CHAVE_SESSAO = "sessao";

const URL_DASHBOARD = "/DASHBOARD/HTML/index.html";
const URL_USUARIO = "/INDEX/HTML/index.html";
const URL_LOGIN = "/LOGIN/login.html";

const URL_USUARIOS_JSON = "/LOGIN/DATA/usuarios.json";

const DIAS_LEMBRAR = 0;

const MAX_TENTATIVAS = 5;
const BLOQUEIO_SEGUNDOS = 30;


/*
   ARMAZENAMENTO (JSON)
*/

function carregarUsuarios() {
    try {
        return JSON.parse(localStorage.getItem(CHAVE_USUARIOS)) || [];
    } catch {
        return [];
    }
}

function salvarUsuarios(lista) {
    localStorage.setItem(CHAVE_USUARIOS, JSON.stringify(lista));
}

async function semearUsuarios() {
    const salvos = carregarUsuarios();

    const versaoAntiga = salvos.length > 0 &&
        salvos.every((u) =>
            typeof u.senha !== "string" || !u.perfil
        );

    if (
        localStorage.getItem(CHAVE_USUARIOS) !== null &&
        !versaoAntiga
    ) return;

    try {
        const resposta = await fetch(URL_USUARIOS_JSON, {
            cache: "no-store"
        });

        if (!resposta.ok) return;

        const lista = await resposta.json();

        if (Array.isArray(lista)) {
            salvarUsuarios(lista);
        }

    } catch {
        // Ignora caso o arquivo não exista.
    }
}


/* 
   USUÁRIOS
*/

function dadosPublicos(u) {
    return {
        id: u.id,
        nome: u.nome,
        email: u.email,
        perfil: u.perfil || "usuario"
    };
}

function gerarId() {
    return Date.now().toString(36) +
        Math.random().toString(36).slice(2, 9);
}

function normalizarEmail(email) {
    return String(email).trim().toLowerCase();
}


// CADASTRO DE USUÁRIOS

async function cadastrarUsuario({ nome, email, senha }) {

    await semearUsuarios();

    email = normalizarEmail(email);

    if (!nome?.trim() || !email || !senha) {
        throw new Error("Preencha nome, e-mail e senha.");
    }

    if (senha.length < 8) {
        throw new Error(
            "A senha precisa ter pelo menos 8 caracteres."
        );
    }

    const usuarios = carregarUsuarios();

    if (usuarios.some((u) => u.email === email)) {
        throw new Error(
            "Já existe uma conta com este e-mail."
        );
    }

    const usuario = {
        id: gerarId(),
        nome: nome.trim(),
        email,
        senha,
        perfil: "usuario",
        criadoEm: new Date().toISOString()
    };

    usuarios.push(usuario);

    salvarUsuarios(usuarios);

    return dadosPublicos(usuario);
}


// AUTENTICAÇÃO

async function autenticar(email, senha) {

    const usuario = carregarUsuarios().find(
        (u) => normalizarEmail(u.email) === normalizarEmail(email)
    );

    if (!usuario || usuario.senha !== senha) {
        throw new Error("E-mail ou senha incorretos.");
    }

    return dadosPublicos(usuario);
}


/* 
   REDIRECIONAMENTO POR PERFIL
*/

function redirecionarPorPerfil(usuario) {

    if (usuario.perfil === "admin") {
        window.location.href = URL_DASHBOARD;
    } else {
        window.location.href = URL_USUARIO;
    }
}


/* 
   SESSÃO
*/

function criarSessao(usuario, lembrar) {

    const expiraEm = lembrar
        ? Date.now() + DIAS_LEMBRAR * 24 * 60 * 60 * 1000
        : null;

    const dados = JSON.stringify({
        ...usuario,
        expiraEm
    });

    localStorage.removeItem(CHAVE_SESSAO);
    sessionStorage.removeItem(CHAVE_SESSAO);

    (lembrar ? localStorage : sessionStorage)
        .setItem(CHAVE_SESSAO, dados);
}


function obterSessao() {

    try {

        const bruto =
            sessionStorage.getItem(CHAVE_SESSAO) ||
            localStorage.getItem(CHAVE_SESSAO);

        if (!bruto) return null;

        const sessao = JSON.parse(bruto);

        if (sessao.expiraEm && sessao.expiraEm < Date.now()) {
            sair(false);
            return null;
        }

        return sessao;

    } catch {
        return null;
    }
}


function sair(redirecionar = true) {

    localStorage.removeItem(CHAVE_SESSAO);
    sessionStorage.removeItem(CHAVE_SESSAO);

    if (redirecionar) {
        window.location.href = URL_LOGIN;
    }
}


// PROTEÇÃO DE PÁGINAS

function exigirLogin(perfilNecessario) {

    const sessao = obterSessao();

    if (!sessao) {
        window.location.replace(URL_LOGIN);
        return null;
    }

    if (
        perfilNecessario &&
        sessao.perfil !== perfilNecessario
    ) {

        redirecionarPorPerfil(sessao);

        return null;
    }

    return sessao;
}


function ehAdmin() {
    return obterSessao()?.perfil === "admin";
}


/*
   PROTEÇÃO CONTRA TENTATIVAS SEGUIDAS
*/

const CHAVE_TENTATIVAS = "tentativasLogin";

function lerTentativas() {

    try {
        return JSON.parse(
            sessionStorage.getItem(CHAVE_TENTATIVAS)
        ) || {
            falhas: 0,
            ate: 0
        };

    } catch {
        return {
            falhas: 0,
            ate: 0
        };
    }
}


function segundosBloqueado() {

    const { ate } = lerTentativas();

    return Math.max(
        0,
        Math.ceil((ate - Date.now()) / 1000)
    );
}


function registrarFalha() {

    const t = lerTentativas();

    t.falhas++;

    if (t.falhas >= MAX_TENTATIVAS) {

        t.falhas = 0;

        t.ate = Date.now() +
            BLOQUEIO_SEGUNDOS * 1000;
    }

    sessionStorage.setItem(
        CHAVE_TENTATIVAS,
        JSON.stringify(t)
    );
}


function zerarFalhas() {
    sessionStorage.removeItem(CHAVE_TENTATIVAS);
}


/* 
   PÁGINA DE LOGIN
 */

const formLogin = document.getElementById("form-login");

if (formLogin) {

    const campoEmail = document.getElementById("email");
    const campoSenha = document.getElementById("password");

    const campoLembrar = document.getElementById("remember-me");

    const botaoEntrar = document.getElementById("btn-entrar");
    const botaoOlho = document.getElementById("toggle-password");

    const mensagem = document.getElementById("mensagem-login");


    // Se já estiver logado, redireciona conforme o perfil.

    const sessaoAtual = obterSessao();

    if (sessaoAtual) {
        redirecionarPorPerfil(sessaoAtual);
    }


    // Preencher e-mail lembrado.

    const emailLembrado = localStorage.getItem("emailLembrado");

    if (emailLembrado) {
        campoEmail.value = emailLembrado;
        campoLembrar.checked = true;
    }


    function mostrarMensagem(texto) {

        mensagem.textContent = texto;
        mensagem.hidden = !texto;
    }


    // Mostrar ou ocultar senha.

    if (botaoOlho) {

        botaoOlho.addEventListener("click", () => {

            const visivel = campoSenha.type === "text";

            campoSenha.type = visivel
                ? "password"
                : "text";

            botaoOlho.setAttribute(
                "aria-label",
                visivel ? "Mostrar senha" : "Ocultar senha"
            );

            botaoOlho.setAttribute(
                "aria-pressed",
                String(!visivel)
            );
        });
    }


    [campoEmail, campoSenha].forEach((campo) => {

        campo.addEventListener("input", () => {
            mostrarMensagem("");
        });

    });


    // PROCESSO DE LOGIN.

    formLogin.addEventListener("submit", async (evento) => {

        evento.preventDefault();

        const espera = segundosBloqueado();

        if (espera > 0) {

            mostrarMensagem(
                `Muitas tentativas. Tente novamente em ${espera}s.`
            );

            return;
        }


        botaoEntrar.disabled = true;

        mostrarMensagem("");


        try {

            await semearUsuarios();

            const usuario = await autenticar(
                campoEmail.value,
                campoSenha.value
            );


            zerarFalhas();

            criarSessao(
                usuario,
                campoLembrar.checked
            );


            if (campoLembrar.checked) {

                localStorage.setItem(
                    "emailLembrado",
                    usuario.email
                );

            } else {

                localStorage.removeItem("emailLembrado");

            }


            // REDIRECIONAMENTO CONFORME O PERFIL.

            redirecionarPorPerfil(usuario);


        } catch (erro) {

            registrarFalha();

            campoSenha.value = "";
            campoSenha.focus();

            mostrarMensagem(erro.message);

            botaoEntrar.disabled = false;

        }

    });

}
