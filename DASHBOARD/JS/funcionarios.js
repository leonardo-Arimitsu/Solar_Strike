function voltarDashboard(){
    window.location.href = "index.html";
}

function salvarDados(){
    // Captura os dados dos inputs
    const nome = document.getElementById("nome").value;
    const cpf = document.getElementById("cpf").value;
    const telefone = document.getElementById("telefone").value;
    const email = document.getElementById("email").value;
    const cargo = document.getElementById("cargo").value;
    const departamento = document.getElementById("departamento").value;
    const adimissao = document.getElementById("adimissao").value;
    const turno = document.getElementById("turno").value;
    const status = document.getElementById("status").value;

    // Reuperar dados salvos
    let dadosfun = JSON.parse(localStorage.getItem("funcionarios")) || [];

    // Adiciona um novo registro
    dadosfun.push({
        nome: nome,
        cpf: cpf,
        telefone: telefone,
        email: email,
        cargo: cargo,
        departamento: departamento,
        adimissao: adimissao,
        turno: turno,
        status: status
    });

    // Salva os dados em formato JSON
    localStorage.setItem("funcionarios", JSON.stringify(dadosfun));

    // Atualizar a tabela
    mostrarDados()
}

function mostrarDados(){
    const dados = JSON.parse(localStorage.getItem("funcionarios")) || [];
    const tabela = document.getElementById("tabela");

    tabela.innerHTML = "";

    dados.forEach(function(item){
        const linha = document.createElement("tr");

        const colunaNome = document.createElement("td");
        colunaNome.textContent = item.nome;

        const colunaCPF = document.createElement("td");
        colunaCPF.textContent = item.cpf;

        const colunaTelefone = document.createElement("td");
        colunaTelefone.textContent = item.telefone;

        const colunaEmail = document.createElement("td");
        colunaEmail.textContent = item.email;

        const colunaCargo = document.createElement("td");
        colunaCargo.textContent = item.cargo;

        const colunaDepartamento = document.createElement("td");
        colunaDepartamento.textContent = item.departamento;

        const colunaAdimissao = document.createElement("td");
        colunaAdimissao.textContent = item.adimissao;

        const colunaTurno = document.createElement("td");
        colunaTurno.textContent = item.turno;

        const colunaStatus = document.createElement("td");
        colunaStatus.textContent = item.status;

        linha.append(
            colunaNome,
            colunaCPF,
            colunaTelefone,
            colunaEmail,
            colunaCargo,
            colunaDepartamento,
            colunaAdimissao,
            colunaTurno,
            colunaStatus
        );

        tabela.appendChild(linha);
    })
}

// Detecta quando o formulário é enviado
document.getElementById("formFuncionario").addEventListener("submit", function(event) {
    event.preventDefault();
    salvarDados();
});

// Mostra os dados ao abrir a página
mostrarDados();

function limparFormulario() {
    document.getElementById("formFuncionario").reset();
}