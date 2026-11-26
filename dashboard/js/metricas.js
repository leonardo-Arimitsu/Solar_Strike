"use strict";

/* =========================================================
   MÉTRICAS E INDICADORES
   Lê o que a loja registra no navegador (eventos, pedidos,
   avaliações, usuários) e calcula os indicadores do briefing.

   Definições usadas:
   - Venda: pedido Pago, Enviado ou Entregue.
   - Taxa de saída: sessões com uma única página ÷ sessões.
   - Conversão: vendas pelo site ÷ sessões.
   - Novo visitante: primeira visita dentro do período.
========================================================= */

const NOMES_PAGINAS = {
    "index.html": "Home",
    "pesca.html": "Pesca",
    "caca.html": "Caça",
    "produto.html": "Página de produto",
    "conta.html": "Minha conta"
};

const DIA = 24 * 60 * 60 * 1000;

const $ = id => document.getElementById(id);

let catalogo = [];


/* ---------- Leitura de dados ---------- */

function dados() {

    const dias = Number($("periodo").value);
    const inicio = dias ? Date.now() - dias * DIA : 0;

    const eventos = lerStorage(CHAVE_EVENTOS, []);
    const pedidos = carregarPedidos();
    const avaliacoes = carregarAvaliacoes();

    return {
        dias,
        inicio,
        eventosTodos: eventos,
        eventos: eventos.filter(e => e.t >= inicio),
        pedidos: pedidos.filter(p => new Date(p.criadoEm).getTime() >= inicio),
        pedidosTodos: pedidos,
        avaliacoes: avaliacoes.filter(a => new Date(a.criadoEm).getTime() >= inicio),
        avaliacoesTodas: avaliacoes
    };
}

function nomeProduto(id) {
    return catalogo.find(p => String(p.id) === String(id))?.nome || id;
}

const somaTotal = pedidos => pedidos.reduce((soma, p) => soma + p.total, 0);

const vendas = pedidos => pedidos.filter(pedidoContaComoVenda);

function pct(valor) {
    return `${(valor * 100).toFixed(1).replace(".", ",")}%`;
}

function kpi(rotulo, valor) {
    return `<div class="kpi"><strong>${escapeHTML(valor)}</strong><span>${escapeHTML(rotulo)}</span></div>`;
}

function formatarDuracao(segundos) {

    if (!segundos) return "—";

    const min = Math.floor(segundos / 60);

    return min ? `${min}min ${Math.round(segundos % 60)}s` : `${Math.round(segundos)}s`;
}


/* ---------- Acessos ---------- */

function sessoesDe(eventos) {

    const mapa = new Map();

    eventos.forEach(e => {
        if (!mapa.has(e.sessao)) mapa.set(e.sessao, { sessao: e.sessao, visitante: e.visitante, origem: e.origem, campanha: e.campanha, paginas: 0, deptos: new Set() });

        const s = mapa.get(e.sessao);

        if (e.tipo === "pageview") s.paginas += 1;
        if (e.depto) s.deptos.add(e.depto);
    });

    return mapa;
}

function renderAcessos(d) {

    const views = d.eventos.filter(e => e.tipo === "pageview");
    const sessoes = sessoesDe(d.eventos);
    const visitantes = new Set(d.eventos.map(e => e.visitante));

    // Primeira aparição de cada visitante em todo o histórico.
    const primeira = new Map();

    d.eventosTodos.forEach(e => {
        if (!primeira.has(e.visitante) || e.t < primeira.get(e.visitante)) primeira.set(e.visitante, e.t);
    });

    const novos = [...visitantes].filter(v => primeira.get(v) >= d.inicio).length;
    const recorrentes = visitantes.size - novos;

    const duracoes = views.map(e => e.duracao).filter(Boolean);
    const mediaTempo = duracoes.length ? duracoes.reduce((a, b) => a + b, 0) / duracoes.length : 0;

    const saidas = [...sessoes.values()].filter(s => s.paginas <= 1).length;

    $("kpisAcessos").innerHTML =
        kpi("Visitantes", visitantes.size) +
        kpi("Novos", novos) +
        kpi("Recorrentes", recorrentes) +
        kpi("Visitas (páginas vistas)", views.length) +
        kpi("Tempo médio por página", formatarDuracao(mediaTempo)) +
        kpi("Taxa de saída", sessoes.size ? pct(saidas / sessoes.size) : "—");

    desenharBarras($("paginasTop"),
        topN(contarPor(views, e => NOMES_PAGINAS[e.pagina] || e.pagina), 6)
            .map(([rotulo, valor]) => ({ rotulo, valor })));

    desenharBarras($("origemAcessos"),
        topN(contarPor([...sessoes.values()], "origem"), 8)
            .map(([rotulo, valor]) => ({ rotulo, valor, texto: `${valor} sessões` })));

    return sessoes;
}


