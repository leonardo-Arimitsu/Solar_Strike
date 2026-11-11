/* ========================================
   CONFIGURAÇÃO
======================================== */

const CHAVE_STORAGE = "manutencoes";
const URL_DASHBOARD = "/DASHBOARD/dashboard.html"; 

/* ========================================
   ELEMENTOS
======================================== */

const form = document.getElementById("formManutencao");
const tabela = document.getElementById("tabela");
const busca = document.getElementById("busca");
const mensagemErro = document.getElementById("mensagemErro");
const tituloFormulario = document.getElementById("tituloFormulario");
const btnSalvar = document.getElementById("btnSalvar");

const campos = {
    id: document.getElementById("id"),
    equipamento: document.getElementById("equipamento"),
    tipo: document.getElementById("tipo"),
    responsavel: document.getElementById("responsavel"),
    data: document.getElementById("data"),
    custo: document.getElementById("custo"),
    status: document.getElementById("status"),
    descricao: document.getElementById("descricao"),
};

const obrigatorios = ["equipamento", "tipo", "responsavel", "data", "custo", "status"];

/* ========================================
   ARMAZENAMENTO
   Troque estas duas funções por chamadas à API
   (fetch) se o projeto usar back-end.
======================================== */

function carregarManutencoes() {
    try {
        return JSON.parse(localStorage.getItem(CHAVE_STORAGE)) || [];
    } catch {
        return [];
    }
}

function salvarManutencoes(lista) {
    localStorage.setItem(CHAVE_STORAGE, JSON.stringify(lista));
}

/* ========================================
   UTILITÁRIOS
======================================== */

function escapeHTML(texto) {
    const div = document.createElement("div");
    div.textContent = texto ?? "";
    return div.innerHTML;
}

function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
    });
}

function formatarData(iso) {
    if (!iso) return "-";
    const [ano, mes, dia] = iso.split("-");
    return `${dia}/${mes}/${ano}`;
}

function classeStatus(status) {
    if (status === "Concluída") return "badge--concluida";
    if (status === "Em andamento") return "badge--andamento";
    return "badge--pendente";
}

function gerarId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ========================================
   NAVEGAÇÃO
======================================== */

function voltarDashboard() {
    window.location.href = URL_DASHBOARD;
}

/* ========================================
   FORMULÁRIO
======================================== */

function mostrarErro(texto) {
    mensagemErro.textContent = texto;
    mensagemErro.hidden = !texto;
}

function validar() {
    let valido = true;

    obrigatorios.forEach((nome) => {
        const campo = campos[nome];
        const vazio = !String(campo.value).trim();
        campo.classList.toggle("invalido", vazio);
        if (vazio) valido = false;
    });

    if (valido && Number(campos.custo.value) < 0) {
        campos.custo.classList.add("invalido");
        mostrarErro("O custo não pode ser negativo.");
        return false;
    }

    mostrarErro(valido ? "" : "Preencha todos os campos obrigatórios.");
    return valido;
}

function limparFormulario() {
    form.reset();
    campos.id.value = "";
    campos.status.value = "Pendente";
    Object.values(campos).forEach((c) => c.classList.remove("invalido"));
    mostrarErro("");
    tituloFormulario.textContent = "Nova manutenção";
    btnSalvar.textContent = "Salvar manutenção";
}

form.addEventListener("submit", (evento) => {
    evento.preventDefault();
    if (!validar()) return;

    const registro = {
        id: campos.id.value || gerarId(),
        equipamento: campos.equipamento.value.trim(),
        tipo: campos.tipo.value,
        responsavel: campos.responsavel.value.trim(),
        data: campos.data.value,
        custo: Number(campos.custo.value),
        status: campos.status.value,
        descricao: campos.descricao.value.trim(),
    };

    const lista = carregarManutencoes();
    const indice = lista.findIndex((m) => m.id === registro.id);

    if (indice >= 0) lista[indice] = registro;
    else lista.push(registro);

    salvarManutencoes(lista);
    limparFormulario();
    renderizar();
});

