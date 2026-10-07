/**
 * ============================================================================
 * SUPABASE CLIENT & INTEGRAÇÃO DE AUDITORIA DE EPIS
 * Projeto EPI Check - SENAI
 * ============================================================================
 * 
 * INSTRUÇÕES RÁPIDAS:
 * 1. Acesse seu painel no Supabase (https://supabase.com)
 * 2. Cole sua URL e a ANON KEY nas constantes abaixo:
 *    - url: "https://xyzcompany.supabase.co"
 *    - anonKey: "eyJhbGciOi..."
 * 3. No menu "Storage", crie um Bucket chamado "fotos-verificacoes" (marcado como Public).
 * ============================================================================
 */

const SUPABASE_CONFIG = {
  // ─── COLE SUAS CREDENCIAIS DO SUPABASE AQUI ───────────────────────────────
  url: "https://SUA_URL_DO_SUPABASE_AQUI.supabase.co",
  anonKey: "SUA_CHAVE_ANONIMA_DO_SUPABASE_AQUI",
  bucketName: "fotos-verificacoes",
  tableName: "verificacoes"
};

// Cliente Supabase instanciado globalmente
let supabase = null;

/**
 * Inicializa o cliente do Supabase de forma segura
 */
function initSupabase() {
  if (supabase) return supabase;

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
      supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
      console.log("✅ [Supabase] Conectado com sucesso!");
      return supabase;
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
 * @param {string} base64DataUrl - Imagem em Base64
 * @param {string} prefixo - Prefixo para o nome do arquivo
 * @returns {Promise<string|null>} URL pública da foto ou null se não configurado
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

    // Obtém a URL pública do arquivo
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
 * @param {Object} registro - Dados da verificação
 */
async function enviarRegistroAuditoriaSupabase(registro) {
  let fotoUrl = null;

  // 1. Tenta fazer upload da foto para o Supabase Storage se configurado
  if (registro.foto && registro.foto.startsWith('data:image')) {
    fotoUrl = await uploadFotoParaSupabase(registro.foto, `operador_${registro.id || Date.now()}`);
  }

  const client = initSupabase();
  if (!client) {
    return { sucesso: false, motivo: "Chaves do Supabase não configuradas (salvo localmente)" };
  }

  try {
    // 2. Insere na tabela 'verificacoes'
    const payload = {
      funcionario: registro.funcionario || 'Operador',
      email: registro.email || '-',
      status: registro.status || 'Reprovado',
      detalhes: registro.detalhes || '',
      capacete_ok: Boolean(registro.capacete && registro.capacete.ok),
      capacete_score: Number((registro.capacete && registro.capacete.score) || 0),
      colete_ok: Boolean(registro.colete && registro.colete.ok),
      colete_score: Number((registro.colete && registro.colete.score) || 0),
      foto_url: fotoUrl || registro.foto, // se upload falhou ou for base64, salva fallback
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