/* ---------- Vendas ---------- */

function renderVendas(d, sessoes) {

    const v = vendas(d.pedidos);
    const doSite = v.filter(p => p.canal === "Site");
    const faturamento = somaTotal(v);
    const itens = v.reduce((s, p) => s + p.itens.reduce((x, i) => x + i.quantidade, 0), 0);

    $("kpisVendas").innerHTML =
        kpi("Vendas totais", v.length) +
        kpi("Vendas pelo site", doSite.length) +
        kpi("Faturamento", formatMoney(faturamento)) +
        kpi("Faturamento pelo site", formatMoney(somaTotal(doSite))) +
        kpi("Ticket médio", v.length ? formatMoney(faturamento / v.length) : "—") +
        kpi("Produtos vendidos", itens) +
        kpi("Taxa de conversão", sessoes.size ? pct(doSite.length / sessoes.size) : "—") +
        kpi("Aguardando pagamento", d.pedidos.filter(p => p.status === "Aguardando pagamento").length);

    // Faturamento por dia.
    const dias = d.dias || 30;
    const colunas = [];

    for (let i = dias - 1; i >= 0; i--) {
        const dia = new Date(Date.now() - i * DIA);
        const chave = dia.toISOString().slice(0, 10);

        colunas.push({
            rotulo: dia.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
            chave,
            valor: 0
        });
    }

    v.forEach(p => {
        const alvo = colunas.find(c => c.chave === new Date(p.criadoEm).toISOString().slice(0, 10));
        if (alvo) alvo.valor += p.total;
    });

    desenharColunas($("graficoVendas"), colunas, formatMoney);

    // Origem das vendas.
    const porOrigem = new Map();

    v.forEach(p => {
        const atual = porOrigem.get(p.origem || "Direto") || { qtd: 0, valor: 0 };
        atual.qtd += 1;
        atual.valor += p.total;
        porOrigem.set(p.origem || "Direto", atual);
    });

    desenharBarras($("origemVendas"),
        [...porOrigem.entries()].sort((a, b) => b[1].valor - a[1].valor)
            .map(([rotulo, x]) => ({ rotulo, valor: x.valor, texto: `${x.qtd} · ${formatMoney(x.valor)}` })));

    // Campanhas.
    const camp = new Map();

    [...sessoes.values()].filter(s => s.campanha).forEach(s => {
        const c = camp.get(s.campanha) || { sessoes: 0, vendas: 0, valor: 0 };
        c.sessoes += 1;
        camp.set(s.campanha, c);
    });

    doSite.filter(p => p.campanha).forEach(p => {
        const c = camp.get(p.campanha) || { sessoes: 0, vendas: 0, valor: 0 };
        c.vendas += 1;
        c.valor += p.total;
        camp.set(p.campanha, c);
    });

    $("campanhas").innerHTML = camp.size
        ? `<table><thead><tr><th>Campanha</th><th>Sessões</th><th>Vendas</th><th>Receita</th><th>Conversão</th></tr></thead><tbody>${
            [...camp.entries()].sort((a, b) => b[1].valor - a[1].valor).map(([nome, c]) =>
                `<tr><td>${escapeHTML(nome)}</td><td>${c.sessoes}</td><td>${c.vendas}</td><td>${formatMoney(c.valor)}</td><td>${c.sessoes ? pct(c.vendas / c.sessoes) : "—"}</td></tr>`).join("")
        }</tbody></table>`
        : `<p class="vazio">Nenhuma campanha no período. Use links como ?utm_source=instagram&utm_campaign=natal.</p>`;
}


/* ---------- Meta de crescimento ---------- */