Object.values(campos).forEach((campo) => {
    campo.addEventListener("input", () => campo.classList.remove("invalido"));
});

/* ========================================
   EDITAR / EXCLUIR
======================================== */

function editarManutencao(id) {
    const registro = carregarManutencoes().find((m) => m.id === id);
    if (!registro) return;

    Object.keys(campos).forEach((chave) => {
        campos[chave].value = registro[chave] ?? "";
    });

    tituloFormulario.textContent = "Editar manutenção";
    btnSalvar.textContent = "Atualizar manutenção";
    form.scrollIntoView({ behavior: "smooth", block: "start" });
    campos.equipamento.focus({ preventScroll: true });
}

function excluirManutencao(id) {
    const registro = carregarManutencoes().find((m) => m.id === id);
    if (!registro) return;

    if (!confirm(`Excluir a manutenção de "${registro.equipamento}"?`)) return;

    salvarManutencoes(carregarManutencoes().filter((m) => m.id !== id));
    if (campos.id.value === id) limparFormulario();
    renderizar();
}

// Delegação de eventos para os botões da tabela
tabela.addEventListener("click", (evento) => {
    const botao = evento.target.closest("button[data-acao]");
    if (!botao) return;

    const { acao, id } = botao.dataset;
    if (acao === "editar") editarManutencao(id);
    if (acao === "excluir") excluirManutencao(id);
});

/* ========================================
   RENDERIZAÇÃO
======================================== */

function atualizarResumo(lista) {
    const contar = (status) => lista.filter((m) => m.status === status).length;

    document.getElementById("totalPendente").textContent = contar("Pendente");
    document.getElementById("totalAndamento").textContent = contar("Em andamento");
    document.getElementById("totalConcluida").textContent = contar("Concluída");
    document.getElementById("totalCusto").textContent = formatarMoeda(
        lista.reduce((soma, m) => soma + m.custo, 0)
    );
}

function renderizar() {
    const todas = carregarManutencoes();
    const termo = busca.value.trim().toLowerCase();

    const filtradas = todas
        .filter((m) =>
            !termo ||
            m.equipamento.toLowerCase().includes(termo) ||
            m.responsavel.toLowerCase().includes(termo)
        )
        .sort((a, b) => b.data.localeCompare(a.data));

    atualizarResumo(todas);

    if (filtradas.length === 0) {
        tabela.innerHTML = `
            <tr>
                <td class="vazio" colspan="7">
                    ${todas.length === 0
                        ? "Nenhuma manutenção cadastrada. Preencha o formulário acima para começar."
                        : "Nenhum resultado para a busca."}
                </td>
            </tr>`;
        return;
    }

    tabela.innerHTML = filtradas
        .map((m) => `
            <tr>
                <td>
                    <strong>${escapeHTML(m.equipamento)}</strong>
                    ${m.descricao ? `<span class="descricao-linha">${escapeHTML(m.descricao)}</span>` : ""}
                </td>
                <td>${escapeHTML(m.tipo)}</td>
                <td>${escapeHTML(m.responsavel)}</td>
                <td>${formatarData(m.data)}</td>
                <td>${formatarMoeda(m.custo)}</td>
                <td><span class="badge ${classeStatus(m.status)}">${escapeHTML(m.status)}</span></td>
                <td>
                    <div class="acoes">
                        <button type="button" class="btn-acao btn-editar" data-acao="editar" data-id="${m.id}">Editar</button>
                        <button type="button" class="btn-acao btn-excluir" data-acao="excluir" data-id="${m.id}">Excluir</button>
                    </div>
                </td>
            </tr>`)
        .join("");
}

busca.addEventListener("input", renderizar);

/* ========================================
   INICIALIZAÇÃO
======================================== */

limparFormulario();
renderizar();