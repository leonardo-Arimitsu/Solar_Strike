"use strict";

/*
   PÁGINA "MINHA CONTA"

   Depende de:
   - auth.js   → sessão, usuários, UFS, MIN_SENHA, URLs
   - dados.js  → pedidos, avaliações, carrinho, licença
   - loja.js   → renderProductCard, renderUserMenu, whenProductsReady, getProductById

   Tudo fica dentro de uma função para não conflitar com os outros scripts.
*/

(() => {

    const SECTIONS = ["visao", "dados", "pedidos", "avaliacoes", "favoritos", "licenca", "seguranca"];

    const TITLES = {
        visao: "Visão geral",
        dados: "Meus dados",
        pedidos: "Pedidos",
        avaliacoes: "Minhas avaliações",
        favoritos: "Favoritos",
        licenca: "Licença",
        seguranca: "Segurança"
    };

    const LICENSE_LABELS = {
        pendente: "Em análise",
        aprovada: "Aprovada",
        recusada: "Recusada"
    };

    const PHOTO_SIZE = 256;
    const PHOTO_MAX_FILE = 8 * 1024 * 1024;

    const $ = id => document.getElementById(id);

    let session = null;
    let productsReady = false;
    let productsFailed = false;


    /* =========================================
       SESSÃO E USUÁRIOS
    ========================================= */

    function goToLogin() {
        window.location.replace(URL_LOGIN);
    }

    function findUserIndex(users) {

        const email = normalizarEmail(session.email);

        return users.findIndex(user => normalizarEmail(user.email) === email);
    }

    function currentUser() {

        const users = carregarUsuarios();

        return users[findUserIndex(users)] || null;
    }

    function showMessage(element, text, type = "error") {

        if (!element) return;

        element.textContent = text;
        element.hidden = !text;

        element.classList.toggle("form-message--ok", type === "ok");
        element.classList.toggle("form-message--error", type !== "ok");
    }

    function myOrders() {

        return carregarPedidos()
            .filter(order => order.usuarioId === session.id)
            .sort((a, b) => String(b.criadoEm).localeCompare(String(a.criadoEm)));
    }

    function myReviews() {

        return carregarAvaliacoes()
            .filter(review => review.usuarioId === session.id)
            .sort((a, b) => String(b.criadoEm).localeCompare(String(a.criadoEm)));
    }

    function formatDate(iso) {

        const date = new Date(iso);

        return Number.isNaN(date.getTime())
            ? ""
            : date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    }

    function statusClass(status) {
        return "pill pill--" + normalizeText(status).replace(/\s+/g, "-");
    }


    /* =========================================
       CABEÇALHO, FOTO E VISÃO GERAL
    ========================================= */

    function setAvatar(element, user, name) {

        if (user?.foto) {
            element.innerHTML = `<img src="${escapeHTML(user.foto)}" alt="">`;
            element.classList.add("has-photo");
        } else {
            element.textContent = name.charAt(0).toUpperCase();
            element.classList.remove("has-photo");
        }
    }

    function renderHero() {

        const name = String(session.nome || "Usuário").trim();
        const user = currentUser();

        setAvatar($("accAvatar"), user, name);
        setAvatar($("photoPreview"), user, name);

        $("accHeroName").textContent = name;
        $("accHeroEmail").textContent = session.email || "";
        $("accRole").textContent = session.perfil === "admin" ? "Administrador" : "Cliente";

        const since = $("accHeroSince");

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

    function renderBadges() {

        $("orderCount").textContent = myOrders().length;
        $("reviewCount").textContent = myReviews().length;
        $("favCount").textContent = getFavorites().length;
    }

    function renderOverview() {

        const orders = myOrders();
        const open = orders.filter(order => ["Aguardando pagamento", "Pago", "Enviado"].includes(order.status)).length;
        const cartItems = obterCarrinho().reduce((sum, item) => sum + item.quantity, 0);

        $("welcomeTitle").textContent = `Olá, ${String(session.nome || "").trim().split(" ")[0] || "cliente"}!`;

        const stats = [
            ["Pedidos", orders.length, "#pedidos"],
            ["Em andamento", open, "#pedidos"],
            ["Favoritos", getFavorites().length, "#favoritos"],
            ["Avaliações", myReviews().length, "#avaliacoes"],
            ["Itens no carrinho", cartItems, null]
        ];

        $("statGrid").innerHTML = stats.map(([label, value, href]) => `
            <${href ? `a href="${href}"` : `button type="button" data-cart-open`} class="stat-card">
                <strong>${value}</strong>
                <span>${label}</span>
            </${href ? "a" : "button"}>
        `).join("");

        const last = orders[0];

        $("lastOrderCard").innerHTML = last
            ? `
                <h3>Último pedido</h3>
                <p><strong>${escapeHTML(last.id)}</strong> · ${formatDate(last.criadoEm)}</p>
                <p><span class="${statusClass(last.status)}">${escapeHTML(last.status)}</span> · ${formatMoney(last.total)}</p>
                <a href="#pedidos">Ver todos os pedidos →</a>`
            : `
                <h3>Último pedido</h3>
                <p>Você ainda não fez compras.</p>
                <a href="pesca.html">Ver produtos →</a>`;

        const license = currentUser()?.licenca;

        $("licenseCard").innerHTML = `
            <h3>Licença</h3>
            ${license
                ? `<p><span class="pill pill--${license.status}">${LICENSE_LABELS[license.status] || license.status}</span></p>`
                : `<p>Nenhuma licença enviada.</p>`}
            <p class="overview-card__hint">Necessária só para produtos controlados.</p>
            <a href="#licenca">Gerenciar licença →</a>`;
    }

    // Recorta no centro, reduz para 256 px e comprime (cabe no armazenamento do navegador).
    function processPhoto(file) {

        return new Promise((resolve, reject) => {

            const reader = new FileReader();

            reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));

            reader.onload = () => {

                const image = new Image();

                image.onerror = () => reject(new Error("Esse arquivo não é uma imagem válida."));

                image.onload = () => {

                    const side = Math.min(image.width, image.height);
                    const canvas = document.createElement("canvas");

                    canvas.width = canvas.height = PHOTO_SIZE;

                    canvas.getContext("2d").drawImage(
                        image,
                        (image.width - side) / 2, (image.height - side) / 2, side, side,
                        0, 0, PHOTO_SIZE, PHOTO_SIZE
                    );

                    resolve(canvas.toDataURL("image/jpeg", 0.85));
                };

                image.src = reader.result;
            };

            reader.readAsDataURL(file);
        });
    }

    function savePhoto(dataUrl) {

        const users = carregarUsuarios();
        const index = findUserIndex(users);

        if (index < 0) throw new Error("Não encontramos sua conta. Entre novamente.");

        users[index].foto = dataUrl;

        if (!salvarUsuarios(users)) throw new Error("Sem espaço no navegador para salvar a foto.");

        renderHero();
        renderUserMenu();
    }

    function setupPhoto() {

        const message = $("msgFoto");

        $("photoInput").addEventListener("change", async event => {

            const file = event.target.files[0];

            event.target.value = "";

            if (!file) return;

            if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) {
                showMessage(message, "Use uma imagem JPG, PNG ou WebP.");
                return;
            }

            if (file.size > PHOTO_MAX_FILE) {
                showMessage(message, "A imagem é muito grande (máximo 8 MB).");
                return;
            }

            try {
                savePhoto(await processPhoto(file));
                showMessage(message, "Foto atualizada.", "ok");
            } catch (error) {
                showMessage(message, error.message);
            }
        });

        $("photoRemove").addEventListener("click", () => {

            try {
                savePhoto("");
                showMessage(message, "Foto removida.", "ok");
            } catch (error) {
                showMessage(message, error.message);
            }
        });
    }

    function fillForms() {

        const user = currentUser();

        $("accName").value = session.nome || "";
        $("accEmail").value = session.email || "";
        $("accCep").value = user?.cep || "";
        $("accUf").value = user?.uf || "";

        const adminLink = $("accAdminLink");

        if (session.perfil === "admin") {
            adminLink.href = URL_DASHBOARD;
            adminLink.hidden = false;
        }

        $("licType").innerHTML = TIPOS_LICENCA
            .map(type => `<option value="${escapeHTML(type)}">${escapeHTML(type)}</option>`)
            .join("");
    }


    /* =========================================
       NAVEGAÇÃO ENTRE SEÇÕES (pela #hash)
    ========================================= */

    function showSection() {

        const requested = window.location.hash.slice(1);
        const current = SECTIONS.includes(requested) ? requested : "visao";

        document.querySelectorAll("[data-panel]").forEach(panel => {
            panel.hidden = panel.dataset.panel !== current;
        });

        document.querySelectorAll("[data-section]").forEach(link => {

            if (link.dataset.section === current) link.setAttribute("aria-current", "page");
            else link.removeAttribute("aria-current");
        });

        document.title = `${TITLES[current]} | Minha conta | Homo Habilis`;
    }


    /* =========================================
       PEDIDOS, AVALIAÇÕES, FAVORITOS E LICENÇA
    ========================================= */

    function renderOrders() {

        const orders = myOrders();

        if (!orders.length) {
            $("orderList").innerHTML = `
                <div class="account-empty">
                    <h3>Você ainda não fez pedidos</h3>
                    <p>Quando comprar, o histórico aparece aqui.</p>
                    <a href="pesca.html" class="btn btn--green">Ver produtos</a>
                </div>`;
            return;
        }

        $("orderList").innerHTML = orders.map(order => `
            <article class="order-card">
                <header>
                    <div>
                        <strong>${escapeHTML(order.id)}</strong>
                        <small>${formatDate(order.criadoEm)} · ${escapeHTML(order.canal || "Site")}</small>
                    </div>
                    <span class="${statusClass(order.status)}">${escapeHTML(order.status)}</span>
                </header>
                <ul>
                    ${order.itens.map(item => `
                        <li>
                            <a href="produto.html?id=${encodeURIComponent(item.id)}">${escapeHTML(item.nome)}</a>
                            <span>${item.quantidade} × ${formatMoney(item.preco)}</span>
                        </li>`).join("")}
                </ul>
                <footer>
                    <span>Total</span>
                    <strong>${formatMoney(order.total)}</strong>
                </footer>
            </article>
        `).join("");
    }

    function renderMyReviews() {

        const reviews = myReviews();

        if (!reviews.length) {
            $("myReviews").innerHTML = `
                <div class="account-empty">
                    <h3>Você ainda não avaliou produtos</h3>
                    <p>Abra um produto e conte o que achou.</p>
                </div>`;
            return;
        }

        $("myReviews").innerHTML = reviews.map(review => {

            const product = productsReady ? getProductById(review.produtoId) : null;

            return `
                <article class="review-item">
                    <header>
                        ${estrelasHTML(review.nota)}
                        <strong>${product
                            ? `<a href="produto.html?id=${encodeURIComponent(product.id)}">${escapeHTML(product.nome)}</a>`
                            : "Produto"}</strong>
                        <time>${formatDate(review.criadoEm)}</time>
                    </header>
                    ${review.texto ? `<p>${escapeHTML(review.texto)}</p>` : ""}
                    <button type="button" class="review-delete" data-review-delete="${escapeHTML(review.id)}">Excluir</button>
                </article>`;
        }).join("");
    }

    function renderFavorites() {

        const grid = $("favoritesGrid");

        $("favCount").textContent = getFavorites().length;

        if (productsFailed) {
            grid.innerHTML = `<div class="account-empty"><h3>Não foi possível carregar os produtos.</h3><p>Tente recarregar a página.</p></div>`;
            return;
        }

        if (!productsReady) {
            grid.innerHTML = `<p class="account-loading">Carregando favoritos...</p>`;
            return;
        }

        const list = getFavorites().map(getProductById).filter(Boolean);

        $("favCount").textContent = list.length;

        grid.innerHTML = list.length
            ? list.map(renderProductCard).join("")
            : `
                <div class="account-empty">
                    <h3>Você ainda não tem favoritos</h3>
                    <p>Toque no coração de um produto para guardá-lo aqui.</p>
                    <a href="pesca.html" class="btn btn--green">Ver produtos</a>
                </div>`;
    }

    function renderLicense() {

        const license = currentUser()?.licenca;
        const box = $("licenseStatus");

        if (!license) {
            box.innerHTML = `<p class="license-banner license-banner--none">Você ainda não enviou nenhuma licença.</p>`;
            return;
        }

        const expired = license.validade && license.validade < new Date().toISOString().slice(0, 10);

        box.innerHTML = `
            <div class="license-banner license-banner--${license.status}">
                <strong>${LICENSE_LABELS[license.status] || license.status}${expired ? " (vencida)" : ""}</strong>
                <span>${escapeHTML(license.tipo)} · nº ${escapeHTML(license.numero)}${license.validade ? ` · válida até ${license.validade.split("-").reverse().join("/")}` : ""}</span>
                ${license.motivo ? `<span>Motivo: ${escapeHTML(license.motivo)}</span>` : ""}
            </div>`;
    }

    function renderAll() {
        renderHero();
        renderBadges();
        renderOverview();
        renderOrders();
        renderMyReviews();
        renderFavorites();
        renderLicense();
    }


    /* =========================================
       FORMULÁRIOS
    ========================================= */

    function setupDataForm() {

        $("accCep").addEventListener("input", event => {

            const digits = event.target.value.replace(/\D/g, "").slice(0, 8);

            event.target.value = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
        });

        $("formDados").addEventListener("submit", event => {

            event.preventDefault();

            const message = $("msgDados");
            const name = $("accName").value.trim().replace(/\s+/g, " ");
            const cep = $("accCep").value.trim();
            const uf = $("accUf").value;

            if (name.length < 2) return showMessage(message, "Informe seu nome.");
            if (cep && !/^\d{5}-\d{3}$/.test(cep)) return showMessage(message, "CEP inválido. Use o formato 00000-000.");
            if (uf && !UFS.includes(uf)) return showMessage(message, "UF inválida.");

            const users = carregarUsuarios();
            const index = findUserIndex(users);

            if (index < 0) return showMessage(message, "Não encontramos sua conta. Entre novamente.");

            Object.assign(users[index], { nome: name, cep, uf });
            salvarUsuarios(users);

            atualizarSessao({ nome: name });
            session = obterSessao();

            renderHero();
            renderOverview();
            renderUserMenu();

            showMessage(message, "Dados atualizados.", "ok");
        });
    }

    function setupLicenseForm() {

        $("formLicenca").addEventListener("submit", event => {

            event.preventDefault();

            const message = $("msgLicenca");
            const type = $("licType").value;
            const number = $("licNumber").value.trim();
            const expiry = $("licExpiry").value;

            if (!number) return showMessage(message, "Informe o número do documento.");

            if (expiry && expiry < new Date().toISOString().slice(0, 10)) {
                return showMessage(message, "Este documento está vencido.");
            }

            const users = carregarUsuarios();
            const index = findUserIndex(users);

            if (index < 0) return showMessage(message, "Não encontramos sua conta. Entre novamente.");

            users[index].licenca = {
                tipo: type,
                numero: number,
                validade: expiry,
                status: "pendente",
                enviadoEm: new Date().toISOString()
            };

            salvarUsuarios(users);

            event.target.reset();
            renderLicense();
            renderOverview();

            showMessage(message, "Enviado! A loja vai analisar e liberar a compra.", "ok");
        });
    }

    function setupPasswordForm() {

        $("formSenha").addEventListener("submit", event => {

            event.preventDefault();

            const message = $("msgSenha");
            const current = $("pwdCurrent").value;
            const next = $("pwdNew").value;
            const confirmation = $("pwdConfirm").value;

            if (!current || !next || !confirmation) return showMessage(message, "Preencha todos os campos.");

            const users = carregarUsuarios();
            const index = findUserIndex(users);

            if (index < 0) return showMessage(message, "Não encontramos sua conta. Entre novamente.");
            if (users[index].senha !== current) return showMessage(message, "A senha atual está incorreta.");
            if (next.length < MIN_SENHA) return showMessage(message, `A nova senha precisa ter pelo menos ${MIN_SENHA} caracteres.`);
            if (next === current) return showMessage(message, "A nova senha precisa ser diferente da atual.");
            if (next !== confirmation) return showMessage(message, "A confirmação não é igual à nova senha.");

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

            if (users[index].perfil === "admin" && !users.some((user, i) => i !== index && user.perfil === "admin")) {
                showMessage(message, "Você é o único administrador. Crie outro administrador antes de excluir esta conta.");
                return null;
            }

            return { users, index };
        }

        form.addEventListener("submit", event => {

            event.preventDefault();
            showMessage(message, "");

            if (!validate()) return;

            deleteButton.hidden = true;
            confirmBox.hidden = false;
        });

        $("btnExcluirSim").addEventListener("click", () => {

            const result = validate();

            if (!result) {
                closeConfirmation();
                return;
            }

            const id = session.id;

            result.users.splice(result.index, 1);
            salvarUsuarios(result.users);

            // Remove também o carrinho e as avaliações da conta (pedidos ficam como histórico).
            salvarCarrinho([], id);
            salvarStorage(CHAVE_AVALIACOES, carregarAvaliacoes().filter(review => review.usuarioId !== id));

            localStorage.removeItem("emailLembrado");

            sair(false);

            window.location.replace(URL_LOJA);
        });

        $("btnExcluirNao").addEventListener("click", () => {
            closeConfirmation();
            showMessage(message, "");
        });
    }


    /* =========================================
       INICIALIZAÇÃO
    ========================================= */

    whenProductsReady(
        () => {
            productsReady = true;
            if (session) renderAll();
        },
        () => {
            productsFailed = true;
            if (session) renderAll();
        }
    );

    document.addEventListener("favorites:changed", () => {
        if (!session) return;
        renderFavorites();
        renderBadges();
        renderOverview();
    });

    document.addEventListener("cart:changed", () => {
        if (session) renderOverview();
    });

    document.addEventListener("session:ended", () => {
        window.location.replace(URL_LOJA);
    });

    document.addEventListener("DOMContentLoaded", () => {

        session = obterSessao();

        if (!session) {
            goToLogin();
            return;
        }

        $("accountPage").hidden = false;

        fillForms();

        setupPhoto();
        setupDataForm();
        setupLicenseForm();
        setupPasswordForm();
        setupDeleteForm();

        renderAll();
        showSection();

        window.addEventListener("hashchange", showSection);

        $("accLogout").addEventListener("click", () => {
            sair(false);
            window.location.href = URL_LOJA;
        });

        // Excluir avaliação própria.
        $("myReviews").addEventListener("click", event => {

            const button = event.target.closest("[data-review-delete]");

            if (button && confirm("Excluir esta avaliação?")) {
                excluirAvaliacao(button.dataset.reviewDelete);
                renderMyReviews();
                renderBadges();
                renderOverview();
            }
        });

        // Atualiza o resumo quando o carrinho muda (ou em outra aba).
        window.addEventListener("storage", event => {

            if (event.key === CHAVE_SESSAO && !obterSessao()) goToLogin();

            if (event.key === CHAVE_CARRINHOS || event.key === CHAVE_PEDIDOS || event.key === CHAVE_AVALIACOES) {
                renderAll();
            }
        });
    });

})();
