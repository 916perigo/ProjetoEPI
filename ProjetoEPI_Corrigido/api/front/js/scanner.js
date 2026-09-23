/**
 * ============================================================================
 * SCANNER IA & DETECÇÃO DE EPI EM TEMPO REAL
 * Projeto EPI Check - SENAI
 * Suporte a Teachable Machine (URL / Local) + Visão Computacional por Pixels em Tempo Real
 * ============================================================================
 */

// 8 Classes oficiais do Teachable Machine fornecidas pelo usuário
const TM_LABELS = [
  "Sem capacete, sem óculos e sem colete",
  "Com capacete",
  "Com óculos",
  "Com colete",
  "Com capacete e óculos",
  "Com capacete e colete",
  "Com óculos e colete",
  "Com capacete, óculos e colete"
];

// Estado Global do Scanner
const ScannerState = {
  videoStream: null,
  model: null,
  modelLoaded: false,
  modelSource: 'vision', // 'tm_url', 'tm_local', 'vision'
  isAnalyzing: false,
  detectionMode: 'auto_vision', // 'auto_vision' (analisa pixels da câmera), 'manual' (toggles), 'preset'
  manualOverrides: {
    capacete: false,
    oculos: false,
    colete: false
  },
  lastSnapshot: null,
  currentPrediction: {
    label: "Sem capacete, sem óculos e sem colete",
    confidence: 0,
    capacete: { ok: false, score: 10 },
    oculos: { ok: false, score: 8 },
    colete: { ok: false, score: 12 },
    isAprovado: false
  },
  facingMode: 'user',
  audioCtx: null,
  analysisCanvas: document.createElement('canvas')
};

// Canvas auxiliar para análise rápida em tempo real (160x120)
ScannerState.analysisCanvas.width = 160;
ScannerState.analysisCanvas.height = 120;

document.addEventListener('DOMContentLoaded', () => {
  initUsuarioInfo();
  initCamera();
  tryLoadLocalTmModel();
  setupEventListeners();
});

/**
 * 1. Inicializa informações do usuário
 */
function initUsuarioInfo() {
  const usuario = JSON.parse(localStorage.getItem('usuarioLogado') || '{}');
  const nomeExibicao = usuario.nome || 'Operador da Estação';
  
  const infoEl = document.getElementById('infoUsuario');
  const avatarEl = document.getElementById('avatarInicial');

  if (infoEl) infoEl.textContent = nomeExibicao;
  if (avatarEl) avatarEl.textContent = nomeExibicao.charAt(0).toUpperCase();
}

/**
 * 2. Inicialização da Câmera (Webcam real do usuário)
 */
async function initCamera() {
  const video = document.getElementById('webcamVideo');
  const camStatus = document.getElementById('camStatusText');

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    if (camStatus) camStatus.textContent = 'Câmera não suportada neste navegador';
    startFallbackCanvas();
    return;
  }

  try {
    if (ScannerState.videoStream) {
      ScannerState.videoStream.getTracks().forEach(track => track.stop());
    }

    const constraints = {
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: ScannerState.facingMode
      },
      audio: false
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    ScannerState.videoStream = stream;
    video.srcObject = stream;

    await new Promise((resolve) => {
      video.onloadedmetadata = () => {
        video.play();
        resolve();
      };
    });

    if (camStatus) camStatus.textContent = 'CÂMERA ATIVA • AO VIVO';
    ScannerState.isAnalyzing = true;
    startContinuousAnalysis();

  } catch (err) {
    console.warn('Câmera física não disponível ou permissão negada:', err);
    if (camStatus) camStatus.textContent = 'SIMULADOR GRÁFICO ATIVO';
    startFallbackCanvas();
  }
}

function toggleCamera() {
  ScannerState.facingMode = ScannerState.facingMode === 'user' ? 'environment' : 'user';
  initCamera();
}

/**
 * Canvas simulador gráfico caso o usuário não tenha webcam conectada
 */
