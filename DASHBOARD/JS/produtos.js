
function voltarDashboard() {
    window.location.href = "index.html";
}

// Ajusta automaticamente a altura das textareas
const textareas = document.querySelectorAll("textarea");

textareas.forEach(textarea => {
    textarea.addEventListener("input", function () {
        this.style.height = "auto";
        this.style.height = this.scrollHeight + "px";
    });
});

// Salvar dados
function salvarDados() {

    // Captura os dados dos inputs
    const idProduto = document.getElementById("id").value;
    const nome = document.getElementById("nome").value;
    const categoria = document.getElementById("categoria").value;
    const subCategoria = document.getElementById("sub-categoria").value;
    const badge = document.getElementById("badge").value;
    const resumo = document.getElementById("resumo").value;
    const descricao = document.getElementById("descricao").value;
    const preco = document.getElementById("preco").value;
    const parcela = document.getElementById("parcela").value;
    const estoque = document.getElementById("estoque").value;
    const imagemInput = document.getElementById("imagem");
    const status = document.getElementById("status").value;

    // Recupera os produtos salvos
    let dadospro = JSON.parse(localStorage.getItem("produtos")) || [];

    // Verifica se o ID já existe
    const idExiste = dadospro.some(item => String(item.id) === String(idProduto));

    if (idExiste) {
        alert("Já existe um produto cadastrado com esse ID!");
        return;
    }

    // Verifica se uma imagem foi selecionada
    if (imagemInput.files.length === 0) {
        alert("Selecione uma imagem para o produto.");
        return;
    }

    const arquivo = imagemInput.files[0];

    // Verifica se o arquivo é uma imagem
    if (!arquivo.type.startsWith("image/")) {
        alert("Selecione um arquivo de imagem válido.");
        return;
    }

    // Converte a imagem para Base64
    const leitor = new FileReader();

    leitor.onload = function () {

        // Cria o objeto do produto
        const produto = {
            id: idProduto,
            nome: nome,
            categoria: categoria,
            subCategoria: subCategoria,
            badge: badge,
            resumo: resumo,
            descricao: descricao,
            preco: preco,
            parcela: parcela,
            estoque: estoque,
            imagem: leitor.result,
            status: status
        };

        // Adiciona o produto
        dadospro.push(produto);

        // Salva no localStorage
        localStorage.setItem("produtos", JSON.stringify(dadospro));

        // Atualiza a tabela
        mostrarDados();

        // Limpa o formulário
        limparFormulario();

        alert("Produto cadastrado com sucesso!");
    };

    leitor.readAsDataURL(arquivo);
}

// Mostrar dados na tabela
function mostrarDados() {

    const dados = JSON.parse(localStorage.getItem("produtos")) || [];
    const tabela = document.getElementById("tabela");

    tabela.innerHTML = "";

    dados.forEach(function (item) {

        const linha = document.createElement("tr");

        // ID
        const colunaId = document.createElement("td");
        colunaId.textContent = item.id ?? "Não informado";

        // Nome
        const colunaNome = document.createElement("td");
        colunaNome.textContent = item.nome;

        // Categoria
        const colunaCategoria = document.createElement("td");
        colunaCategoria.textContent = item.categoria;

        // Sub-categoria
        const colunaSubCategoria = document.createElement("td");
        colunaSubCategoria.textContent = item.subCategoria;

        // Badge
        const colunaBadge = document.createElement("td");
        colunaBadge.textContent = item.badge;

        // Resumo
        const colunaResumo = document.createElement("td");
        colunaResumo.textContent = item.resumo;

        // Descrição
        const colunaDescricao = document.createElement("td");
        colunaDescricao.textContent = item.descricao;

        // Preço
        const colunaPreco = document.createElement("td");
        colunaPreco.textContent = "R$ " + Number(item.preco).toFixed(2);

        // Parcelas
        const colunaParcela = document.createElement("td");
        colunaParcela.textContent = item.parcela;

        // Estoque
        const colunaEstoque = document.createElement("td");
        colunaEstoque.textContent = item.estoque;

        // Imagem
        const colunaImagem = document.createElement("td");

        if (item.imagem) {
            const imagem = document.createElement("img");

            imagem.src = item.imagem;
            imagem.alt = item.nome;
            imagem.style.width = "60px";
            imagem.style.height = "60px";
            imagem.style.objectFit = "contain";

            colunaImagem.appendChild(imagem);
        } else {
            colunaImagem.textContent = "Sem imagem";
        }

        // Status
        const colunaStatus = document.createElement("td");
        colunaStatus.textContent = item.status;

        // Adiciona todas as colunas na ordem correta
        linha.append(
            colunaId,
            colunaNome,
            colunaCategoria,
            colunaSubCategoria,
            colunaBadge,
            colunaResumo,
            colunaDescricao,
            colunaPreco,
            colunaParcela,
            colunaEstoque,
            colunaImagem,
            colunaStatus
        );

        tabela.appendChild(linha);
    });
}

// Detecta quando o formulário é enviado
document.getElementById("formProduto").addEventListener("submit", function (event) {

    event.preventDefault();

    salvarDados();

});

// Mostrar os dados ao abrir a página
mostrarDados();

// Limpar formulário
function limparFormulario() {

    document.getElementById("formProduto").reset();

    textareas.forEach(textarea => {
        textarea.style.height = "auto";
    });
}
