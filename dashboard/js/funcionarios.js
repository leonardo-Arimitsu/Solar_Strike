"use strict";

iniciarCadastro({
    chave: "funcionarios",
    formId: "formFuncionario",
    nome: "funcionário",
    campos: ["nome", "cpf", "telefone", "email", "cargo", "departamento", "admissao", "turno", "status"],

    // Corrige registros antigos salvos com o nome errado "adimissao".
    migrar(registro) {
        if (registro.adimissao && !registro.admissao) {
            const { adimissao, ...resto } = registro;
            return { ...resto, admissao: adimissao };
        }
        return registro;
    }
});