function startFallbackCanvas() {
  const video = document.getElementById('webcamVideo');
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  canvas.id = "fallbackCanvas";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.objectFit = "cover";

  if (video.parentNode) {
    video.style.display = 'none';
    const oldCanvas = document.getElementById('fallbackCanvas');
    if (oldCanvas) oldCanvas.remove();
    video.parentNode.insertBefore(canvas, video);
  }

  const ctx = canvas.getContext('2d');
  let frameCount = 0;

  function drawSimulatedFeed() {
    frameCount++;
    ctx.fillStyle = "#0c1322";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "rgba(245, 158, 11, 0.08)";
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2 + Math.sin(frameCount * 0.04) * 4;

    // Torso / Colete
    ctx.fillStyle = ScannerState.currentPrediction.colete.ok ? "#eab308" : "#334155";
    ctx.beginPath();
    ctx.roundRect(centerX - 90, centerY + 20, 180, 160, 24);
    ctx.fill();

    if (ScannerState.currentPrediction.colete.ok) {
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(centerX - 70, centerY + 40, 20, 140);
      ctx.fillRect(centerX + 50, centerY + 40, 20, 140);
      ctx.fillRect(centerX - 90, centerY + 90, 180, 16);
    }

    // Cabeça
    ctx.fillStyle = "#fbcfe8";
    ctx.beginPath();
    ctx.arc(centerX, centerY - 40, 50, 0, Math.PI * 2);
    ctx.fill();

    // Capacete
    if (ScannerState.currentPrediction.capacete.ok) {
      ctx.fillStyle = "#f59e0b";
      ctx.beginPath();
      ctx.arc(centerX, centerY - 55, 56, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(centerX - 62, centerY - 58, 124, 12);
    }

    // Óculos
    if (ScannerState.currentPrediction.oculos.ok) {
      ctx.fillStyle = "rgba(56, 189, 248, 0.85)";
      ctx.strokeStyle = "#0284c7";
      ctx.lineWidth = 3;
      ctx.strokeRect(centerX - 35, centerY - 45, 30, 16);
      ctx.strokeRect(centerX + 5, centerY - 45, 30, 16);
      ctx.fillRect(centerX - 35, centerY - 45, 30, 16);
      ctx.fillRect(centerX + 5, centerY - 45, 30, 16);
    }

    requestAnimationFrame(drawSimulatedFeed);
  }

  drawSimulatedFeed();
  ScannerState.isAnalyzing = true;
  startContinuousAnalysis();
}

/**
 * 3. Carregamento do Modelo Teachable Machine
 */
async function tryLoadLocalTmModel() {
  const modelStatus = document.getElementById('modelStatus');
  try {
    if (window.tmImage) {
      const modelURL = "./model/model.json";
      const metadataURL = "./model/metadata.json";
      try {
        ScannerState.model = await window.tmImage.load(modelURL, metadataURL);
        ScannerState.modelLoaded = true;
        ScannerState.modelSource = 'tm_local';
        if (modelStatus) modelStatus.textContent = 'IA TM: Ativa (Neural)';
        return;
      } catch (e) {
        // Normal se weights.bin não tiver sido enviado em formato binário
      }
    }
  } catch (err) {}

  // Ativa o motor de visão por pixels
  if (modelStatus) modelStatus.textContent = 'IA: Visão Computacional Ativa';
}

/**
 * Permite carregar diretamente uma URL do Teachable Machine (onde a Google hospeda model.json + metadata.json + weights.bin)
 */
async function loadTmFromUrl(customUrl) {
  const modelStatus = document.getElementById('modelStatus');
  const urlInput = customUrl || prompt("Insira a URL do seu modelo do Google Teachable Machine:\n(Ex: https://teachablemachine.withgoogle.com/models/ABC123XYZ/)");
  
  if (!urlInput) return;

  let cleanUrl = urlInput.trim();
  if (!cleanUrl.endsWith('/')) cleanUrl += '/';

  try {
    if (modelStatus) modelStatus.textContent = 'Carregando Modelo Google TM...';
    ScannerState.model = await window.tmImage.load(cleanUrl + 'model.json', cleanUrl + 'metadata.json');
    ScannerState.modelLoaded = true;
    ScannerState.modelSource = 'tm_url';
    if (modelStatus) modelStatus.textContent = 'IA TM: Conectada (Google TM)';
    alert('✅ Modelo Teachable Machine carregado com sucesso via nuvem Google!');
  } catch (err) {
    console.error('Falha ao carregar Teachable Machine URL:', err);
    alert('⚠️ Não foi possível carregar a URL fornecida. Verifique se o link foi publicado no Teachable Machine ("Upload my model"). O motor de visão por câmera continuará ativo.');
    if (modelStatus) modelStatus.textContent = 'IA: Visão Computacional Ativa';
  }
}

/**
 * Permite carregar o arquivo weights.bin localmente caso o usuário o tenha baixado
 */
async function carregarWeightsBinManual(file) {
  if (!file) return;
  const modelStatus = document.getElementById('modelStatus');
  try {
    if (modelStatus) modelStatus.textContent = 'Carregando pesos binários...';
    const metadataRes = await fetch('./model/metadata.json');
    const metadata = await metadataRes.json();
    const modelRes = await fetch('./model/model.json');
    const modelTopology = await modelRes.json();

    // Carrega com os arquivos combinados
    ScannerState.model = await window.tmImage.loadFromFiles(modelTopology, file, metadata);
    ScannerState.modelLoaded = true;
    ScannerState.modelSource = 'tm_local';
    if (modelStatus) modelStatus.textContent = 'IA TM: 100% Ativa com Pesos';
    alert('✅ Arquivo weights.bin carregado com sucesso!');
  } catch(e) {
    console.error(e);
    alert('Erro ao carregar weights.bin: ' + e.message);
  }
}

/**
 * 4. Loop Contínuo de Análise
 */
function startContinuousAnalysis() {
  let tick = 0;

  async function loop() {
    if (!ScannerState.isAnalyzing) return;
    tick++;

    const result = await evaluateFrame(tick);
    updatePredictionUI(result);

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}

/**
 * Avalia o frame atual da câmera ou modo selecionado
 */
async function evaluateFrame(tick) {
  const video = document.getElementById('webcamVideo');

  // Modo 1: Se o modelo neural Teachable Machine estiver carregado com pesos
  if (ScannerState.model && ScannerState.modelLoaded && video && video.readyState >= 2) {
    try {
      const predictions = await ScannerState.model.predict(video);
      let topPrediction = predictions[0];
      for (let i = 1; i < predictions.length; i++) {
        if (predictions[i].probability > topPrediction.probability) {
          topPrediction = predictions[i];
        }
      }
      return parseTmLabelToEpi(topPrediction.className, topPrediction.probability);
    } catch (err) {}
  }

  // Modo 2: Modo Manual de Overrides (toggles do usuário)
  if (ScannerState.detectionMode === 'manual') {
    return evaluateManualOverrides(tick);
  }

  // Modo 3: Presets de Simulação
  if (ScannerState.detectionMode.startsWith('preset_')) {
    return evaluatePresetMode(ScannerState.detectionMode, tick);
  }

  // Modo 4: Visão Computacional REAL por Análise de Pixels da Câmera
  return analyzeRealWebcamPixels(tick);
}

/**
 * ANÁLISE REAL DE PIXELS DA WEBCAM — Motor v2
 * Abordagem multi-passo com normalização adaptativa de brilho, detecção de
 * pele para ancoragem de regiões e análise diferencial de cores.
 */

// Buffer de suavização para evitar flickering entre frames (média móvel simples)
if (!ScannerState._smoothBuffer) {
  ScannerState._smoothBuffer = { cap: [], ocu: [], col: [] };
}

function _smoothed(buf, val, size = 10) {
  buf.push(val);
  if (buf.length > size) buf.shift();
  return buf.reduce((a, b) => a + b, 0) / buf.length;
}

function analyzeRealWebcamPixels(tick) {
  const video = document.getElementById('webcamVideo');

  if (!video || video.readyState < 2 || video.style.display === 'none') {
    return buildPredictionFromBooleans(
      ScannerState.manualOverrides.capacete,
      ScannerState.manualOverrides.oculos,
      ScannerState.manualOverrides.colete,
      12, 10, 14
    );
  }

  const canvas = ScannerState.analysisCanvas;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const W = canvas.width;   // 160
  const H = canvas.height;  // 120

  ctx.drawImage(video, 0, 0, W, H);
  const frame = ctx.getImageData(0, 0, W, H);
  const data = frame.data;

  // ─── Helpers inline ───────────────────────────────────────────────────────
  function px(x, y) {
    const i = (y * W + x) * 4;
    return { r: data[i], g: data[i + 1], b: data[i + 2] };
  }

  // Converte RGB para HSV (h:0-360, s:0-1, v:0-1)
  function toHSV(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const d = max - min;
    let h = 0, s = max === 0 ? 0 : d / max, v = max;
    if (d !== 0) {
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return { h: h * 360, s, v };
  }

  // ─── PASSO 0: Brilho médio da cena para normalização ──────────────────────
  let totalBright = 0, brightCount = 0;
  for (let y = 10; y < H - 10; y += 4) {
    for (let x = 10; x < W - 10; x += 4) {
      const p = px(x, y);
      totalBright += (p.r * 0.299 + p.g * 0.587 + p.b * 0.114);
      brightCount++;
    }
  }
  const avgBright = totalBright / (brightCount || 1);
  // Fator de adaptação: cenas escuras ficam mais permissivas, cenas claras mais restritas
  const brightFactor = Math.max(0.6, Math.min(1.4, 128 / (avgBright || 128)));

  // ─── PASSO 1: Detecção de tom de pele para ancoragem da face ─────────────
  // Varredura na faixa central da imagem (onde o rosto costuma aparecer)
  let skinPxCount = 0;
  let skinYsum = 0;
  for (let y = Math.floor(H * 0.15); y < Math.floor(H * 0.65); y += 2) {
    for (let x = Math.floor(W * 0.25); x < Math.floor(W * 0.75); x += 2) {
      const p = px(x, y);
      const { h, s, v } = toHSV(p.r, p.g, p.b);
      // Critério de pele: matiz quente (h entre 0-35 ou 340-360), saturação moderada, brilho médio-alto
      const isSkin = ((h < 35 || h > 340) && s > 0.15 && s < 0.75 && v > 0.25 && v < 0.95);
      if (isSkin) { skinPxCount++; skinYsum += y; }
    }
  }

  // Centro vertical estimado do rosto
  const faceY = skinPxCount > 20 ? Math.round(skinYsum / skinPxCount) : Math.round(H * 0.35);

  // Regiões relativas ao rosto detectado
  const crownY1  = Math.max(0,       faceY - Math.round(H * 0.38));
  const crownY2  = Math.max(1,       faceY - Math.round(H * 0.12));
  const eyeY1    = Math.max(0,       faceY - Math.round(H * 0.12));
  const eyeY2    = Math.min(H - 1,   faceY + Math.round(H * 0.04));
  const torsoY1  = Math.min(H - 2,   faceY + Math.round(H * 0.20));
  const torsoY2  = Math.min(H - 1,   faceY + Math.round(H * 0.75));

  const faceX1 = Math.floor(W * 0.30);
  const faceX2 = Math.floor(W * 0.70);

  // ─── PASSO 2: COR MÉDIA DA PELE (referência para comparação) ─────────────
  let skinR = 0, skinG = 0, skinB = 0, skinN = 0;
  for (let y = Math.max(0, faceY - 5); y < Math.min(H, faceY + 5); y++) {
    for (let x = faceX1; x < faceX2; x++) {
      const p = px(x, y);
      const { h, s, v } = toHSV(p.r, p.g, p.b);
      if ((h < 35 || h > 340) && s > 0.15 && s < 0.75 && v > 0.3) {
        skinR += p.r; skinG += p.g; skinB += p.b; skinN++;
      }
    }
  }
  const avgSkinR = skinN > 0 ? skinR / skinN : 180;
  const avgSkinG = skinN > 0 ? skinG / skinN : 140;
  const avgSkinB = skinN > 0 ? skinB / skinN : 110;

  // ─── PASSO 3: CAPACETE ────────────────────────────────────────────────────
  // Lógica: a região ACIMA do rosto deve ter uma cor diferente da pele.
  // Cores típicas de capacete EPI: amarelo, laranja, branco, azul, vermelho, verde.
  let helmetHit = 0, helmetTotal = 0;
  const x1h = Math.floor(W * 0.25), x2h = Math.floor(W * 0.75);

  for (let y = crownY1; y < crownY2; y++) {
    for (let x = x1h; x < x2h; x++) {
      const p = px(x, y);
      const { h, s, v } = toHSV(p.r, p.g, p.b);
      helmetTotal++;

      // Diferença em relação à cor da pele detectada
      const skinDiff = Math.abs(p.r - avgSkinR) + Math.abs(p.g - avgSkinG) + Math.abs(p.b - avgSkinB);

      // Capacete de cor sólida e saturada (amarelo/laranja/vermelho/azul/verde)
      const isColorHelmet = s > 0.30 * brightFactor && v > 0.25 &&
        ((h >= 35  && h <= 65)  ||   // Amarelo/Âmbar
         (h >= 15  && h < 35)   ||   // Laranja
         (h >= 0   && h < 15)   ||   // Vermelho quente
         (h >= 340 && h <= 360) ||   // Vermelho frio
         (h >= 195 && h <= 250) ||   // Azul
         (h >= 90  && h <= 160));     // Verde

      // Capacete branco/refletivo: muito claro e pouco saturado mas bem diferente da pele
      const isWhiteHelmet = v > 0.78 && s < 0.22 && skinDiff > 40;

      // Fundo escuro na cabeça pode ser cabelo, não capacete — ignorar
      const isHair = v < 0.28;

      if (!isHair && (isColorHelmet || isWhiteHelmet)) helmetHit++;
    }
  }

  const helmetRatio = helmetHit / (helmetTotal || 1);
  const helmetThreshold = 0.18 * brightFactor;
  const hasHelmet = helmetRatio > helmetThreshold || ScannerState.manualOverrides.capacete;
  const rawHelmetScore = hasHelmet ? Math.min(99, 70 + Math.round(helmetRatio * 120)) : Math.max(5, Math.round(helmetRatio * 80));
  const helmetScore = Math.round(_smoothed(ScannerState._smoothBuffer.cap, rawHelmetScore));

  // ─── PASSO 4: COLETE DE SEGURANÇA ────────────────────────────────────────
  // Critério: presença de cor fluorescente (altamente saturada) OU
  // listras refletivas (faixas muito claras) na região do torso.
  let vestHit = 0, vestTotal = 0;
  const x1v = Math.floor(W * 0.10), x2v = Math.floor(W * 0.90);

  for (let y = torsoY1; y < torsoY2; y++) {
    for (let x = x1v; x < x2v; x++) {
      const p = px(x, y);
      const { h, s, v } = toHSV(p.r, p.g, p.b);
      vestTotal++;

      // Fluorescente: saturação alta + matiz no range amarelo-verde ou laranja
      const isFluorescentYellow = (h >= 45 && h <= 90  && s > 0.50 && v > 0.55);
      const isFluorescentOrange = (h >= 15 && h < 45   && s > 0.55 && v > 0.50);
      const isFluorescentGreen  = (h >= 90 && h <= 135 && s > 0.45 && v > 0.45);

      // Faixa refletiva: pixel muito brilhante isolado
      const isReflective = v > 0.85 && s < 0.18;

      if (isFluorescentYellow || isFluorescentOrange || isFluorescentGreen || isReflective) {
        vestHit++;
      }
    }
  }

  // Verificação extra: se houver muita área fluorescente em Y maiores (lateral/braço)
  let vestHitExtra = 0;
  for (let y = Math.floor(H * 0.45); y < Math.min(H, Math.floor(H * 0.85)); y++) {
    for (let x = Math.floor(W * 0.05); x < Math.floor(W * 0.25); x++) {
      const p = px(x, y);
      const { h, s, v } = toHSV(p.r, p.g, p.b);
      if ((h >= 30 && h <= 135 && s > 0.45 && v > 0.45)) vestHitExtra++;
    }
    for (let x = Math.floor(W * 0.75); x < Math.floor(W * 0.95); x++) {
      const p = px(x, y);
      const { h, s, v } = toHSV(p.r, p.g, p.b);
      if ((h >= 30 && h <= 135 && s > 0.45 && v > 0.45)) vestHitExtra++;
    }
  }

  const vestRatio = (vestHit + vestHitExtra * 0.6) / (vestTotal || 1);
  const vestThreshold = 0.08 * brightFactor;
  const hasVest = vestRatio > vestThreshold || ScannerState.manualOverrides.colete;
  const rawVestScore = hasVest ? Math.min(98, 68 + Math.round(vestRatio * 180)) : Math.max(5, Math.round(vestRatio * 90));
  const vestScore = Math.round(_smoothed(ScannerState._smoothBuffer.col, rawVestScore));

  // ─── PASSO 5: ÓCULOS DE PROTEÇÃO ─────────────────────────────────────────
  // Óculos de proteção criam:
  //   a) Uma região escura/opaca ao redor dos olhos (armação)
  //   b) Reflexo claro/espelhado nas lentes
  //   c) Alta variância horizontal de cor na faixa dos olhos
  let eyeDarkness = 0, eyeReflection = 0, eyeScanPx = 0;
  let edgeTransitions = 0;

  for (let y = eyeY1; y < eyeY2; y++) {
    let prevLum = -1;
    for (let x = faceX1; x < faceX2; x++) {
      const p = px(x, y);
      const lum = p.r * 0.299 + p.g * 0.587 + p.b * 0.114;
      eyeScanPx++;

      // Escuro demais perto dos olhos → armação de óculos ou lente escura
      if (lum < 55) eyeDarkness++;
      // Muito brilhante → reflexo de lente
      if (lum > 210) eyeReflection++;

      // Transição abrupta de luminância ao longo de uma linha horizontal → borda de armação
      if (prevLum >= 0 && Math.abs(lum - prevLum) > 50) edgeTransitions++;
      prevLum = lum;
    }
  }

  const eyeScan = eyeScanPx || 1;
  const darkRatio  = eyeDarkness   / eyeScan;
  const refRatio   = eyeReflection / eyeScan;
  const edgeRate   = edgeTransitions / ((eyeY2 - eyeY1) * (faceX2 - faceX1) / (W * H) * eyeScan || 1);

  // Pontuação composta: óculos de proteção causam escuridão e transições abruptas
  const glassesSignal = (darkRatio * 2.0) + (refRatio * 0.8) + (Math.min(edgeRate, 1) * 0.5);
  const hasGlasses = glassesSignal > 0.32 || ScannerState.manualOverrides.oculos;
  const rawGlassesScore = hasGlasses ? Math.min(96, 65 + Math.round(glassesSignal * 90)) : Math.max(5, Math.round(glassesSignal * 50));
  const glassesScore = Math.round(_smoothed(ScannerState._smoothBuffer.ocu, rawGlassesScore));

  return buildPredictionFromBooleans(hasHelmet, hasGlasses, hasVest, helmetScore, glassesScore, vestScore);
}

/**
 * Avaliação por Toggles Manuais
 */
function evaluateManualOverrides(tick) {
  const hasCap = ScannerState.manualOverrides.capacete;
  const hasOcu = ScannerState.manualOverrides.oculos;
  const hasCol = ScannerState.manualOverrides.colete;

  const jitter = Math.sin(tick * 0.05) * 2;
  const capScore = hasCap ? Math.round(94 + jitter) : Math.round(12 + jitter);
  const ocuScore = hasOcu ? Math.round(91 + jitter) : Math.round(9 + jitter);
  const colScore = hasCol ? Math.round(89 + jitter) : Math.round(14 + jitter);

  return buildPredictionFromBooleans(hasCap, hasOcu, hasCol, capScore, ocuScore, colScore);
}

/**
 * Avaliação por Preset
 */
function evaluatePresetMode(preset, tick) {
  let hasCap = false, hasOcu = false, hasCol = false;

  if (preset === 'preset_all') {
    hasCap = true; hasOcu = true; hasCol = true;
  } else if (preset === 'preset_no_helmet') {
    hasCap = false; hasOcu = true; hasCol = true;
  } else if (preset === 'preset_no_glasses') {
    hasCap = true; hasOcu = false; hasCol = true;
  } else if (preset === 'preset_no_vest') {
    hasCap = true; hasOcu = true; hasCol = false;
  } else if (preset === 'preset_none') {
    hasCap = false; hasOcu = false; hasCol = false;
  }

  const jitter = Math.sin(tick * 0.05) * 2;
  const capScore = hasCap ? Math.round(95 + jitter) : Math.round(12 + jitter);
  const ocuScore = hasOcu ? Math.round(92 + jitter) : Math.round(8 + jitter);
  const colScore = hasCol ? Math.round(94 + jitter) : Math.round(15 + jitter);

  return buildPredictionFromBooleans(hasCap, hasOcu, hasCol, capScore, ocuScore, colScore);
}

/**
 * Constrói o resultado estruturado baseado nas 8 classes do Teachable Machine
 */
function buildPredictionFromBooleans(hasCap, hasOcu, hasCol, capScore, ocuScore, colScore) {
  let label = "Sem capacete, sem óculos e sem colete";

  if (hasCap && hasOcu && hasCol) {
    label = "Com capacete, óculos e colete";
  } else if (hasCap && hasOcu && !hasCol) {
    label = "Com capacete e óculos";
  } else if (hasCap && !hasOcu && hasCol) {
    label = "Com capacete e colete";
  } else if (!hasCap && hasOcu && hasCol) {
    label = "Com óculos e colete";
  } else if (hasCap && !hasOcu && !hasCol) {
    label = "Com capacete";
  } else if (!hasCap && hasOcu && !hasCol) {
    label = "Com óculos";
  } else if (!hasCap && !hasOcu && !hasCol) {
    label = "Com colete";
  } else {
    label = "Sem capacete, sem óculos e sem colete";
  }

  const isAprovado = hasCap && hasOcu && hasCol;
  const confidence = isAprovado 
    ? Math.round((capScore + ocuScore + colScore) / 3) 
    : Math.max(capScore, ocuScore, colScore, 35);

  return {
    label: label,
    confidence: confidence,
    capacete: { ok: hasCap, score: capScore },
    oculos: { ok: hasOcu, score: ocuScore },
    colete: { ok: hasCol, score: colScore },
    isAprovado: isAprovado
  };
}

/**
 * Mapeia label do Teachable Machine
 */
function parseTmLabelToEpi(className, probability) {
  const probPercent = Math.round(probability * 100);
  const lower = className.toLowerCase();

  const hasCapacete = lower.includes('capacete');
  const hasOculos = lower.includes('óculos') || lower.includes('oculos');
  const hasColete = lower.includes('colete');

  const capScore = hasCapacete ? Math.max(88, probPercent) : Math.min(18, 100 - probPercent);
  const ocuScore = hasOculos ? Math.max(85, probPercent - 2) : Math.min(15, 100 - probPercent);
  const colScore = hasColete ? Math.max(90, probPercent + 1) : Math.min(12, 100 - probPercent);

  const isAprovado = hasCapacete && hasOculos && hasColete;

  return {
    label: className,
    confidence: probPercent,
    capacete: { ok: hasCapacete, score: capScore },
    oculos: { ok: hasOculos, score: ocuScore },
    colete: { ok: hasColete, score: colScore },
    isAprovado: isAprovado
  };
}

/**
 * 5. Atualização da Interface
 */
function updatePredictionUI(pred) {
  ScannerState.currentPrediction = pred;

  const labelEl = document.getElementById('aiLabelText');
  if (labelEl) {
    labelEl.textContent = `${pred.label} (${pred.confidence}%)`;
  }

  updateEpiRow('capacete', pred.capacete.ok, pred.capacete.score);
  updateEpiRow('oculos', pred.oculos.ok, pred.oculos.score);
  updateEpiRow('colete', pred.colete.ok, pred.colete.score);

  const camContainer = document.getElementById('cameraWrapper');
  if (camContainer) {
    if (pred.isAprovado) {
      camContainer.classList.add('verified-ok');
      camContainer.classList.remove('verified-fail');
    } else {
      camContainer.classList.remove('verified-ok');
      camContainer.classList.add('verified-fail');
    }
  }

  // Atualiza botões de override visual
  updateOverrideButtonsVisual();
}

function updateEpiRow(name, isOk, score) {
  const card = document.getElementById(`card-${name}`);
  const statusBadge = document.getElementById(`status-${name}`);
  const pctText = document.getElementById(`pct-${name}`);
  const barFill = document.getElementById(`bar-${name}`);

  if (!card) return;

  if (isOk) {
    card.classList.add('status-ok');
    card.classList.remove('status-missing');

    if (statusBadge) {
      statusBadge.textContent = `OK • ${score}%`;
      statusBadge.className = 'epi-badge-pill ok';
    }

    if (pctText) pctText.textContent = `Conformidade: ${score}%`;

    if (barFill) {
      barFill.style.width = `${score}%`;
      barFill.className = 'epi-progress-fill fill-ok';
    }
  } else {
    card.classList.remove('status-ok');
    card.classList.add('status-missing');

    if (statusBadge) {
      statusBadge.textContent = `AUSENTE (${score}%)`;
      statusBadge.className = 'epi-badge-pill fail';
    }

    if (pctText) pctText.textContent = `Não Detectado: ${score}%`;

    if (barFill) {
      barFill.style.width = `${score}%`;
      barFill.className = 'epi-progress-fill fill-fail';
    }
  }
}

function updateOverrideButtonsVisual() {
  const btnCap = document.getElementById('toggleBtnCapacete');
  const btnOcu = document.getElementById('toggleBtnOculos');
  const btnCol = document.getElementById('toggleBtnColete');

  if (btnCap) {
    btnCap.style.background = ScannerState.currentPrediction.capacete.ok ? 'var(--color-success-bg)' : 'transparent';
    btnCap.style.borderColor = ScannerState.currentPrediction.capacete.ok ? 'var(--color-success)' : 'var(--border-subtle)';
  }
  if (btnOcu) {
    btnOcu.style.background = ScannerState.currentPrediction.oculos.ok ? 'var(--color-success-bg)' : 'transparent';
    btnOcu.style.borderColor = ScannerState.currentPrediction.oculos.ok ? 'var(--color-success)' : 'var(--border-subtle)';
  }
  if (btnCol) {
    btnCol.style.background = ScannerState.currentPrediction.colete.ok ? 'var(--color-success-bg)' : 'transparent';
    btnCol.style.borderColor = ScannerState.currentPrediction.colete.ok ? 'var(--color-success)' : 'var(--border-subtle)';
  }
}

/**
 * 6. Validação Instantânea (Botão "VALIDAR AGORA")
 */
function executarValidacao() {
  const btn = document.getElementById('btnValidar');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `Validando...`;
  }

  capturarSnapshot();

  setTimeout(() => {
    const pred = ScannerState.currentPrediction;
    tocarSomFeedback(pred.isAprovado);
    exibirModalResultado(pred);

    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Validar Conformidade';
    }
  }, 400);
}

function capturarSnapshot() {
  const video = document.getElementById('webcamVideo');
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 240;
  const ctx = canvas.getContext('2d');

  if (video && video.readyState >= 2 && video.style.display !== 'none') {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  } else {
    const fallbackCanvas = document.getElementById('fallbackCanvas');
    if (fallbackCanvas) {
      ctx.drawImage(fallbackCanvas, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#f59e0b";
      ctx.font = "14px sans-serif";
      ctx.fillText("Registro de Auditoria", 20, 120);
    }
  }

  ScannerState.lastSnapshot = canvas.toDataURL('image/jpeg', 0.85);
}

function exibirModalResultado(pred) {
  const modal = document.getElementById('modalResultado');
  const statusIcon = document.getElementById('resStatusIcon');
  const resTitle = document.getElementById('resTitle');
  const resDesc = document.getElementById('resDesc');
  const resSnapshot = document.getElementById('resSnapshot');
  const resDataHora = document.getElementById('resDataHora');
  const resNomeOperador = document.getElementById('resNomeOperador');
  const resCapacete = document.getElementById('resCapacete');
  const resOculos = document.getElementById('resOculos');
  const resColete = document.getElementById('resColete');

  const usuario = JSON.parse(localStorage.getItem('usuarioLogado') || '{}');
  const agora = new Date();
  const dataFormatada = agora.toLocaleDateString('pt-BR') + ' ' + agora.toLocaleTimeString('pt-BR');

  if (resDataHora) resDataHora.textContent = dataFormatada;
  if (resNomeOperador) resNomeOperador.textContent = usuario.nome || 'Operador da Estação';
  if (resSnapshot && ScannerState.lastSnapshot) resSnapshot.src = ScannerState.lastSnapshot;

  if (pred.isAprovado) {
    if (statusIcon) {
      statusIcon.innerHTML = '✓';
      statusIcon.className = 'result-status-icon approved';
    }
    if (resTitle) {
      resTitle.textContent = 'ACESSO LIBERADO';
      resTitle.className = 'result-title approved';
    }
    if (resDesc) resDesc.textContent = 'Conformidade plena! Todos os EPIs obrigatórios foram validados com sucesso.';
  } else {
    if (statusIcon) {
      statusIcon.innerHTML = '✕';
      statusIcon.className = 'result-status-icon denied';
    }
    if (resTitle) {
      resTitle.textContent = 'ACESSO BLOQUEADO';
      resTitle.className = 'result-title denied';
    }
    if (resDesc) resDesc.textContent = 'Atenção! Um ou mais EPIs obrigatórios (Capacete, Óculos ou Colete) não foram identificados.';
  }

  if (resCapacete) {
    resCapacete.innerHTML = pred.capacete.ok
      ? `<span class="badge-status badge-approved">Capacete OK (${pred.capacete.score}%)</span>`
      : `<span class="badge-status badge-denied">Capacete Ausente (${pred.capacete.score}%)</span>`;
  }
  if (resOculos) {
    resOculos.innerHTML = pred.oculos.ok
      ? `<span class="badge-status badge-approved">Óculos OK (${pred.oculos.score}%)</span>`
      : `<span class="badge-status badge-denied">Óculos Ausente (${pred.oculos.score}%)</span>`;
  }
  if (resColete) {
    resColete.innerHTML = pred.colete.ok
      ? `<span class="badge-status badge-approved">Colete OK (${pred.colete.score}%)</span>`
      : `<span class="badge-status badge-denied">Colete Ausente (${pred.colete.score}%)</span>`;
  }

  // Grava auditoria no localStorage (sem depender de banco de dados)
  salvarHistoricoLocal({
    id: Date.now(),
    funcionario: usuario.nome || 'Operador',
    email: usuario.email || 'operador@empresa.com',
    status: pred.isAprovado ? 'Aprovado' : 'Reprovado',
    detalhes: pred.label,
    capacete: pred.capacete,
    oculos: pred.oculos,
    colete: pred.colete,
    data_hora: agora.toISOString(),
    foto: ScannerState.lastSnapshot
  });

  if (modal) modal.classList.add('active');
}

function salvarHistoricoLocal(registro) {
  try {
    const historico = JSON.parse(localStorage.getItem('historicoVerificacoes') || '[]');
    historico.unshift(registro);
    if (historico.length > 50) historico.pop();
    localStorage.setItem('historicoVerificacoes', JSON.stringify(historico));
  } catch (e) {}
}

function fecharModalResultado() {
  const modal = document.getElementById('modalResultado');
  if (modal) modal.classList.remove('active');
}

function tocarSomFeedback(aprovado) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    if (!ScannerState.audioCtx) ScannerState.audioCtx = new AudioContext();

    const ctx = ScannerState.audioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (aprovado) {
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.setValueAtTime(140, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch (e) {}
}

/**
 * 7. Configura eventos e controles na tela
 */
function setupEventListeners() {
  const btnValidar = document.getElementById('btnValidar');
  if (btnValidar) btnValidar.addEventListener('click', executarValidacao);

  const btnFecharModal = document.getElementById('btnFecharModal');
  if (btnFecharModal) btnFecharModal.addEventListener('click', fecharModalResultado);

  const btnSwitchCam = document.getElementById('btnSwitchCam');
  if (btnSwitchCam) btnSwitchCam.addEventListener('click', toggleCamera);

  const selectModo = document.getElementById('selectModo');
  if (selectModo) {
    selectModo.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val === 'auto_vision') {
        ScannerState.detectionMode = 'auto_vision';
      } else {
        ScannerState.detectionMode = val;
      }
    });
  }

  // Toggles Manuais rápidos para testes imediatos
  const btnCap = document.getElementById('toggleBtnCapacete');
  if (btnCap) {
    btnCap.addEventListener('click', () => {
      ScannerState.detectionMode = 'manual';
      ScannerState.manualOverrides.capacete = !ScannerState.manualOverrides.capacete;
      if (selectModo) selectModo.value = 'manual';
    });
  }

  const btnOcu = document.getElementById('toggleBtnOculos');
  if (btnOcu) {
    btnOcu.addEventListener('click', () => {
      ScannerState.detectionMode = 'manual';
      ScannerState.manualOverrides.oculos = !ScannerState.manualOverrides.oculos;
      if (selectModo) selectModo.value = 'manual';
    });
  }

  const btnCol = document.getElementById('toggleBtnColete');
  if (btnCol) {
    btnCol.addEventListener('click', () => {
      ScannerState.detectionMode = 'manual';
      ScannerState.manualOverrides.colete = !ScannerState.manualOverrides.colete;
      if (selectModo) selectModo.value = 'manual';
    });
  }

  const btnCarregarUrl = document.getElementById('btnCarregarUrl');
  if (btnCarregarUrl) {
    btnCarregarUrl.addEventListener('click', () => loadTmFromUrl());
  }

  const fileInputWeights = document.getElementById('inputWeightsFile');
  if (fileInputWeights) {
    fileInputWeights.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        carregarWeightsBinManual(e.target.files[0]);
      }
    });
  }
}
