function voltarDashboard(){
    window.location.href = "index.html";
}

const textarea = document.getElementById("descricao");

textarea.addEventListener("input", function() {
    this.style.height = "auto";
    this.style.height = this.scrollHeight + "px";
});

function salvarDados(){
    // Captura os dados dos inputs
    const nome = document.getElementById("nome").value;
    const descricao = document.getElementById("descricao").value;
    const categoria = document.getElementById("categoria").value;
    const marca = document.getElementById("marca").value;
    const fornecedor_produto = document.getElementById("fornecedor_produto").value;
    const preco = document.getElementById("preco").value;
    const estoque = document.getElementById("estoque").value;
    const status = document.getElementById("status").value;

    // Reuperar dados salvos
    let dadospro = JSON.parse(localStorage.getItem("funcionarios")) || [];

    // Adiciona um novo registro
    dadospro.push({
        nome: nome,
        descricao: descricao,
        categoria: categoria,
        marca: marca,
        fornecedor_produto: fornecedor_produto,
        preco: preco,
        estoque: estoque,
        status: status
    });

    // Salva os dados em formato JSON
    localStorage.setItem("produtos", JSON.stringify(dadospro));

    // Atualizar a tabela
    mostrarDados()
}

function mostrarDados(){
    const dados = JSON.parse(localStorage.getItem("produtos")) || [];
    const tabela = document.getElementById("tabela");

    tabela.innerHTML = "";

    dados.forEach(function(item){
        const linha = document.createElement("tr");

        const colunaNome = document.createElement("td");
        colunaNome.textContent = item.nome;

        const colunaDescricao = document.createElement("td");
        colunaDescricao.textContent = item.descricao;

        const colunaCategoria = document.createElement("td");
        colunaCategoria.textContent = item.categoria;

        const colunaMarca = document.createElement("td");
        colunaMarca.textContent = item.marca;

        const colunaFornecedor_produto = document.createElement("td");
        colunaFornecedor_produto.textContent = item.fornecedor_produto;

        const colunaPreco = document.createElement("td");
        colunaPreco.textContent = item.preco;

        const colunaEstoque = document.createElement("td");
        colunaEstoque.textContent = item.estoque;

        const colunaStatus = document.createElement("td");
        colunaStatus.textContent = item.status;

        linha.append(
            colunaNome,
            colunaDescricao,
            colunaCategoria,
            colunaMarca,
            colunaFornecedor_produto,
            colunaPreco,
            colunaEstoque,
            colunaStatus
        );

        tabela.appendChild(linha);
    })
}

// Detecta quando o formulário é enviado
document.getElementById("formProduto").addEventListener("submit", function(event) {
    event.preventDefault();
    salvarDados();
});

// Mostra os dados ao abrir a página
mostrarDados();

function limparFormulario() {
    document.getElementById("formProduto").reset();
}