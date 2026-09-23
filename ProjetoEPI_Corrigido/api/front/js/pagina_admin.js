/**
 * ============================================================================
 * CONTROLE DO PAINEL ADMINISTRATIVO (PAGINA_ADMIN.JS)
 * Suporte a API PHP e Fallback Dinâmico com LocalStorage
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    initAdminHeader();
    carregarRelatorios();
    carregarSolicitacoes();
});

function initAdminHeader() {
    const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado') || '{}');
    if (usuarioLogado && usuarioLogado.nome) {
        const el = document.getElementById('nomeAdmin');
        if (el) el.textContent = usuarioLogado.nome;
    }
}

function logout() {
    localStorage.removeItem('usuarioLogado');
    window.location.href = 'index.html';
}

function getApiUrl(route) {
    const isFileUrl = window.location.protocol === 'file:';
    return isFileUrl 
        ? `http://localhost/ProjetoEPI_Corrigido/ProjetoEPI_Corrigido/api/front/public/index.php?route=${route}` 
        : `public/index.php?route=${route}`;
}

/**
 * Carrega Relatórios de Verificação (API + LocalStorage)
 */
async function carregarRelatorios() {
    const tbody = document.getElementById('relatoriosTable');
    if (!tbody) return;

    let dados = [];

    // 1. Tenta buscar da API
    try {
        const resposta = await fetch(getApiUrl('relatorios'));
        const apiDados = await resposta.json();
        if (Array.isArray(apiDados)) {
            dados = apiDados;
        }
    } catch (e) {
        // Fallback para dados locais
    }

    // 2. Mescla com histórico local do navegador
    try {
        const locais = JSON.parse(localStorage.getItem('historicoVerificacoes') || '[]');
        if (Array.isArray(locais) && locais.length > 0) {
            // Converte modelo local para formato de exibição
            const adaptados = locais.map(l => ({
                id_leitura: l.id,
                nome_usuario: l.funcionario,
                email_usuario: l.email || '-',
                detalhes: l.detalhes || 'Verificação Automática IA',
                status_leitura: l.status,
                data_leitura: l.data_hora
            }));
            dados = [...adaptados, ...dados];
        }
    } catch (e) {}

    // 3. Atualiza métricas
    atualizarMetricas(dados);

    // 4. Renderiza tabela
    if (dados.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center;padding:30px;color:var(--text-muted);">
                    Nenhum registro de verificação encontrado até o momento.
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = '';
    dados.forEach(r => {
        const data = r.data_leitura
            ? new Date(r.data_leitura).toLocaleString('pt-BR')
            : '-';
        const isOk = r.status_leitura === 'Aprovado';
        const badgeClass = isOk ? 'badge-approved' : 'badge-denied';
        const statusText = isOk ? '✓ Aprovado' : '✕ Reprovado';

        tbody.innerHTML += `
            <tr>
                <td><strong>${r.nome_usuario || 'Operador'}</strong></td>
                <td><span style="font-family: var(--font-mono); font-size: 0.825rem; color: var(--text-muted);">${r.email_usuario || '-'}</span></td>
                <td><span style="font-size: 0.85rem; color: var(--text-secondary);">${r.detalhes || 'Capacete, Óculos e Colete'}</span></td>
                <td><span class="badge-status ${badgeClass}">${statusText}</span></td>
                <td><span style="font-family: var(--font-mono); font-size: 0.825rem; color: var(--text-muted);">${data}</span></td>
            </tr>`;
    });
}

/**
 * Atualiza os contadores de métricas no topo
 */
function atualizarMetricas(relatorios) {
    const elTotal = document.getElementById('metricTotalVerif');
    const elTaxa = document.getElementById('metricTaxaAprov');

    if (elTotal) elTotal.textContent = relatorios.length;

    if (elTaxa && relatorios.length > 0) {
        const aprovados = relatorios.filter(r => r.status_leitura === 'Aprovado').length;
        const taxa = Math.round((aprovados / relatorios.length) * 100);
        elTaxa.textContent = taxa + '%';
    }
}

/**
 * Carrega Solicitações de Reposição (API + LocalStorage)
 */
async function carregarSolicitacoes() {
    const tbody = document.getElementById('solicitacoesTable');
    const elTotalPendente = document.getElementById('metricTotalPendente');
    if (!tbody) return;

    let dados = [];

    // 1. Tenta buscar da API
    try {
        const resposta = await fetch(getApiUrl('solicitacoes'));
        const apiDados = await resposta.json();
        if (Array.isArray(apiDados)) {
            dados = apiDados;
        }
    } catch (e) {}

    // 2. Mescla com solicitações locais
    try {
        const locais = JSON.parse(localStorage.getItem('solicitacoesLocais') || '[]');
        if (Array.isArray(locais) && locais.length > 0) {
            dados = [...locais, ...dados];
        }
    } catch (e) {}

    // Atualiza contador de pendentes
    const pendentes = dados.filter(s => s.status_solicitacao !== 'Entregue');
    if (elTotalPendente) elTotalPendente.textContent = pendentes.length;

    if (dados.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center;padding:30px;color:var(--text-muted);">
                    Nenhuma solicitação de EPI registrada no momento.
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = '';
    dados.forEach((s, idx) => {
        const data = s.data_solicitacao
            ? new Date(s.data_solicitacao).toLocaleString('pt-BR')
            : '-';
        
        const isEntregue = s.status_solicitacao === 'Entregue';
        const badge = isEntregue
            ? '<span class="badge-status badge-approved">Entregue</span>'
            : '<span class="badge-status badge-pending">Pendente</span>';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <strong>${s.nome_usuario || 'Operador'}</strong>
                <br><small style="color: var(--text-muted);">Motivo: ${s.descricao || '-'}</small>
            </td>
            <td>
                <span style="font-weight: 600; color: var(--primary-gold);">${s.nome_epi || 'EPI'}</span>
            </td>
            <td><span style="font-family: var(--font-mono); font-size: 0.825rem; color: var(--text-muted);">${data}</span></td>
            <td>${badge}</td>
            <td style="text-align: center;">
                <div class="table-actions-cell">
                    <button 
                        class="btn-action-deliver"
                        onclick="marcarComoEntregue(this, '${s.id_solicitacao || idx}')" 
                        ${isEntregue ? 'disabled style="opacity:0.4; cursor:default;"' : ''}>
                        ${isEntregue ? '✓ Baixado' : 'Entregar'}
                    </button>
                    <button 
                        class="btn-action-delete"
                        onclick="excluirSolicitacao(this, '${s.id_solicitacao || idx}')">
                        Excluir
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

/**
 * Marca como entregue no banco e no localStorage
 */
async function marcarComoEntregue(btn, idSolicitacao) {
    const row = btn.closest('tr');

    // Atualiza no localStorage
    try {
        const locais = JSON.parse(localStorage.getItem('solicitacoesLocais') || '[]');
        const item = locais.find(l => String(l.id_solicitacao) === String(idSolicitacao));
        if (item) {
            item.status_solicitacao = 'Entregue';
            localStorage.setItem('solicitacoesLocais', JSON.stringify(locais));
        }
    } catch(e) {}

    // Tenta atualizar na API
    try {
        await fetch(getApiUrl('solicitacoes'), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_solicitacao: idSolicitacao, status: 'Entregue' })
        });
    } catch(e) {}

    carregarSolicitacoes();
}

/**
 * Exclui solicitação
 */
async function excluirSolicitacao(btn, idSolicitacao) {
    if (!confirm('Confirma a remoção deste pedido de EPI?')) return;

    // Remove do localStorage
    try {
        let locais = JSON.parse(localStorage.getItem('solicitacoesLocais') || '[]');
        locais = locais.filter(l => String(l.id_solicitacao) !== String(idSolicitacao));
        localStorage.setItem('solicitacoesLocais', JSON.stringify(locais));
    } catch(e) {}

    // Tenta remover da API
    try {
        await fetch(getApiUrl('solicitacoes'), {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_solicitacao: idSolicitacao })
        });
    } catch(e) {}

    carregarSolicitacoes();
}