function renderMeta() {

    const meta = lerStorage(CHAVE_META, { base: 0, pct: 35 });

    $("metaBase").value = meta.base || "";
    $("metaPct").value = meta.pct || 35;

    const ultimos30 = vendas(carregarPedidos()).filter(p => new Date(p.criadoEm).getTime() >= Date.now() - 30 * DIA);
    const atual = somaTotal(ultimos30);

    if (!meta.base) {
        $("metaVisual").innerHTML = `<p class="vazio">Informe o faturamento mensal de referência para acompanhar a meta. Faturamento dos últimos 30 dias: <strong>${formatMoney(atual)}</strong>.</p>`;
        return;
    }

    const alvo = meta.base * (1 + meta.pct / 100);
    const crescimento = (atual / meta.base - 1) * 100;
    const progresso = Math.max(0, Math.min(100, (crescimento / meta.pct) * 100));

    $("metaVisual").innerHTML = `
        <div class="meta-trilho"><i style="width:${progresso}%"></i></div>
        <div class="meta-linha">
            <div><small>Vendas atuais (30 dias)</small><strong>${formatMoney(atual)}</strong></div>
            <div><small>Meta: +${meta.pct}%</small><strong>${formatMoney(alvo)}</strong></div>
            <div><small>Crescimento atual</small><strong>${crescimento >= 0 ? "+" : ""}${crescimento.toFixed(1).replace(".", ",")}%</strong></div>
            <div><small>Progresso da meta</small><strong>${Math.round((crescimento / meta.pct) * 100)}%</strong></div>
        </div>`;
}


/* ---------- Produtos e departamentos ---------- */

function resumoDepartamento(d, depto, sessoes) {

    const ids = new Set(catalogo.filter(p => p.categoria === depto).map(p => String(p.id)));
    const v = vendas(d.pedidos);
    const pedidosDepto = v.filter(p => p.itens.some(i => i.categoria === depto));
    const itensDepto = pedidosDepto.flatMap(p => p.itens.filter(i => i.categoria === depto));
    const faturamento = itensDepto.reduce((s, i) => s + i.preco * i.quantidade, 0);

    const visitasPagina = d.eventos.filter(e => e.tipo === "pageview" && e.depto === depto).length;
    const vistos = d.eventos.filter(e => e.tipo === "produto" && e.depto === depto);
    const buscas = d.eventos.filter(e => e.tipo === "busca" && e.depto === depto);

    const sessoesDepto = [...sessoes.values()].filter(s => s.deptos.has(depto)).length;
    const vendasSite = pedidosDepto.filter(p => p.canal === "Site").length;

    const notas = d.avaliacoesTodas.filter(a => ids.has(String(a.produtoId)));
    const media = notas.length ? notas.reduce((s, a) => s + a.nota, 0) / notas.length : 0;

    const vendidos = new Map();

    itensDepto.forEach(i => vendidos.set(i.id, (vendidos.get(i.id) || 0) + i.quantidade));

    return { faturamento, pedidos: pedidosDepto.length, ticket: pedidosDepto.length ? faturamento / pedidosDepto.length : 0, acessos: visitasPagina + vistos.length, vistos, buscas, media, totalNotas: notas.length, vendidos, conversao: sessoesDepto ? vendasSite / sessoesDepto : null };
}

