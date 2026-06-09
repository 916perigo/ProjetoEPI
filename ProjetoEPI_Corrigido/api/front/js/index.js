document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const emailInput = document.getElementById('username').value.trim();
    const senhaInput = document.getElementById('password').value;
    const errorMsg = document.getElementById('error-msg');

    // URL relativa apontando para o roteador PHP dentro de public/
    const isFileUrl = window.location.protocol === 'file:';
    const API_URL = isFileUrl 
        ? 'http://localhost/ProjetoEPI_Corrigido(EuAcho)/projeto_final/api/front_livros/public/index.php?route=login' 
        : 'public/index.php?route=login';

    try {
        const resposta = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: emailInput,
                senha: senhaInput
            })
        });

        const resultado = await resposta.json();

        if (resposta.ok && resultado.success === 'success') {
            errorMsg.style.display = 'none';

            // Salva dados do usuário logado no navegador
            localStorage.setItem('usuarioLogado', JSON.stringify(resultado.user));

            alert(resultado.message);

            // Redireciona para o painel principal
            window.location.href = 'pagina_principal.html';
        } else {
            errorMsg.textContent = resultado.message || 'Erro ao realizar login.';
            errorMsg.style.display = 'block';
        }

    } catch (erro) {
        console.error('Erro crítico na requisição de login:', erro);
        console.error('URL usada:', new URL(API_URL, window.location.href).href);
        errorMsg.textContent = 'Não foi possível conectar ao servidor de autenticação. Detalhe: ' + erro.message;
        errorMsg.style.display = 'block';
    }
});