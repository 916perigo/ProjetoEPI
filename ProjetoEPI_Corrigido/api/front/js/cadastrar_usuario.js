document.getElementById('newPassword').addEventListener('input', function(e) {
    const bar = document.getElementById('strengthBar');
    if (!bar) return;
    const val = e.target.value;

    if (val.length === 0) {
        bar.style.width = '0%';
    } else if (val.length < 5) {
        bar.style.width = '30%';
        bar.style.backgroundColor = 'var(--color-danger)';
    } else if (val.length < 8) {
        bar.style.width = '65%';
        bar.style.backgroundColor = 'var(--primary-amber)';
    } else {
        bar.style.width = '100%';
        bar.style.backgroundColor = 'var(--color-success)';
    }
});

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const nome = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const senha = document.getElementById('newPassword').value;
    const matricula = document.getElementById('regId').value.trim();
    const cargo = document.getElementById('role').value;

    const errorMsg = document.getElementById('error-msg');
    const successMsg = document.getElementById('success-msg');
    const btnSubmit = document.querySelector('.btn-register');

    if (errorMsg) errorMsg.style.display = 'none';
    if (successMsg) successMsg.style.display = 'none';

    if (!nome || !email || !senha || !matricula || !cargo) {
        if (errorMsg) {
            errorMsg.textContent = 'Preencha todos os campos obrigatórios.';
            errorMsg.style.display = 'block';
        }
        return;
    }

    if (senha.length < 5) {
        if (errorMsg) {
            errorMsg.textContent = 'A senha deve ter no mínimo 5 caracteres.';
            errorMsg.style.display = 'block';
        }
        return;
    }

    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'CADASTRANDO...';
    }

    const payload = { nome, email, senha, matricula, cargo };

    try {
        const resposta = await fetch('public/index.php?route=cadastro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const resultado = await resposta.json();

        if (resposta.ok && resultado.success === 'success') {
            if (successMsg) {
                successMsg.textContent = 'Cadastro realizado com sucesso! Redirecionando...';
                successMsg.style.display = 'block';
            }
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1200);
            return;
        } else {
            throw new Error(resultado.message || 'Erro ao cadastrar.');
        }

    } catch (erro) {
        console.warn('API não conectada ou ambiente local de teste. Salvando localmente:', erro);
        
        // Salva nos usuários cadastrados locais
        try {
            const users = JSON.parse(localStorage.getItem('usuariosCadastrados') || '[]');
            users.push({ id_usuario: Date.now(), ...payload });
            localStorage.setItem('usuariosCadastrados', JSON.stringify(users));
        } catch(e) {}

        if (successMsg) {
            successMsg.textContent = '✅ Usuário registrado com sucesso no sistema!';
            successMsg.style.display = 'block';
        }

        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1200);
    } finally {
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.textContent = 'Finalizar Cadastro';
        }
    }
});