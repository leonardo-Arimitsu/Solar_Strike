"use strict";

/* =========================================================
   RASTREAMENTO DE MÉTRICAS (páginas da loja)
   Registra visitas, produtos vistos, buscas e carrinho em
   localStorage["eventos"] para o painel de métricas.

   Sem back-end os dados valem só para este navegador. Em
   produção, envie os mesmos eventos para um servidor ou
   use Google Analytics/Plausible.

   Depende de: utils.js, dados.js
========================================================= */

const MAX_EVENTOS = 5000;
const CHAVE_VISITANTE = "visitanteId";
const CHAVE_SESSAO_ANALYTICS = "sessaoAnalyticsId";
const CHAVE_ORIGEM = "origemSessao";

const REDES_SOCIAIS = ["facebook.", "instagram.", "t.co", "twitter.", "x.com", "youtube.", "tiktok.", "whatsapp.", "wa.me", "linkedin.", "pinterest."];
const BUSCADORES = ["google.", "bing.", "duckduckgo.", "yahoo.", "ecosia.", "brave."];

function obterVisitanteId() {
    let id = localStorage.getItem(CHAVE_VISITANTE);

    if (!id) {
        id = gerarIdUnico();
        try { localStorage.setItem(CHAVE_VISITANTE, id); } catch { /* ignora */ }
    }

    return id;
}

function obterSessaoAnalyticsId() {
    let id = sessionStorage.getItem(CHAVE_SESSAO_ANALYTICS);

    if (!id) {
        id = gerarIdUnico();
        try { sessionStorage.setItem(CHAVE_SESSAO_ANALYTICS, id); } catch { /* ignora */ }
    }

    return id;
}

/*
   Origem da visita, decidida uma vez por sessão:
   - ?utm_medium=cpc/ads, gclid, fbclid        → Campanhas de anúncios
   - ?utm_medium=promo/email ou ?origem=promo  → Links promocionais
   - ?utm_source / ?origem=instagram...        → Redes sociais
   - referência de buscador                    → Busca orgânica
   - referência de rede social                 → Redes sociais
   - sem referência                            → Direto
*/
function classificarOrigem() {

    const params = new URLSearchParams(window.location.search);
    const fonte = normalizeText(params.get("utm_source") || params.get("origem") || "");
    const meio = normalizeText(params.get("utm_medium") || "");
    const campanha = params.get("utm_campaign") || params.get("campanha") || "";

    if (meio === "cpc" || meio === "ads" || meio === "paid" || params.has("gclid") || params.has("fbclid")) {
        return { origem: "Campanhas de anúncios", campanha };
    }

    if (meio === "promo" || meio === "email" || fonte === "promo" || fonte === "email") {
        return { origem: "Links promocionais", campanha };
    }

    if (fonte) {
        return {
            origem: REDES_SOCIAIS.some(rede => fonte.includes(rede.replace(".", "")))
                ? "Redes sociais"
                : "Outros sites",
            campanha
        };
    }

    let host = "";

    try { host = document.referrer ? new URL(document.referrer).hostname : ""; } catch { /* ignora */ }

    if (!host) return { origem: "Direto", campanha };
    if (host === window.location.hostname) return null;      // navegação interna
    if (BUSCADORES.some(b => host.includes(b))) return { origem: "Busca orgânica", campanha };
    if (REDES_SOCIAIS.some(r => host.includes(r))) return { origem: "Redes sociais", campanha };

    return { origem: "Outros sites", campanha };
}

function origemAtual() {

    const salva = lerStorage(CHAVE_ORIGEM, null, sessionStorage);

    if (salva) return salva;

    const nova = classificarOrigem() || { origem: "Direto", campanha: "" };

    salvarStorage(CHAVE_ORIGEM, nova, sessionStorage);

    return nova;
}

function departamentoDaPagina() {
    const arquivo = window.location.pathname.split("/").pop();

    if (arquivo === "pesca.html") return "pesca";
    if (arquivo === "caca.html") return "caca";

    return "";
}

function rastrear(tipo, dados = {}) {

    try {
        const { origem, campanha } = origemAtual();

        const evento = {
            id: gerarIdUnico(),
            t: Date.now(),
            tipo,
            visitante: obterVisitanteId(),
            sessao: obterSessaoAnalyticsId(),
            pagina: window.location.pathname.split("/").pop() || "index.html",
            origem,
            campanha,
            ...dados
        };

        const eventos = lerStorage(CHAVE_EVENTOS, []);
        eventos.push(evento);

        // Mantém só os mais recentes para não encher o armazenamento.
        salvarStorage(CHAVE_EVENTOS, eventos.slice(-MAX_EVENTOS));

        return evento;

    } catch (erro) {
        console.warn("Rastreamento ignorado:", erro);
        return null;
    }
}

// Soma o tempo de permanência na página (em segundos) ao registro da visita.
function registrarPermanencia(eventoId, inicio) {

    const segundos = Math.min(1800, Math.round((Date.now() - inicio) / 1000));

    if (segundos < 1) return;

    const eventos = lerStorage(CHAVE_EVENTOS, []);
    const evento = eventos.find(e => e.id === eventoId);

    if (!evento) return;

    evento.duracao = segundos;
    salvarStorage(CHAVE_EVENTOS, eventos);
}

(function iniciarRastreamento() {

    // Visitas do próprio administrador não entram nas métricas.
    if (obterSessao()?.perfil === "admin") return;

    const inicio = Date.now();
    const visita = rastrear("pageview", { depto: departamentoDaPagina() });

    if (!visita) return;

    let enviado = false;

    const finalizar = () => {
        if (enviado) return;
        enviado = true;
        registrarPermanencia(visita.id, inicio);
    };

    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") finalizar();
    });

    window.addEventListener("pagehide", finalizar);
})();
