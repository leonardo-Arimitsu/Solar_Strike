"use strict";

/* =========================================================
   PROTEÇÃO DO DASHBOARD
   Roda no <head>, antes de a página aparecer.
   Quem não for administrador é redirecionado.

   Lembrete: esta checagem é só visual (roda no navegador).
   Para proteger dados de verdade é preciso validar no servidor.
========================================================= */

if (!exigirLogin("admin")) {
    document.documentElement.style.visibility = "hidden";
}
