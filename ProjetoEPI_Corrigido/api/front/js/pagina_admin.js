// Exibe nome do admin logado
const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado') || '{}');
if (usuarioLogado && usuarioLogado.nome) {
    const el = document.getElementById('nomeAdmin');
    if (el) el.textContent = 'Olá, ' + usuarioLogado.nome;
}

function goTo(page) {
    document.getElementById('homePage').classList.add('hidden');
    document.getElementById('relatoriosPage').classList.add('hidden');
    document.getElementById('solicitacoesPage').classList.add('hidden');
    document.getElementById('backBtn').classList.remove('hidden');

    if (page === 'relatorios') {
        document.getElementById('relatoriosPage').classList.remove('hidden');
        carregarRelatorios();
    }
    if (page === 'solicitacoes') {
        document.getElementById('solicitacoesPage').classList.remove('hidden');
        carregarSolicitacoes();
    }
}

function goHome() {
    document.getElementById('homePage').classList.remove('hidden');
    document.getElementById('relatoriosPage').classList.add('hidden');
    document.getElementById('solicitacoesPage').classList.add('hidden');
    document.getElementById('backBtn').classList.add('hidden');
}

function logout() {
    localStorage.removeItem('usuarioLogado');
    window.location.href = 'index.html';
}

async function carregarRelatorios() {
    const tbody = document.getElementById('relatoriosTable');
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;color:#888;">Carregando...</td></tr>';

    try {
        const isFileUrl = window.location.protocol === 'file:';
        const API_URL = isFileUrl 
            ? 'http://localhost/ProjetoEPI_Corrigido/ProjetoEPI_Corrigido/api/front_livros/public/index.php?route=relatorios' 
            : 'public/index.php?route=relatorios';

        const resposta = await fetch(API_URL);
        const dados = await resposta.json();

        if (dados.error) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:20px;color:#ff4444;">Erro da API: ${dados.details || dados.error}</td></tr>`;
            return;
        }

        if (!Array.isArray(dados) || dados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;color:#888;">Nenhum registro encontrado.</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        dados.forEach(r => {
            const data = r.data_leitura
                ? new Date(r.data_leitura).toLocaleString('pt-BR')
                : '-';
            const cor = r.status_leitura === 'Aprovado'
                ? 'color:#00C851;font-weight:bold;'
                : 'color:#ff4444;font-weight:bold;';

            tbody.innerHTML += `
                <tr>
                    <td>${r.nome_usuario || '-'}</td>
                    <td>${r.email_usuario || '-'}</td>
                    <td style="${cor}">${r.status_leitura || '-'}</td>
                    <td>${data}</td>
                </tr>`;
        });
    } catch (erro) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;color:#ff4444;">Erro ao carregar relatórios.</td></tr>';
        console.error('Erro ao buscar relatórios:', erro);
    }
}

async function carregarSolicitacoes() {
    const tbody = document.getElementById('solicitacoesTable');
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:20px;color:#888;">Carregando...</td></tr>';

    try {
        const isFileUrl = window.location.protocol === 'file:';
        const API_URL = isFileUrl 
            ? 'http://localhost/ProjetoEPI_Corrigido/ProjetoEPI_Corrigido/api/front_livros/public/index.php?route=solicitacoes' 
            : 'public/index.php?route=solicitacoes';

        const resposta = await fetch(API_URL);
        const dados = await resposta.json();

        if (dados.error) {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;padding:20px;color:#ff4444;">Erro da API: ${dados.details || dados.error}</td></tr>`;
            return;
        }

        if (!Array.isArray(dados) || dados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:20px;color:#888;">Nenhuma solicitação no momento.</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        dados.forEach(s => {
            const data = s.data_solicitacao
                ? new Date(s.data_solicitacao).toLocaleString('pt-BR')
                : '-';
            
            // Aqui você pode adicionar um botão para mudar o status da solicitação, se quiser.
            const statusBadge = s.status_solicitacao === 'Pendente' 
                ? '<span style="color:#ffbb33;">Pendente</span>'
                : (s.status_solicitacao === 'Entregue' ? '<span style="color:#00C851;">Entregue</span>' : '<span style="color:#ff4444;">Cancelado</span>');

            tbody.innerHTML += `
                <tr>
                    <td><strong>${s.nome_usuario || '-'}</strong><br><small style="color:#aaa;">Motivo: ${s.descricao || '-'}</small></td>
                    <td>${s.nome_epi || '-'}<br>${statusBadge}</td>
                    <td>${data}</td>
                </tr>`;
        });
    } catch (erro) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:20px;color:#ff4444;">Erro ao carregar solicitações.</td></tr>';
        console.error('Erro ao buscar solicitações:', erro);
    }
}
