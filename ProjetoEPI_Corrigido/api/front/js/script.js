
document.addEventListener('DOMContentLoaded', () => {
 
    // 1.Referência aos elementos da tela
    const listaEquipamentos = document.getElementById('lista-epis');

    // 2.Base de dados simulada
    const meusEPIs = [
        { nome: "Capacete de Segurança (Classe B)", status: "Regular", ca: "12345", cor: "text-green-500" },
        { nome: "Luva de Vaqueta Cano Curto", status: "Troca em 5 dias", ca: "32154", cor: "text-yellow-500" },
        { nome: "Protetor Auricular Plug", status: "Vencido", ca: "98765", cor: "text-red-500" },
        { nome: "Óculos de Proteção Incolor", status: "Regular", ca: "45612", cor: "text-green-500" }
    ];

    // 3.Função para renderizar os EPIs na tela
    function renderizarDashboard() {
        if (!listaEquipamentos) return; // Só executa se estiver na página Home

        // Limpa o "Carregando..."
        listaEquipamentos.innerHTML = "";

        // Cria o HTML para cada equipamento
        meusEPIs.forEach(epi => {
            const card = `
                <div class="bg-[#262626] p-4 rounded-xl border border-gray-700 flex justify-between items-center hover:border-gray-500 transition-all">
                    <div class="flex items-center gap-4">
                        <div class="bg-gray-800 p-3 rounded-lg text-yellow-500">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                        <div>
                            <p class="font-bold text-white">${epi.nome}</p>
                            <p class="text-[10px] text-gray-500 uppercase font-mono">Certificado de Aprovação: ${epi.ca}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <span class="${epi.cor} text-[10px] font-extrabold uppercase bg-black/30 px-2 py-1 rounded">
                            ${epi.status}
                        </span>
                    </div>
                </div>
            `;
            listaEquipamentos.innerHTML += card;
        });
    }

    // 4.Chamada inicial
    renderizarDashboard();

    // 5.Exemplo de como enviar a solicitação (Página solicitar.html)
    const formSolicitacao = document.querySelector('form');
    if (formSolicitacao) {
        formSolicitacao.addEventListener('submit', (e) => {
            //Se quiser processar via JS antes de enviar para o PHP
            console.log("Processando pedido de EPI...");
        });
    }
});