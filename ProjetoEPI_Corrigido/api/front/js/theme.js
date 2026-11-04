// theme.js — Modo claro / escuro do EPI Check
// Carregado no <head> para aplicar o tema antes da página aparecer (sem "piscar").
(function () {
    var KEY = 'epi-theme';
    var root = document.documentElement;

    function salvo() {
        try { return localStorage.getItem(KEY); } catch (e) { return null; }
    }

    function preferido() {
        var s = salvo();
        if (s === 'light' || s === 'dark') return s;
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }

    function aplicar(tema) {
        root.setAttribute('data-theme', tema);
        var btn = document.getElementById('themeToggle');
        if (btn) {
            var rotulo = tema === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro';
            btn.setAttribute('aria-label', rotulo);
            btn.setAttribute('title', rotulo);
            btn.setAttribute('aria-pressed', tema === 'light' ? 'true' : 'false');
        }
    }

    aplicar(preferido());

    function criarBotao() {
        if (document.getElementById('themeToggle')) return;
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.id = 'themeToggle';
        btn.className = 'theme-toggle';
        btn.innerHTML =
            '<svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>' +
            '<svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>';

        btn.addEventListener('click', function () {
            var novo = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
            try { localStorage.setItem(KEY, novo); } catch (e) {}
            aplicar(novo);
        });

        // Nas telas com cabeçalho, o botão fica junto do usuário; nas de login, flutua no canto.
        var nav = document.querySelector('.app-header .app-user-nav');
        if (nav) {
            nav.insertBefore(btn, nav.firstChild);
        } else {
            btn.classList.add('floating');
            document.body.appendChild(btn);
        }
        aplicar(root.getAttribute('data-theme'));
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', criarBotao);
    } else {
        criarBotao();
    }

    // Sincroniza entre abas abertas
    window.addEventListener('storage', function (e) {
        if (e.key === KEY && (e.newValue === 'light' || e.newValue === 'dark')) aplicar(e.newValue);
    });
})();
