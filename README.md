# Homo Habilis — Caça & Pesca

Site da loja (vitrine + conta do cliente) e painel administrativo.
Projeto 100% front-end: dados ficam no `localStorage` do navegador.

## Como rodar

Abra a **pasta raiz** (`Solar_Strike/`) no VS Code e use o **Live Server** (porta 5509, já configurada em `.vscode/settings.json`).
Os caminhos começam em `/`, então o servidor precisa servir a raiz do projeto. Abrir os arquivos com duplo clique não funciona.

Contas de demonstração (`shared/data/usuarios.json`):

| Perfil | E-mail | Senha |
|---|---|---|
| Administrador | admin@homohabilis.com | Admin@2026 |
| Cliente | carlos@homohabilis.com | Pesca@1234 |

## Estrutura

```
Solar_Strike/
├── index.html                 → redireciona para a loja
├── shared/                    → usado por todas as áreas
│   ├── js/utils.js            → escapeHTML, formatMoney, storage seguro, tokens…
│   ├── js/auth.js             → usuários, sessão, guardas, recuperação de senha
│   ├── js/dados.js            → carrinho por cliente, pedidos, avaliações, licença, contato
│   ├── js/analytics.js        → rastreio de visitas/origem (métricas)
│   ├── data/produtos.json     → catálogo de exemplo
│   ├── data/usuarios.json     → usuários de exemplo
│   ├── data/videos.json       → vídeos da home (preencha o campo youtube)
│   └── img/                   → ícones
├── loja/                      → site do cliente
│   ├── html/  index · pesca · caca · produto · conta
│   ├── css/
│   └── js/    loja.js (núcleo) · home.js · catalogo.js · produto.js · conta.js
├── login/                     → login, cadastro, esqueci/redefinir senha
│   └── html/ css/ js/login.js
└── dashboard/                 → painel administrativo (só perfil admin)
    ├── html/ css/
    └── js/    guard.js · metricas.js · pedidos.js · licencas.js · avaliacoes.js · produtos.js · …
```

**Ordem dos scripts** (sempre assim): `utils.js` → `auth.js` → `dados.js` → `analytics.js` → `loja.js` → script da página.


## O que o briefing pede e onde está

| Briefing | Onde |
|---|---|
| Pesca × Caça, subcategorias, filtros (marca, preço, avaliação, estoque) | `loja/html/pesca.html`, `caca.html`, `catalogo.js` |
| Home: ofertas, mais vendidos, novidades, vídeos, avaliações, sobre, contato | `loja/html/index.html`, `home.js` |
| Página de produto: fotos, vídeo, specs, marca, estoque, avaliações, relacionados | `produto.js` |
| Avaliações 1–5 ★ (1 por cliente/produto, "compra verificada") | `dados.js`, `produto.js`, painel Avaliações |
| Produtos regulamentados (aviso, licença, restrição de compra, aprovação) | campo "controlado" no cadastro; Minha conta › Licença; painel Licenças |
| Carrinho **por cliente** em JSON | `localStorage["carrinhos"]` (`{ idDoCliente: { itens } }`); baixável em Painel › Pedidos |
| Pedidos e histórico | checkout cria pedido e baixa estoque; Minha conta › Pedidos |
| Origem das vendas (site, loja física, redes, anúncios, busca, promo) | `analytics.js` (UTM/referência) e venda manual no painel |
| Métricas, Pesca × Caça, meta de +35% | Painel › Métricas |
| Minha conta: foto, dados, pedidos, avaliações, favoritos, licença | `loja/html/conta.html`, `conta.js` |

## Configurar

- **WhatsApp e redes:** edite `LOJA_CONFIG` em `shared/js/dados.js` (número com DDI+DDD). Vazio = o botão usa e-mail.
- **Vídeos da home:** preencha `youtube` em `shared/data/videos.json` (link do YouTube).
- **Rastrear campanhas:** use links como `.../index.html?utm_source=instagram&utm_campaign=natal`.
  `utm_medium=cpc` → anúncios; `utm_medium=promo` → link promocional.
- **Dados de demonstração:** Painel › Métricas › "Gerar dados de demonstração" (e "Remover" depois).

## Definições das métricas

Venda = pedido Pago/Enviado/Entregue · Taxa de saída = sessões de 1 página ÷ sessões · Conversão = vendas do site ÷ sessões ·
Meta = faturamento dos últimos 30 dias ÷ faturamento mensal de referência (você informa) − 1.

## Como os dados se conectam

- O **dashboard** grava o catálogo em `localStorage["produtos"]`.
- A **loja** lê esse mesmo catálogo (se não existir, usa `shared/data/produtos.json`).
- Produto com status `indisponivel` aparece sem estoque; `descontinuado` some da loja.
- Para voltar ao catálogo de exemplo: DevTools → Application → Local Storage → apagar `produtos`.

## Limitações conhecidas

- **Login é simulado.** Senhas ficam no navegador e a sessão pode ser alterada pelo DevTools. Em produção é obrigatório um back-end.
- **Recuperação de senha** mostra o link na tela (`MODO_DEMONSTRACAO` em `login/js/login.js`). Sem servidor não há envio de e-mail.
- **Pagamento não existe:** o pedido nasce "Aguardando pagamento" e o admin marca "Pago" no painel.
- **Métricas e carrinhos valem só para o navegador onde foram gerados.** Para o cliente ver dados reais de todos os visitantes é preciso back-end (ou Google Analytics).
- **Licença:** o sistema só controla o fluxo de aprovação; a conferência do documento e a regra legal devem ser validadas pela loja/assessoria jurídica.
- Imagens de produtos e do banner são links externos (Google/Unsplash): podem sair do ar. Hospede as fotos no projeto.
- Dashboard guarda CPF de funcionários no navegador: avalie a LGPD antes de usar dados reais.
