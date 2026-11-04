// auth.js — Protecao de rotas: redireciona para login se nao houver sessao ativa
(function () {
    const usuario = localStorage.getItem('usuarioLogado');
    if (!usuario) {
        window.location.href = 'index.html';
    }
})();
