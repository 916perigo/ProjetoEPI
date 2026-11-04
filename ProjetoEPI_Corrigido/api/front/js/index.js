document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const emailInput = document.getElementById('username').value.trim();
    const senhaInput = document.getElementById('password').value;
    const errorMsg = document.getElementById('error-msg');
    const btnSubmit = document.querySelector('.btn-login');

    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'ACESSANDO...';
    }

    const isFileUrl = window.location.protocol === 'file:';
    const API_URL = isFileUrl 
        ? 'public/index.php?route=login' 
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
            localStorage.setItem('usuarioLogado', JSON.stringify(resultado.user));
            window.location.href = 'pagina_principal.html';
            return;
        } else {
            errorMsg.textContent = resultado.message || 'Credenciais inválidas.';
            errorMsg.style.display = 'block';
        }

    } catch (erro) {
        console.warn('Servidor PHP offline ou inacessível. Ativando sessão local de teste:', erro);
        
        // Login facilitado de desenvolvimento/demonstração
        const isAdmin = emailInput.toLowerCase().includes('admin') || senhaInput === 'admin123';
        const usuarioDemo = {
            id_usuario: 1,
            nome: emailInput.split('@')[0].toUpperCase() || 'Operador',
            email: emailInput,
            cargo: isAdmin ? 'admin' : 'operador'
        };

        localStorage.setItem('usuarioLogado', JSON.stringify(usuarioDemo));
        window.location.href = 'pagina_principal.html';
        return;
    } finally {
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.textContent = 'Acessar Sistema';
        }
    }
});