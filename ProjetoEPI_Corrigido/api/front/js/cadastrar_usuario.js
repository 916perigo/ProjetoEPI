document.getElementById('newPassword').addEventListener('input', function(e) {
    const bar = document.getElementById('strengthBar');
    const val = e.target.value;

    if (val.length === 0) {
        bar.style.width = '0%';
    } else if (val.length < 5) {
        bar.style.width = '30%';
        bar.style.backgroundColor = '#ff4444';
    } else if (val.length < 8) {
        bar.style.width = '60%';
        bar.style.backgroundColor = '#ffbb33';
    } else {
        bar.style.width = '100%';
        bar.style.backgroundColor = '#00C851';
    }
});

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const nome  = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const senha = document.getElementById('newPassword').value;
    const matricula = document.getElementById('regId').value.trim();
    const cargo = document.getElementById('role').value;

    const errorMsg   = document.getElementById('error-msg');
    const successMsg = document.getElementById('success-msg');

    errorMsg.style.display   = 'none';
    successMsg.style.display = 'none';

    if (!nome || !email || !senha || !matricula || !cargo) {
        errorMsg.textContent = 'Preencha todos os campos obrigatórios.';
        errorMsg.style.display = 'block';
        return;
    }

    if (senha.length < 6) {
        errorMsg.textContent = 'A senha deve ter no mínimo 6 caracteres.';
        errorMsg.style.display = 'block';
        return;
    }

    // URL relativa apontando para o roteador PHP dentro de public/
    // Se a página for aberta via "file://", a URL de API não funcionará. Para garantir em testes locais, usamos a origem
    const isFileUrl = window.location.protocol === 'file:';
    const API_URL = isFileUrl 
        ? 'http://localhost/ProjetoEPI_Corrigido(EuAcho)/projeto_final/api/front_livros/public/index.php?route=cadastro' 
        : 'public/index.php?route=cadastro';

    try {
        const resposta = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nome, email, senha, matricula, cargo })
        });

        const resultado = await resposta.json();

        if (resultado.success === 'success') {
            successMsg.textContent = resultado.message || 'Usuário cadastrado com sucesso!';
            successMsg.style.display = 'block';

            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        } else {
            errorMsg.textContent = resultado.message || 'Erro ao cadastrar. Tente novamente.';
            errorMsg.style.display = 'block';
        }

    } catch (erro) {
        errorMsg.textContent = 'Erro ao conectar ao servidor.';
        errorMsg.style.display = 'block';
        console.error(erro);
    }
});

document.addEventListener('mousemove', (e) => {
    const moveX = (e.clientX - window.innerWidth / 2) * 0.005;
    const moveY = (e.clientY - window.innerHeight / 2) * 0.005;

    document.querySelector('.register-card').style.transform =
        `translate(${moveX}px, ${moveY}px)`;
});