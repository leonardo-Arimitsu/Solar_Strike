function voltarDashboard(){
    window.location.href = "index.html";
}

function salvarDados(){
    // Captura os dados dos inputs
    const nome = document.getElementById("nome").value;
    const whatsapp = document.getElementById("whatsapp").value;
    const telefone = document.getElementById("telefone").value;
    const email = document.getElementById("email").value;
    const endereco = document.getElementById("endereco").value;
    const produto = document.getElementById("produto").value;
    const status = document.getElementById("status").value;

    // Reuperar dados salvos
    let dadosforn = JSON.parse(localStorage.getItem("fornecedores")) || [];

    // Adiciona um novo registro
    dadosforn.push({
        nome: nome,
        whatsapp: whatsapp,
        telefone: telefone,
        email: email,
        endereco: endereco,
        produto: produto,
        status: status
    });

    // Salva os dados em formato JSON
    localStorage.setItem("fornecedores", JSON.stringify(dadosforn));

    // Atualizar a tabela
    mostrarDados()
}

function mostrarDados(){
    const dados = JSON.parse(localStorage.getItem("fornecedores")) || [];
    const tabela = document.getElementById("tabela");

    tabela.innerHTML = "";

    dados.forEach(function(item){
        const linha = document.createElement("tr");

        const colunaNome = document.createElement("td");
        colunaNome.textContent = item.nome;

        const colunaWhatsapp = document.createElement("td");
        colunaWhatsapp.textContent = item.whatsapp;

        const colunaTelefone = document.createElement("td");
        colunaTelefone.textContent = item.telefone;

        const colunaEmail = document.createElement("td");
        colunaEmail.textContent = item.email;

        const colunaEndereco = document.createElement("td");
        colunaEndereco.textContent = item.endereco;

        const colunaProduto = document.createElement("td");
        colunaProduto.textContent = item.produto;

        const colunaStatus = document.createElement("td");
        colunaStatus.textContent = item.status;

        linha.append(
            colunaNome,
            colunaWhatsapp,
            colunaTelefone,
            colunaEmail,
            colunaEndereco,
            colunaProduto,
            colunaStatus
        );

        tabela.appendChild(linha);
    })
}

// Detecta quando o formulário é enviado
document.getElementById("formFornecedor").addEventListener("submit", function(event) {
    event.preventDefault();
    salvarDados();
});

// Mostra os dados ao abrir a página
mostrarDados();

function limparFormulario() {
    document.getElementById("formFornecedor").reset();
}