function renderDepartamentos(d, sessoes) {

    const dados = { pesca: resumoDepartamento(d, "pesca", sessoes), caca: resumoDepartamento(d, "caca", sessoes) };

    ["pesca", "caca"].forEach(depto => {

        const x = dados[depto];
        const alvo = $(depto === "pesca" ? "deptoPesca" : "deptoCaca");

        alvo.innerHTML = `
            <div class="kpis">
                ${kpi("Acessos", x.acessos)}
                ${kpi("Faturamento", formatMoney(x.faturamento))}
                ${kpi("Ticket médio", x.pedidos ? formatMoney(x.ticket) : "—")}
                ${kpi("Avaliação média", x.totalNotas ? `${x.media.toFixed(1).replace(".", ",")} ★` : "—")}
                ${kpi("Conversão", x.conversao === null ? "—" : pct(x.conversao))}
            </div>
            <h3>Mais visualizados</h3><div data-r="vistos"></div>
            <h3>Mais vendidos</h3><div data-r="vendidos"></div>
            <h3>Mais pesquisados</h3><div data-r="buscas"></div>`;

        desenharBarras(alvo.querySelector('[data-r="vistos"]'),
            topN(contarPor(x.vistos, "produtoId"), 5).map(([id, valor]) => ({ rotulo: nomeProduto(id), valor })));

        desenharBarras(alvo.querySelector('[data-r="vendidos"]'),
            topN(x.vendidos, 5).map(([id, valor]) => ({ rotulo: nomeProduto(id), valor, texto: `${valor} un.` })));

        desenharBarras(alvo.querySelector('[data-r="buscas"]'),
            topN(contarPor(x.buscas, "termo"), 5).map(([rotulo, valor]) => ({ rotulo, valor })));
    });

    const p = dados.pesca.faturamento, c = dados.caca.faturamento;

    $("deptoResumo").textContent = p === 0 && c === 0
        ? "Ainda não há vendas nos departamentos neste período."
        : `Maior faturamento no período: ${p >= c ? "Pesca" : "Caça"} (${formatMoney(Math.max(p, c))} contra ${formatMoney(Math.min(p, c))}).`;
}

function renderProdutos(d) {

    desenharBarras($("topVistos"), topN(contarPor(d.eventos.filter(e => e.tipo === "produto"), "produtoId"), 5)
        .map(([id, valor]) => ({ rotulo: nomeProduto(id), valor })));

    desenharBarras($("topCarrinho"), topN(contarPor(d.eventos.filter(e => e.tipo === "carrinho"), "produtoId"), 5)
        .map(([id, valor]) => ({ rotulo: nomeProduto(id), valor })));

    const vendidos = new Map();

    vendas(d.pedidos).forEach(p => p.itens.forEach(i => vendidos.set(i.id, (vendidos.get(i.id) || 0) + i.quantidade)));

    desenharBarras($("topVendidos"), topN(vendidos, 5).map(([id, valor]) => ({ rotulo: nomeProduto(id), valor, texto: `${valor} un.` })));

    desenharBarras($("topBuscas"), topN(contarPor(d.eventos.filter(e => e.tipo === "busca"), "termo"), 5)
        .map(([rotulo, valor]) => ({ rotulo, valor })));

    const resumo = resumoAvaliacoes(d.avaliacoesTodas);

    desenharBarras($("topAvaliacoes"), Object.entries(resumo).sort((a, b) => b[1].total - a[1].total).slice(0, 5)
        .map(([id, r]) => ({ rotulo: nomeProduto(id), valor: r.total, texto: `${r.total} aval.` })));

    desenharBarras($("topNota"), Object.entries(resumo).sort((a, b) => b[1].media - a[1].media || b[1].total - a[1].total).slice(0, 5)
        .map(([id, r]) => ({ rotulo: nomeProduto(id), valor: r.media, texto: `${r.media.toFixed(1).replace(".", ",")} ★ (${r.total})` })));

    const baixos = catalogo
        .map(p => ({ ...p, estoque: parseInt(p.estoque, 10) || 0 }))
        .filter(p => p.estoque <= 5 && p.status !== "descontinuado")
        .sort((a, b) => a.estoque - b.estoque);

    $("estoqueBaixo").innerHTML = baixos.length
        ? `<table><thead><tr><th>Produto</th><th>Departamento</th><th>Estoque</th></tr></thead><tbody>${
            baixos.map(p => `<tr><td>${escapeHTML(p.nome)}</td><td>${p.categoria === "caca" ? "Caça" : "Pesca"}</td><td>${p.estoque === 0 ? "Esgotado" : p.estoque}</td></tr>`).join("")
        }</tbody></table>`
        : `<p class="vazio">Nenhum produto com estoque baixo.</p>`;
}


/* ---------- Clientes ---------- */

