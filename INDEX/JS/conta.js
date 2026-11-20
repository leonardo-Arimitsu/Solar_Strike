"use strict";

/*
   PÁGINA "MINHA CONTA"

   Depende de:
   - login.js  → obterSessao, sair, carregarUsuarios, salvarUsuarios, normalizarEmail
   - loja.js   → LOGIN_URL, escapeHTML, getFavorites, getProductById,
                 renderProductCard, renderUserMenu, showToast

   Tudo fica dentro de uma função para não conflitar com os outros scripts.
*/

(() => {

    const SECTIONS = ["dados", "favoritos", "seguranca"];

    const TITLES = {
        dados: "Meus dados",
        favoritos: "Favoritos",
        seguranca: "Segurança"
    };

    const HOME_URL = "/INDEX/HTML/index.html";

    const SESSION_KEY = typeof CHAVE_SESSAO === "string"
        ? CHAVE_SESSAO
        : "sessao";

    const $ = id => document.getElementById(id);

    let session = null;
    let productsReady = false;
    let productsFailed = false;


    /* =========================================
       SESSÃO E USUÁRIOS
    ========================================= */

    function goToLogin() {
        window.location.replace(LOGIN_URL);
    }

    // Atualiza a sessão onde ela estiver guardada (sessionStorage ou localStorage).
    function updateSession(patch) {

        const store = sessionStorage.getItem(SESSION_KEY)
            ? sessionStorage
            : localStorage;

        const raw = store.getItem(SESSION_KEY);

        if (!raw) return;

        try {
            store.setItem(
                SESSION_KEY,
                JSON.stringify({ ...JSON.parse(raw), ...patch })
            );
        } catch (error) {
            console.error("Erro ao atualizar a sessão:", error);
        }
    }

    function findUserIndex(users) {

        const email = normalizarEmail(session.email);

        return users.findIndex(
            user => normalizarEmail(user.email) === email
        );
    }


    /* =========================================
       MENSAGENS DOS FORMULÁRIOS
    ========================================= */

    function showMessage(element, text, type = "error") {

        if (!element) return;

        element.textContent = text;
        element.hidden = !text;

        element.classList.toggle("form-message--ok", type === "ok");
        element.classList.toggle("form-message--error", type !== "ok");
    }


    /* =========================================
       CABEÇALHO E DADOS
    ========================================= */

    function renderHero() {

        const name = String(session.nome || "Usuário").trim();

        $("accAvatar").textContent = name.charAt(0).toUpperCase();
        $("accHeroName").textContent = name;
        $("accHeroEmail").textContent = session.email || "";

        $("accRole").textContent = session.perfil === "admin"
            ? "Administrador"
            : "Cliente";

        // "Cliente desde ..." só aparece se a data existir.
        const since = $("accHeroSince");
        const users = carregarUsuarios();
        const user = users[findUserIndex(users)];

        if (user?.criadoEm) {

            const date = new Date(user.criadoEm);

            if (!Number.isNaN(date.getTime())) {
                since.textContent = "Cliente desde " + date.toLocaleDateString("pt-BR", {
                    month: "long",
                    year: "numeric"
                });
                since.hidden = false;
            }
        }
    }

    function fillForms() {

        $("accName").value = session.nome || "";
        $("accEmail").value = session.email || "";

        // CEP e UF não ficam na sessão: vêm da lista de usuários.
        const users = carregarUsuarios();
        const user = users[findUserIndex(users)];

        $("accCep").value = user?.cep || "";
        $("accUf").value = user?.uf || "";

        // Link do painel só para administradores.
        const adminLink = $("accAdminLink");

        if (session.perfil === "admin" && typeof URL_DASHBOARD === "string") {
            adminLink.href = URL_DASHBOARD;
            adminLink.hidden = false;
        }
    }


    /* =========================================
       NAVEGAÇÃO ENTRE SEÇÕES (pela #hash)
    ========================================= */

    function showSection() {

        const requested = window.location.hash.slice(1);
        const current = SECTIONS.includes(requested) ? requested : "dados";

        document.querySelectorAll("[data-panel]").forEach(panel => {
            panel.hidden = panel.dataset.panel !== current;
        });

        document.querySelectorAll("[data-section]").forEach(link => {

            if (link.dataset.section === current) {
                link.setAttribute("aria-current", "page");
            } else {
                link.removeAttribute("aria-current");
            }
        });

        document.title = `${TITLES[current]} | Minha conta | Homo Habilis`;
    }


    /* =========================================
       FAVORITOS
    ========================================= */

    function renderFavorites() {

        const grid = $("favoritesGrid");
        const badge = $("favCount");

        if (!grid) return;

        const ids = getFavorites().map(String);

        badge.textContent = ids.length;

        if (productsFailed) {

            grid.innerHTML = `
                <div class="account-empty">
                    <h3>Não foi possível carregar os produtos.</h3>
                    <p>Tente recarregar a página.</p>
                </div>
            `;
            return;
        }

        if (!productsReady) {
            grid.innerHTML = `<p class="account-loading">Carregando favoritos...</p>`;
            return;
        }

        const list = ids
            .map(id => getProductById(id))
            .filter(Boolean);

        badge.textContent = list.length;

        if (!list.length) {

            grid.innerHTML = `
                <div class="account-empty">
                    <h3>Você ainda não tem favoritos</h3>
                    <p>Toque no coração de um produto para guardá-lo aqui.</p>
                    <a href="pesca.html" class="btn btn--green">Ver produtos</a>
                </div>
            `;
            return;
        }

        grid.innerHTML = list
            .map(product => renderProductCard(product))
            .join("");
    }


    /* =========================================
       FORMULÁRIOS
    ========================================= */

    function setupDataForm() {

        // Máscara do CEP: 00000-000
        $("accCep").addEventListener("input", event => {

            const digits = event.target.value.replace(/\D/g, "").slice(0, 8);

            event.target.value = digits.length > 5
                ? `${digits.slice(0, 5)}-${digits.slice(5)}`
                : digits;
        });

        $("formDados").addEventListener("submit", event => {

            event.preventDefault();

            const message = $("msgDados");
            const name = $("accName").value.trim().replace(/\s+/g, " ");

            if (name.length < 2) {
                showMessage(message, "Informe seu nome.");
                return;
            }

            const cep = $("accCep").value.trim();
            const uf = $("accUf").value;

            if (cep && !/^\d{5}-\d{3}$/.test(cep)) {
                showMessage(message, "CEP inválido. Use o formato 00000-000.");
                return;
            }

            const users = carregarUsuarios();
            const index = findUserIndex(users);

            if (index < 0) {
                showMessage(message, "Não encontramos sua conta. Entre novamente.");
                return;
            }

            users[index].nome = name;
            users[index].cep = cep;
            users[index].uf = uf;
            salvarUsuarios(users);

            updateSession({ nome: name });
            session = obterSessao();

            $("accName").value = name;

            renderHero();
            renderUserMenu();

            showMessage(message, "Dados atualizados.", "ok");
        });
    }

    function setupPasswordForm() {

        $("formSenha").addEventListener("submit", event => {

            event.preventDefault();

            const message = $("msgSenha");

            const current = $("pwdCurrent").value;
            const next = $("pwdNew").value;
            const confirmation = $("pwdConfirm").value;

            if (!current || !next || !confirmation) {
                showMessage(message, "Preencha todos os campos.");
                return;
            }

            const users = carregarUsuarios();
            const index = findUserIndex(users);

            if (index < 0) {
                showMessage(message, "Não encontramos sua conta. Entre novamente.");
                return;
            }

            if (users[index].senha !== current) {
                showMessage(message, "A senha atual está incorreta.");
                return;
            }

            if (next.length < 8) {
                showMessage(message, "A nova senha precisa ter pelo menos 8 caracteres.");
                return;
            }

            if (next === current) {
                showMessage(message, "A nova senha precisa ser diferente da atual.");
                return;
            }

            if (next !== confirmation) {
                showMessage(message, "A confirmação não é igual à nova senha.");
                return;
            }

            users[index].senha = next;
            salvarUsuarios(users);

            event.target.reset();

            showMessage(message, "Senha alterada.", "ok");
        });
    }

    function setupDeleteForm() {

        const form = $("formExcluir");
        const message = $("msgExcluir");
        const confirmBox = $("deleteConfirm");
        const deleteButton = $("btnExcluir");

        function closeConfirmation() {
            confirmBox.hidden = true;
            deleteButton.hidden = false;
        }

        // Confere senha e regras. Devolve { users, index } ou null (com mensagem).
        function validate() {

            const password = $("delPassword").value;

            if (!password) {
                showMessage(message, "Digite sua senha para confirmar.");
                return null;
            }

            const users = carregarUsuarios();
            const index = findUserIndex(users);

            if (index < 0) {
                showMessage(message, "Não encontramos sua conta. Entre novamente.");
                return null;
            }

            if (users[index].senha !== password) {
                showMessage(message, "Senha incorreta.");
                return null;
            }

            // Administrador só pode sair se existir outro administrador.
            if (users[index].perfil === "admin") {

                const hasOtherAdmin = users.some(
                    (user, i) => i !== index && user.perfil === "admin"
                );

                if (!hasOtherAdmin) {
                    showMessage(
                        message,
                        "Você é o único administrador. Crie outro administrador antes de excluir esta conta."
                    );
                    return null;
                }
            }

            return { users, index };
        }

        // Passo 1: valida e mostra a confirmação.
        form.addEventListener("submit", event => {

            event.preventDefault();

            showMessage(message, "");

            if (!validate()) return;

            deleteButton.hidden = true;
            confirmBox.hidden = false;
        });

        // Passo 2: confirma e exclui.
        $("btnExcluirSim").addEventListener("click", () => {

            const result = validate();

            if (!result) {
                closeConfirmation();
                return;
            }

            result.users.splice(result.index, 1);
            salvarUsuarios(result.users);

            localStorage.removeItem("emailLembrado");

            sair(false);

            window.location.replace(HOME_URL);
        });

        $("btnExcluirNao").addEventListener("click", () => {
            closeConfirmation();
            showMessage(message, "");
        });
    }


    /* =========================================
       INICIALIZAÇÃO
    ========================================= */

    // Registrados já na carga do script, antes de o loja.js terminar.
    document.addEventListener("products:loaded", () => {
        productsReady = true;
        renderFavorites();
    });

    document.addEventListener("products:error", () => {
        productsFailed = true;
        renderFavorites();
    });

    document.addEventListener("favorites:changed", renderFavorites);

    // Saiu pelo menu do topo: sai também desta página.
    document.addEventListener("session:ended", () => {
        window.location.replace(HOME_URL);
    });

    document.addEventListener("DOMContentLoaded", () => {

        if (typeof obterSessao !== "function") {
            console.error("login.js não foi carregado: a página de conta precisa dele.");
            goToLogin();
            return;
        }

        session = obterSessao();

        if (!session) {
            goToLogin();
            return;
        }

        $("accountPage").hidden = false;

        renderHero();
        fillForms();

        setupDataForm();
        setupPasswordForm();
        setupDeleteForm();

        showSection();
        renderFavorites();

        window.addEventListener("hashchange", showSection);

        $("accLogout").addEventListener("click", () => {
            sair(false);
            window.location.href = HOME_URL;
        });

        // Se a sessão for encerrada em outra aba, volta para o login.
        window.addEventListener("storage", event => {

            if (event.key === SESSION_KEY && !obterSessao()) {
                goToLogin();
            }
        });
    });

})();