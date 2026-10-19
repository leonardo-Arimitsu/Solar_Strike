function voltarDashboard(){
    window.location.href = "index.html";
}

function salvarDados(){
    // Captura os dados dos inputs
    const nome = document.getElementById("nome").value;
    const whatsapp = document.getElementById("whatsapp").value;
    const telefone = document.getElementById("telefone").value;
    const cidade = document.getElementById("cidade").value;
    const uf = document.getElementById("uf").value;
    const cep = document.getElementById("cep").value;

    // Reuperar dados salvos
    let dados = JSON.parse(localStorage.getItem("dados")) || [];

    // Adiciona um novo registro
    dados.push({
        nome: nome,
        email: email,
        telefone: telefone,
        cidade: cidade,
        uf: uf,
        cep: cep
    });

    // Salva os dados em formato JSON
    localStorage.setItem("dados", JSON.stringify(dados));

    // Atualizar a tabela
    mostrarDados()
}

function mostrarDados(){
    const dados = JSON.parse(localStorage.getItem("dados")) || [];
    const tabela = document.getElementById("tabela");

    tabela.innerHTML = "";

    dados.forEach(function(item){
        const linha = document.createElement("tr");

        const colunaNome = document.createElement("td");
        colunaNome.textContent = item.nome;

        const colunaEmail = document.createElement("td");
        colunaEmail.textContent = item.email;

        const colunaTelefone = document.createElement("td");
        colunaTelefone.textContent = item.telefone;

        const colunaCidade = document.createElement("td");
        colunaCidade.textContent = item.cidade;

        const colunaUF = document.createElement("td");
        colunaUF.textContent = item.uf;

        const colunaCEP = document.createElement("td");
        colunaCEP.textContent = item.cep;

        linha.append(
            colunaNome,
            colunaEmail,
            colunaTelefone,
            colunaCidade,
            colunaUF,
            colunaCEP
        );

        tabela.appendChild(linha);
    })
}

// Detecta quando o formulário é enviado
document.getElementById("formCliente").addEventListener("submit", function(event) {
    event.preventDefault();
    salvarDados();
});

// Mostra os dados ao abrir a página
mostrarDados();

function limparFormulario(){
    document.querySelectorAll("#formCliente input").forEach(input => {
        input.value = "";
    });
}