function renderClientes(d) {

    // Primeira aparição de cada cliente: cadastro ou primeiro pedido.
    const primeira = new Map();
    const chaveCliente = p => p.usuarioId || p.email || p.nome;

    carregarUsuarios().filter(u => u.perfil !== "admin").forEach(u => primeira.set(u.id, new Date(u.criadoEm).getTime()));

    d.pedidosTodos.forEach(p => {
        const chave = chaveCliente(p);
        const t = new Date(p.criadoEm).getTime();

        if (!primeira.has(chave) || t < primeira.get(chave)) primeira.set(chave, t);
    });

    const novos = [...primeira.values()].filter(t => t >= d.inicio).length;

    const comprasPorCliente = contarPor(vendas(d.pedidosTodos), chaveCliente);
    const recorrentes = [...comprasPorCliente.values()].filter(n => n >= 2).length;

    $("kpisClientes").innerHTML =
        kpi("Novos clientes", novos) +
        kpi("Clientes recorrentes (2+ compras)", recorrentes) +
        kpi("Avaliações no período", d.avaliacoes.length) +
        kpi("Licenças pendentes", carregarUsuarios().filter(u => u.licenca?.status === "pendente").length);
}


/* ---------- Dados de demonstração ---------- */

function atualizarAvisoDemo() {

    const existe =
        lerStorage(CHAVE_EVENTOS, []).some(e => e.demo) ||
        carregarPedidos().some(p => p.demo) ||
        carregarAvaliacoes().some(a => a.demo);

    $("avisoDemo").hidden = !existe;
    $("btnLimparDemo").hidden = !existe;
    $("btnDemo").hidden = existe;
}

const sortear = lista => lista[Math.floor(Math.random() * lista.length)];
const entre = (min, max) => Math.floor(min + Math.random() * (max - min + 1));

function gerarDemo() {

    const produtos = catalogo.filter(p => !p.controlado && p.status !== "descontinuado");

    if (!produtos.length) return alert("Cadastre produtos antes.");

    const origens = [["Direto", 4], ["Busca orgânica", 5], ["Redes sociais", 4], ["Campanhas de anúncios", 3], ["Links promocionais", 1]]
        .flatMap(([nome, peso]) => Array(peso).fill(nome));
    const campanhas = ["", "", "natal-2026", "promo-vara", "instagram-reels"];
    const termos = ["vara", "carretilha", "isca tucunare", "mochila", "jaqueta", "binoculo", "lanterna"];
    const paginas = ["index.html", "pesca.html", "caca.html"];

    const eventos = [];
    const visitantes = Array.from({ length: 140 }, () => gerarIdUnico());

    for (let dia = 0; dia < 45; dia++) {

        const sessoes = entre(6, 16) + (dia < 30 ? 4 : 0);

        for (let s = 0; s < sessoes; s++) {

            const visitante = sortear(visitantes);
            const sessao = gerarIdUnico();
            const origem = sortear(origens);
            const campanha = origem === "Campanhas de anúncios" || origem === "Redes sociais" ? sortear(campanhas) : "";
            const base = Date.now() - dia * DIA - entre(0, 20) * 3600000;
            const paginasVistas = Math.random() < 0.35 ? 1 : entre(2, 5);

            for (let i = 0; i < paginasVistas; i++) {

                const pagina = i === 0 ? "index.html" : sortear(paginas);
                const depto = pagina === "pesca.html" ? "pesca" : pagina === "caca.html" ? "caca" : "";
                const t = base + i * 60000;

                eventos.push({ id: gerarIdUnico(), t, tipo: "pageview", visitante, sessao, pagina, origem, campanha, depto, duracao: entre(8, 140), demo: true });

                if (depto && Math.random() < 0.6) {
                    const alvo = sortear(produtos.filter(p => p.categoria === depto));
                    eventos.push({ id: gerarIdUnico(), t: t + 20000, tipo: "produto", visitante, sessao, pagina: "produto.html", origem, campanha, produtoId: alvo.id, depto, demo: true });
                    if (Math.random() < 0.3) eventos.push({ id: gerarIdUnico(), t: t + 40000, tipo: "carrinho", visitante, sessao, pagina: "produto.html", origem, campanha, produtoId: alvo.id, depto, demo: true });
                    if (Math.random() < 0.25) eventos.push({ id: gerarIdUnico(), t: t + 5000, tipo: "busca", visitante, sessao, pagina, origem, campanha, termo: sortear(termos), depto, demo: true });
                }
            }
        }
    }

    // Pedidos: o último mês vende mais que o anterior (mostra crescimento na meta).
    const pedidos = carregarPedidos();
    const clientes = Array.from({ length: 18 }, (_, i) => ({ id: `demo-${i}`, nome: `Cliente demo ${i + 1}`, email: `demo${i}@exemplo.com` }));

    for (let dia = 0; dia < 60; dia++) {

        const quantidade = dia < 30 ? entre(0, 2) + (Math.random() < 0.5 ? 1 : 0) : entre(0, 2);

        for (let n = 0; n < quantidade; n++) {

            const origem = sortear([...origens, "Loja física", "Loja física"]);
            const fisica = origem === "Loja física";
            const itens = Array.from({ length: entre(1, 3) }, () => {
                const p = sortear(produtos);
                return { id: p.id, nome: p.nome, preco: Number(p.preco) || 0, quantidade: entre(1, 2), categoria: p.categoria, subcategoria: p.subcategoria };
            });

            const cliente = sortear(clientes);

            pedidos.push({
                id: gerarNumeroPedido() + gerarIdUnico().slice(-2).toUpperCase(),
                usuarioId: cliente.id, nome: cliente.nome, email: cliente.email,
                canal: fisica ? "Loja física" : "Site",
                origem,
                campanha: !fisica && origem === "Campanhas de anúncios" ? sortear(campanhas.filter(Boolean)) : "",
                status: sortear(["Pago", "Pago", "Enviado", "Entregue", "Entregue"]),
                itens, total: itens.reduce((s, i) => s + i.preco * i.quantidade, 0),
                criadoEm: new Date(Date.now() - dia * DIA - entre(0, 20) * 3600000).toISOString(),
                demo: true
            });
        }
    }

    const avaliacoes = carregarAvaliacoes();

    for (let i = 0; i < 14; i++) {
        const p = sortear(produtos);
        avaliacoes.push({ id: gerarIdUnico(), produtoId: String(p.id), usuarioId: `demo-${i}`, nome: `Cliente demo ${i + 1}`, nota: sortear([3, 4, 4, 5, 5, 5]), texto: sortear(["Muito bom, recomendo.", "Chegou rápido e bem embalado.", "Ótimo custo-benefício.", "Qualidade excelente para o preço."]), criadoEm: new Date(Date.now() - entre(0, 40) * DIA).toISOString(), demo: true });
    }

    salvarStorage(CHAVE_EVENTOS, [...lerStorage(CHAVE_EVENTOS, []), ...eventos].slice(-20000));
    salvarPedidos(pedidos);
    salvarStorage(CHAVE_AVALIACOES, avaliacoes);

    // Referência = faturamento do mês anterior (dias 31 a 60), para a meta aparecer preenchida.
    const anterior = pedidos.filter(p => p.demo && pedidoContaComoVenda(p)).filter(p => {
        const idade = (Date.now() - new Date(p.criadoEm).getTime()) / DIA;
        return idade >= 30 && idade < 60;
    });

    if (!lerStorage(CHAVE_META, null)?.base) salvarStorage(CHAVE_META, { base: Math.round(somaTotal(anterior)), pct: 35 });
}

