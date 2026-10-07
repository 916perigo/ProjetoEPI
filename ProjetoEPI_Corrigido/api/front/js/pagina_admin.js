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

let relatoriosCache = [];

/**
 * Carrega Relatórios de Verificação (Supabase + API + LocalStorage)
 */
async function carregarRelatorios() {
    const tbody = document.getElementById('relatoriosTable');
    if (!tbody) return;

    let dados = [];

    // 1. Tenta buscar do Supabase se configurado
    if (typeof buscarRelatoriosSupabase === 'function') {
        try {
            const relatoriosSupabase = await buscarRelatoriosSupabase();
            if (Array.isArray(relatoriosSupabase) && relatoriosSupabase.length > 0) {
                dados = [...relatoriosSupabase];
            }
        } catch (e) {
            console.warn("Supabase relatórios:", e);
        }
    }

    // 2. Tenta buscar da API PHP se Supabase não retornou dados
    if (dados.length === 0) {
        try {
            const resposta = await fetch(getApiUrl('relatorios'));
            const apiDados = await resposta.json();
            if (Array.isArray(apiDados)) {
                dados = apiDados;
            }
        } catch (e) {}
    }

    // 3. Mescla com histórico local do navegador
    try {
        const locais = JSON.parse(localStorage.getItem('historicoVerificacoes') || '[]');
        if (Array.isArray(locais) && locais.length > 0) {
            const adaptados = locais.map(l => ({
                id_leitura: l.id,
                nome_usuario: l.funcionario,
                email_usuario: l.email || '-',
                detalhes: l.detalhes || 'Capacete e Colete',
                status_leitura: l.status,
                data_leitura: l.data_hora,
                foto: l.foto || l.foto_url || null,
                capacete: l.capacete || null,
                colete: l.colete || null
            }));
            
            // Evita duplicatas se já vieram do Supabase
            const idsExistentes = new Set(dados.map(d => String(d.id_leitura)));
            adaptados.forEach(item => {
                if (!idsExistentes.has(String(item.id_leitura))) {
                    dados.push(item);
                }
            });
        }
    } catch (e) {}

    relatoriosCache = dados;

    // 4. Atualiza métricas
    atualizarMetricas(dados);

    // 5. Renderiza tabela
    if (dados.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center;padding:30px;color:var(--text-muted);">
                    Nenhum registro de verificação encontrado até o momento.
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = '';
    dados.forEach((r, idx) => {
        const data = r.data_leitura
            ? new Date(r.data_leitura).toLocaleString('pt-BR')
            : '-';
        const isOk = r.status_leitura === 'Aprovado';
        const badgeClass = isOk ? 'badge-approved' : 'badge-denied';
        const statusText = isOk ? '✓ Aprovado' : '✕ Reprovado';

        const itemKey = r.id_leitura ? String(r.id_leitura) : String(idx);

        const fotoHtml = r.foto
            ? `<div class="admin-foto-thumb-wrapper" onclick="abrirModalFotoVisualizacao('${itemKey}')" title="Clique para ampliar evidência">
                 <img src="${r.foto}" alt="Evidência" class="admin-foto-thumb" />
                 <span class="admin-foto-zoom-icon">🔍</span>
               </div>`
            : `<div class="admin-foto-thumb-placeholder" title="Sem foto capturada">
                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                   <path d="M10.5 8.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/>
                   <path d="M2 4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1.172a2 2 0 0 1-1.414-.586l-.828-.828A2 2 0 0 0 9.172 2H6.828a2 2 0 0 0-1.414.586l-.828.828A2 2 0 0 1 3.172 4H2zm.5 2a.5.5 0 1 1 0-1 .5.5 0 0 1 0 1zm9 2.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0z"/>
                 </svg>
                 <span>Sem foto</span>
               </div>`;

        tbody.innerHTML += `
            <tr>
                <td style="text-align: center; vertical-align: middle;">${fotoHtml}</td>
                <td><strong>${r.nome_usuario || 'Operador'}</strong></td>
                <td><span style="font-family: var(--font-mono); font-size: 0.825rem; color: var(--text-muted);">${r.email_usuario || '-'}</span></td>
                <td><span style="font-size: 0.85rem; color: var(--text-secondary);">${r.detalhes || 'Capacete e Colete'}</span></td>
                <td><span class="badge-status ${badgeClass}">${statusText}</span></td>
                <td><span style="font-family: var(--font-mono); font-size: 0.825rem; color: var(--text-muted);">${data}</span></td>
            </tr>`;
    });
}

/**
 * Abre modal com a foto da verificação ampliada
 */
function abrirModalFotoVisualizacao(id) {
    const reg = relatoriosCache.find(r => String(r.id_leitura) === String(id)) || relatoriosCache[id];
    if (!reg || !reg.foto) return;

    let modal = document.getElementById('modalFotoAdmin');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalFotoAdmin';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-foto-dialog">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1rem;">
                    <div>
                        <h3 id="modalFotoOperador" style="font-family:var(--font-tech); font-size:1.15rem; color:var(--text-primary); margin:0;">
                            Evidência da Auditoria IA
                        </h3>
                        <span id="modalFotoData" style="font-size:0.8rem; color:var(--text-muted); font-family:var(--font-mono);"></span>
                    </div>
                    <button onclick="fecharModalFotoVisualizacao()" class="btn-secondary-epi" style="padding:0.35rem 0.75rem; font-size:0.8rem; cursor:pointer;">
                        ✕ Fechar
                    </button>
                </div>
                
                <div class="modal-foto-img-box">
                    <img id="modalFotoImg" src="" alt="Foto da Auditoria" />
                </div>

                <div class="modal-foto-meta-grid">
                    <div>
                        <span class="text-muted" style="display:block; font-size:0.75rem;">Status da Auditoria:</span>
                        <strong id="modalFotoStatus" style="font-size:0.9rem;">-</strong>
                    </div>
                    <div>
                        <span class="text-muted" style="display:block; font-size:0.75rem;">Detecção Teachable Machine:</span>
                        <strong id="modalFotoDetalhes" style="font-size:0.9rem; color:var(--primary-gold);">-</strong>
                    </div>
                </div>

                <div style="display:flex; justify-content:flex-end;">
                    <button onclick="fecharModalFotoVisualizacao()" class="btn-primary-epi" style="padding:0.6rem 1.4rem; font-size:0.85rem;">
                        Concluir Visualização
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) fecharModalFotoVisualizacao();
        });
    }

    const img = document.getElementById('modalFotoImg');
    const nome = document.getElementById('modalFotoOperador');
    const dataEl = document.getElementById('modalFotoData');
    const statusEl = document.getElementById('modalFotoStatus');
    const detalhesEl = document.getElementById('modalFotoDetalhes');

    if (img) img.src = reg.foto;
    if (nome) nome.textContent = reg.nome_usuario || 'Operador da Estação';
    if (dataEl) dataEl.textContent = reg.data_leitura ? new Date(reg.data_leitura).toLocaleString('pt-BR') : '';
    if (statusEl) {
        const isOk = reg.status_leitura === 'Aprovado';
        statusEl.innerHTML = isOk 
            ? '<span class="badge-status badge-approved">✓ Aprovado</span>' 
            : '<span class="badge-status badge-denied">✕ Reprovado</span>';
    }
    if (detalhesEl) detalhesEl.textContent = reg.detalhes || 'Capacete e Colete';

    modal.classList.add('active');
}

function fecharModalFotoVisualizacao() {
    const modal = document.getElementById('modalFotoAdmin');
    if (modal) modal.classList.remove('active');
}

// Fecha ao pressionar ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') fecharModalFotoVisualizacao();
});

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