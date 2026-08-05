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

function getApiUrl(route) {
    const isFileUrl = window.location.protocol === 'file:';
    return isFileUrl 
        ? `http://localhost/ProjetoEPI_Corrigido/ProjetoEPI_Corrigido/api/front_livros/public/index.php?route=${route}` 
        : `public/index.php?route=${route}`;
}

async function carregarRelatorios() {
    const tbody = document.getElementById('relatoriosTable');
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;color:#888;">Carregando...</td></tr>';

    try {
        const resposta = await fetch(getApiUrl('relatorios'));
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
    }
}

async function carregarSolicitacoes() {
    const tbody = document.getElementById('solicitacoesTable');
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;color:#888;">Carregando...</td></tr>';

    try {
        const resposta = await fetch(getApiUrl('solicitacoes'));
        const dados = await resposta.json();

        if (dados.error) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:20px;color:#ff4444;">Erro da API: ${dados.details || dados.error}</td></tr>`;
            return;
        }

        if (!Array.isArray(dados) || dados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;color:#888;">Nenhuma solicitação no momento.</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        dados.forEach(s => {
            const data = s.data_solicitacao
                ? new Date(s.data_solicitacao).toLocaleString('pt-BR')
                : '-';
            
            const isEntregue = s.status_solicitacao === 'Entregue';
            const statusBadge = isEntregue 
                ? '<span class="status-tag" style="color:#00C851;font-weight:bold;">Entregue</span>' 
                : '<span class="status-tag" style="color:#ffbb33;font-weight:bold;">Pendente</span>';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${s.nome_usuario || '-'}</strong><br><small style="color:#aaa;">Motivo: ${s.descricao || '-'}</small></td>
                <td>${s.nome_epi || '-'}<br>${statusBadge}</td>
                <td>${data}</td>
                <td style="text-align: center;">
                    <div style="display: flex; gap: 8px; justify-content: center;">
                        <button 
                            onclick="marcarComoEntregue(this, ${s.id_solicitacao})" 
                            style="background:#28a745; color:#fff; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-weight:bold; opacity: ${isEntregue ? '0.5' : '1'};" 
                            ${isEntregue ? 'disabled' : ''}>
                            ${isEntregue ? 'Entregue' : 'Entregar'}
                        </button>
                        <button 
                            onclick="excluirSolicitacao(this, ${s.id_solicitacao})" 
                            style="background:#dc3545; color:#fff; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-weight:bold;">
                            Excluir
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

    } catch (erro) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;color:#ff4444;">Erro ao carregar solicitações.</td></tr>';
    }
}

async function marcarComoEntregue(btn, idSolicitacao) {
    const row = btn.closest('tr');
    const statusTag = row.querySelector('.status-tag');
    
    try {
        const resposta = await fetch(getApiUrl('solicitacoes'), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_solicitacao: idSolicitacao, status: 'Entregue' })
        });
        
        const res = await resposta.json();
        if (res.success) {
            if (statusTag) {
                statusTag.textContent = 'Entregue';
                statusTag.style.color = '#00C851';
            }
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.textContent = 'Entregue';
        } else {
            alert('Erro ao atualizar no banco: ' + (res.error || 'Erro desconhecido'));
        }
    } catch (err) {
        console.error('Erro ao atualizar status:', err);
        alert('Erro de conexão ao atualizar status.');
    }
}

async function excluirSolicitacao(btn, idSolicitacao) {
    if (!confirm('Deseja realmente excluir esta solicitação?')) return;

    try {
        const resposta = await fetch(getApiUrl('solicitacoes'), {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_solicitacao: idSolicitacao })
        });

        const res = await resposta.json();
        if (res.success) {
            const row = btn.closest('tr');
            row.remove();

            const tbody = document.getElementById('solicitacoesTable');
            if (tbody.children.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;color:#888;">Nenhuma solicitação no momento.</td></tr>';
            }
        } else {
            alert('Erro ao excluir no banco: ' + (res.error || 'Erro desconhecido'));
        }
    } catch (err) {
        console.error('Erro ao excluir:', err);
        alert('Erro de conexão ao excluir.');
    }
}