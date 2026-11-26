"use strict";

/* =========================================================
   PÁGINAS DE ACESSO: login, cadastro, recuperação e nova senha.
   Cada formulário é identificado pelo id; o que não existir
   na página atual é simplesmente ignorado.

   Depende de: utils.js e auth.js (carregados antes).
========================================================= */

(() => {

    // Enquanto não houver back-end de e-mail, o link de recuperação
    // é mostrado na tela. Mude para false em produção.
    const MODO_DEMONSTRACAO = true;

    const $ = id => document.getElementById(id);


    /* ---------- Apoio ---------- */

    function criarMensagem(elemento) {

        return (texto, tipo = "erro") => {

            if (!elemento) return;

            elemento.textContent = texto;
            elemento.hidden = !texto;
            elemento.classList.toggle("mensagem-login--ok", tipo === "ok");
        };
    }

    // Só aceita caminhos internos (evita redirecionar para outro site).
    function destinoSeguro() {

        const destino = new URLSearchParams(window.location.search).get("next");

        return destino && destino.startsWith("/") && !destino.startsWith("//")
            ? destino
            : null;
    }

    function irParaDestino(usuario) {

        if (usuario.perfil !== "admin" && destinoSeguro()) {
            window.location.href = destinoSeguro();
            return;
        }

        redirecionarPorPerfil(usuario);
    }

    function configurarOlhos() {

        document.querySelectorAll(".toggle-password").forEach(botao => {

            const campo = botao.closest(".password-holder")?.querySelector("input");
            const icone = botao.querySelector("img");

            if (!campo) return;

            botao.addEventListener("click", () => {

                const mostrar = campo.type === "password";

                campo.type = mostrar ? "text" : "password";

                botao.setAttribute("aria-label", mostrar ? "Ocultar senha" : "Mostrar senha");
                botao.setAttribute("aria-pressed", String(mostrar));

                if (icone) {
                    icone.src = mostrar
                        ? "/shared/img/eye-off-icon-size_16.png"
                        : "/shared/img/eye-icon-size_16.png";
                }
            });
        });
    }

    function mascararCep(campo) {

        campo.addEventListener("input", () => {

            const digitos = campo.value.replace(/\D/g, "").slice(0, 8);

            campo.value = digitos.length > 5
                ? `${digitos.slice(0, 5)}-${digitos.slice(5)}`
                : digitos;
        });
    }


    /* ---------- Login ---------- */

    function iniciarLogin(form) {

        const campoEmail = $("email");
        const campoSenha = $("password");
        const campoLembrar = $("remember-me");
        const botao = $("btn-entrar");
        const mostrar = criarMensagem($("mensagem-login"));

        // Já está logado: segue direto para a área do perfil.
        const sessaoAtual = obterSessao();

        if (sessaoAtual) {
            irParaDestino(sessaoAtual);
            return;
        }

        const emailLembrado = localStorage.getItem("emailLembrado");

        if (emailLembrado) {
            campoEmail.value = emailLembrado;
            campoLembrar.checked = true;
        }

        [campoEmail, campoSenha].forEach(campo =>
            campo.addEventListener("input", () => mostrar(""))
        );

        form.addEventListener("submit", async evento => {

            evento.preventDefault();

            const espera = segundosBloqueado();

            if (espera > 0) {
                mostrar(`Muitas tentativas. Tente novamente em ${espera}s.`);
                return;
            }

            if (!campoEmail.value.trim() || !campoSenha.value) {
                mostrar("Informe e-mail e senha.");
                return;
            }

            botao.disabled = true;
            mostrar("");

            try {
                await semearUsuarios();

                const usuario = await autenticar(campoEmail.value, campoSenha.value);

                zerarFalhas();
                criarSessao(usuario, campoLembrar.checked);

                if (campoLembrar.checked) {
                    localStorage.setItem("emailLembrado", usuario.email);
                } else {
                    localStorage.removeItem("emailLembrado");
                }

                irParaDestino(usuario);

            } catch (erro) {

                registrarFalha();

                campoSenha.value = "";
                campoSenha.focus();

                mostrar(erro.message);
                botao.disabled = false;
            }
        });
    }


    /* ---------- Cadastro ---------- */

    function iniciarCadastro(form) {

        const botao = $("btn-cadastrar");
        const mostrar = criarMensagem($("mensagem-cadastro"));

        if (obterSessao()) {
            redirecionarPorPerfil(obterSessao());
            return;
        }

        mascararCep($("cep"));

        $("uf").addEventListener("input", evento => {
            evento.target.value = evento.target.value.replace(/[^a-zA-Z]/g, "").toUpperCase();
        });

        form.addEventListener("input", () => mostrar(""));

        form.addEventListener("submit", async evento => {

            evento.preventDefault();

            const senha = $("password").value;

            if (senha !== $("confirm-password").value) {
                mostrar("A confirmação não é igual à senha.");
                return;
            }

            botao.disabled = true;

            try {
                const usuario = await cadastrarUsuario({
                    nome: $("name").value,
                    email: $("email").value,
                    senha,
                    cep: $("cep").value,
                    uf: $("uf").value
                });

                // Conta criada: já entra logado.
                criarSessao(usuario, false);
                irParaDestino(usuario);

            } catch (erro) {
                mostrar(erro.message);
                botao.disabled = false;
            }
        });
    }


    /* ---------- Esqueci a senha ---------- */

    function iniciarRecuperacao(form) {

        const mensagem = $("mensagem-recuperar");
        const mostrar = criarMensagem(mensagem);

        form.addEventListener("submit", async evento => {

            evento.preventDefault();

            const email = $("email").value.trim();

            if (!REGEX_EMAIL.test(email)) {
                mostrar("Informe um e-mail válido.");
                return;
            }

            await semearUsuarios();

            const token = solicitarRedefinicao(email);

            // Mesma resposta exista ou não a conta (não revela quem é cliente).
            mostrar(
                "Se este e-mail estiver cadastrado, você receberá um link de recuperação.",
                "ok"
            );

            if (MODO_DEMONSTRACAO && token) {

                const link = document.createElement("a");
                link.href = `${URL_REDEFINIR}?token=${encodeURIComponent(token)}`;
                link.textContent = "Abrir link de redefinição (modo demonstração)";

                mensagem.append(document.createElement("br"), link);
            }
        });
    }


    /* ---------- Nova senha ---------- */

    function iniciarRedefinicao(form) {

        const botao = $("btn-redefinir");
        const mostrar = criarMensagem($("mensagem-redefinir"));
        const token = new URLSearchParams(window.location.search).get("token") || "";

        if (!tokenRedefinicaoValido(token)) {
            mostrar("Link inválido ou expirado. Solicite um novo em \"Esqueci a senha\".");
            botao.disabled = true;
            return;
        }

        form.addEventListener("input", () => mostrar(""));

        form.addEventListener("submit", evento => {

            evento.preventDefault();

            const senha = $("password").value;

            if (senha !== $("confirm-password").value) {
                mostrar("A confirmação não é igual à senha.");
                return;
            }

            try {
                redefinirSenha(token, senha);

                botao.disabled = true;
                mostrar("Senha alterada! Redirecionando para o login...", "ok");

                setTimeout(() => window.location.replace(URL_LOGIN), 1500);

            } catch (erro) {
                mostrar(erro.message);
            }
        });
    }


    /* ---------- Inicialização ---------- */

    function iniciar() {

        configurarOlhos();

        const formularios = [
            ["form-login", iniciarLogin],
            ["form-cadastro", iniciarCadastro],
            ["form-recuperar", iniciarRecuperacao],
            ["form-redefinir", iniciarRedefinicao]
        ];

        formularios.forEach(([id, iniciarFormulario]) => {
            const form = $(id);
            if (form) iniciarFormulario(form);
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", iniciar);
    } else {
        iniciar();
    }

})();