function removerDemo() {

    salvarStorage(CHAVE_EVENTOS, lerStorage(CHAVE_EVENTOS, []).filter(e => !e.demo));
    salvarPedidos(carregarPedidos().filter(p => !p.demo));
    salvarStorage(CHAVE_AVALIACOES, carregarAvaliacoes().filter(a => !a.demo));
}


/* ---------- Inicialização ---------- */

function renderTudo() {

    const d = dados();
    const sessoes = renderAcessos(d);

    renderVendas(d, sessoes);
    renderDepartamentos(d, sessoes);
    renderProdutos(d);
    renderClientes(d);
    renderMeta();
    atualizarAvisoDemo();
}

$("periodo").addEventListener("change", renderTudo);

$("btnMeta").addEventListener("click", () => {

    const base = Number($("metaBase").value) || 0;
    const pctMeta = Number($("metaPct").value) || 35;

    salvarStorage(CHAVE_META, { base, pct: pctMeta });
    renderMeta();
});

$("btnDemo").addEventListener("click", () => {
    gerarDemo();
    renderTudo();
});

$("btnLimparDemo").addEventListener("click", () => {
    if (!confirm("Remover todos os dados de demonstração?")) return;
    removerDemo();
    renderTudo();
});

carregarCatalogoAdmin().then(lista => {
    catalogo = lista;
    renderTudo();
});
