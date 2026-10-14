/**
 * ============================================================================
 * SUPABASE CLIENT & INTEGRAÇÃO DE AUDITORIA DE EPIS
 * Projeto EPI Check - SENAI
 * ============================================================================
 */

const SUPABASE_CONFIG = {
  url: "https://ffulqqqntbphxlprhiem.supabase.co",
  anonKey: "sb_publishable_rlffLURXSOSK_hlgPO970g_6BM6-b50",
  bucketName: "fotos-verificacoes",
  tableName: "verificacoes"
};

// Instância do cliente armazenada com nome único para evitar redeclarações
let supabaseInstance = null;

/**
 * Inicializa o cliente do Supabase de forma segura
 */
function initSupabase() {
  if (supabaseInstance) return supabaseInstance;

  const isConfigured = 
    SUPABASE_CONFIG.url && 
    SUPABASE_CONFIG.anonKey && 
    !SUPABASE_CONFIG.url.includes("SUA_URL_DO_SUPABASE_AQUI") && 
    !SUPABASE_CONFIG.anonKey.includes("SUA_CHAVE_ANONIMA_DO_SUPABASE_AQUI");

  if (!isConfigured) {
    console.info("ℹ️ [Supabase] Chaves ainda não configuradas em js/supabaseClient.js. As fotos e relatórios serão salvos localmente até a inserção das credenciais.");
    return null;
  }

  try {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      supabaseInstance = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
      console.log("✅ [Supabase] Conectado com sucesso!");
      return supabaseInstance;
    }
  } catch (err) {
    console.error("❌ [Supabase] Erro ao instanciar cliente:", err);
  }
  return null;
}

/**
 * Converte DataURL (Base64 gerado pelo Canvas da Webcam) para Blob
 */
function dataURLtoBlob(dataurl) {
  if (!dataurl) return null;
  try {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch (err) {
    console.warn("Erro ao converter DataURL para Blob:", err);
    return null;
  }
}

/**
 * Envia uma foto para o Supabase Storage e retorna sua URL pública
 */
async function uploadFotoParaSupabase(base64DataUrl, prefixo = 'verificacao') {
  const client = initSupabase();
  if (!client || !base64DataUrl) return null;

  try {
    const blob = dataURLtoBlob(base64DataUrl);
    if (!blob) return null;

    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const fileName = `${prefixo}_${timestamp}_${random}.jpg`;

    const { data, error } = await client.storage
      .from(SUPABASE_CONFIG.bucketName)
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (error) {
      console.warn("⚠️ [Supabase Storage] Erro ao enviar foto:", error.message);
      return null;
    }

    const { data: publicUrlData } = client.storage
      .from(SUPABASE_CONFIG.bucketName)
      .getPublicUrl(fileName);

    return publicUrlData ? publicUrlData.publicUrl : null;
  } catch (err) {
    console.warn("⚠️ [Supabase Storage] Falha no upload:", err);
    return null;
  }
}

/**
 * Envia o registro completo de auditoria para o Supabase (Storage + Tabela)
 */
async function enviarRegistroAuditoriaSupabase(registro) {
  let fotoUrl = null;

  if (registro.foto && registro.foto.startsWith('data:image')) {
    fotoUrl = await uploadFotoParaSupabase(registro.foto, `operador_${registro.id || Date.now()}`);
  }

  const client = initSupabase();
  if (!client) {
    return { sucesso: false, motivo: "Chaves do Supabase não configuradas (salvo localmente)" };
  }

  try {
    const payload = {
      funcionario: registro.funcionario || 'Operador',
      email: registro.email || '-',
      status: registro.status || 'Reprovado',
      detalhes: registro.detalhes || '',
      capacete_ok: Boolean(registro.capacete && registro.capacete.ok),
      capacete_score: Number((registro.capacete && registro.capacete.score) || 0),
      colete_ok: Boolean(registro.colete && registro.colete.ok),
      colete_score: Number((registro.colete && registro.colete.score) || 0),
      foto_url: fotoUrl || registro.foto,
      data_hora: registro.data_hora || new Date().toISOString()
    };

    const { data, error } = await client
      .from(SUPABASE_CONFIG.tableName)
      .insert([payload]);

    if (error) {
      console.warn("⚠️ [Supabase DB] Erro ao inserir na tabela:", error.message);
      return { sucesso: false, erro: error.message };
    }

    console.log("✅ [Supabase] Registro e foto salvos com sucesso na nuvem!");
    return { sucesso: true, data, fotoUrl };
  } catch (err) {
    console.warn("⚠️ [Supabase] Erro ao salvar auditoria:", err);
    return { sucesso: false, erro: err.message };
  }
}

/**
 * Busca a lista de relatórios no Supabase para exibir no painel do Administrador
 */
async function buscarRelatoriosSupabase() {
  const client = initSupabase();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from(SUPABASE_CONFIG.tableName)
      .select('*')
      .order('data_hora', { ascending: false })
      .limit(100);

    if (error) {
      console.warn("⚠️ [Supabase DB] Erro ao buscar relatórios:", error.message);
      return null;
    }

    return (data || []).map(r => ({
      id_leitura: r.id || r.id_leitura,
      nome_usuario: r.funcionario || r.nome_usuario,
      email_usuario: r.email || r.email_usuario || '-',
      detalhes: r.detalhes || 'Verificação Automática IA',
      status_leitura: r.status || r.status_leitura,
      data_leitura: r.data_hora || r.created_at,
      foto: r.foto_url || r.foto,
      capacete: { ok: r.capacete_ok, score: r.capacete_score },
      colete: { ok: r.colete_ok, score: r.colete_score }
    }));
  } catch (err) {
    console.warn("⚠️ [Supabase] Erro na consulta:", err);
    return null;
  }
}

// Inicialização automática ao carregar o script
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    initSupabase();
  });
}