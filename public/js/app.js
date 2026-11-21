/**
 * Frontend application for WhatsApp Caller web panel.
 * Connects to the backend via Socket.IO.
 */

const socket = io();

// ── State ──────────────────────────────────────────────────────────────
let currentStatus = "disconnected";
let currentPhone = "";
let currentUserJid = "";
let isCalling = false;
let activeCallId = null;
let ttsVoices = [];

// ── DOM elements ───────────────────────────────────────────────────────
const els = {
  statusDot: document.getElementById("status-dot"),
  statusText: document.getElementById("status-text"),
  statusDetail: document.getElementById("status-detail"),
  phoneNumber: document.getElementById("phone-number"),
  phoneNumberValue: document.getElementById("phone-number-value"),
  qrPlaceholder: document.getElementById("qr-placeholder"),
  qrImage: document.getElementById("qr-image"),
  btnGenQr: document.getElementById("btn-gen-qr"),
  btnRefreshQr: document.getElementById("btn-refresh-qr"),
  btnRefreshConn: document.getElementById("btn-refresh-conn"),
  methodTabs: document.querySelectorAll(".method-tab"),
  methodPanels: document.querySelectorAll(".method-panel"),
  inputPhone: document.getElementById("input-phone"),
  btnRequestCode: document.getElementById("btn-request-code"),
  codeDisplay: document.getElementById("code-display"),
  codeValue: document.getElementById("code-value"),
  btnCopyCode: document.getElementById("btn-copy-code"),
  inputCallNumber: document.getElementById("input-call-number"),
  selectAudio: document.getElementById("select-audio"),
  ttsOptions: document.getElementById("tts-options"),
  selectTtsVoice: document.getElementById("select-tts-voice"),
  inputTtsText: document.getElementById("input-tts-text"),
  btnCall: document.getElementById("btn-call"),
  btnHangup: document.getElementById("btn-hangup"),
  callStatusText: document.getElementById("call-status-text"),
  eventsConsole: document.getElementById("events-console"),
  callsTableBody: document.getElementById("calls-table-body"),
  settingAuthDir: document.getElementById("setting-auth-dir"),
  settingTtsDir: document.getElementById("setting-tts-dir"),
  btnClearSession: document.getElementById("btn-clear-session"),
};

// ── Navigation ─────────────────────────────────────────────────────────
document.querySelectorAll(".nav-item").forEach((item) => {
  item.addEventListener("click", (e) => {
    e.preventDefault();
    const page = item.dataset.page;
    document.querySelectorAll(".nav-item").forEach((n) => n.classList.remove("active"));
    document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
    item.classList.add("active");
    document.getElementById(`page-${page}`).classList.add("active");
    document.getElementById("page-title").textContent =
      item.querySelector(".nav-label").textContent;
  });
});

// ── Method tabs ────────────────────────────────────────────────────────
els.methodTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    els.methodTabs.forEach((t) => t.classList.remove("active"));
    els.methodPanels.forEach((p) => (p.style.display = "none"));
    tab.classList.add("active");
    const method = tab.dataset.method;
    document.getElementById(`method-${method}`).style.display = "block";
  });
});

// ── Audio selector / TTS options ──────────────────────────────────────
els.selectAudio.addEventListener("change", () => {
  if (els.selectAudio.value === "tts") {
    els.ttsOptions.style.display = "block";
  } else {
    els.ttsOptions.style.display = "none";
  }
});

// ── Logging ────────────────────────────────────────────────────────────
function log(type, message) {
  const now = new Date().toLocaleTimeString("es-ES", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const div = document.createElement("div");
  div.className = `event-line`;
  div.innerHTML = `<span class="event-time">[${now}]</span><span class="event-type ${type}">${type}</span>${message}`;
  els.eventsConsole.prepend(div);

  // Keep console manageable
  while (els.eventsConsole.children.length > 100) {
    els.eventsConsole.lastChild.remove();
  }
}

// ── Status updates ─────────────────────────────────────────────────────
function updateStatus(status, detail) {
  currentStatus = status;
  const dot = els.statusDot;
  const text = els.statusText;
  const detailEl = els.statusDetail;

  dot.className = "status-dot";
  text.textContent = "Desconectado";
  detailEl.textContent = detail || "";

  switch (status) {
    case "connected":
      dot.classList.add("connected");
      text.textContent = "Conectado";
      detailEl.textContent = detail || "Sesión activa";
      els.phoneNumber.style.display = "block";
      break;
    case "waiting_qr":
      dot.classList.add("waiting");
      text.textContent = "Esperando QR";
      detailEl.textContent = detail || "Escanea el código QR";
      break;
    case "waiting_code":
      dot.classList.add("waiting");
      text.textContent = "Esperando código";
      detailEl.textContent = detail || "Esperando vinculación";
      break;
    case "error":
      dot.classList.add("error");
      text.textContent = "Error";
      detailEl.textContent = detail || "Error de conexión";
      break;
    case "disconnected":
    default:
      dot.classList.add("");
      text.textContent = "Desconectado";
      detailEl.textContent = detail || "Sin sesión activa";
      els.phoneNumber.style.display = "none";
      break;
  }

  log("status", `: Estado cambiado a <strong>${status}</strong>`);
  if (detail) log("status", `: ${detail}`);
}

function updatePhone(phone, jid) {
  currentPhone = phone;
  currentUserJid = jid;
  if (phone) {
    els.phoneNumberValue.textContent = phone;
    els.phoneNumber.style.display = "block";
    log("connected", `: Número vinculado: <strong>${phone}</strong>`);
  }
}

// ── Socket.IO events ───────────────────────────────────────────────────
socket.on("connect", () => {
  log("status", ": Conectado al servidor");
});

socket.on("disconnect", () => {
  log("error", ": Desconectado del servidor");
});

socket.on("auth:status", (data) => {
  updateStatus(data.status, data.detail);
  if (data.phoneNumber) updatePhone(data.phoneNumber, data.userJid);
  if (data.hasSavedSession) {
    log("status", ": Sesión guardada disponible");
  }
});

socket.on("auth:qr", (data) => {
  els.qrPlaceholder.style.display = "none";
  els.qrImage.src = data.qr;
  els.qrImage.style.display = "block";
  log("status", ": Código QR generado. Escanea con WhatsApp.");
});

socket.on("auth:code", (data) => {
  els.codeDisplay.style.display = "block";
  els.codeValue.textContent = data.code;
  log("code", `: Código de 8 dígitos generado: <strong>${data.code}</strong>`);
  log("code", `: Introduce este código en WhatsApp > Dispositivos vinculados.`);
});

socket.on("auth:connected", (data) => {
  updateStatus("connected", "Sesión activada");
  updatePhone(data.phoneNumber, data.userJid);
  log("connected", ": WhatsApp conectado exitosamente");
});

socket.on("auth:disconnected", () => {
  updateStatus("disconnected", "Sesión terminada");
  els.qrPlaceholder.style.display = "block";
  els.qrImage.style.display = "none";
  els.qrImage.src = "";
  els.codeDisplay.style.display = "none";
  log("disconnected", ": WhatsApp desconectado");
});

socket.on("auth:error", (data) => {
  updateStatus("error", data.message);
  log("error", `: ${data.message}`);
});

socket.on("call:started", (call) => {
  isCalling = true;
  activeCallId = call.id;
  els.btnCall.disabled = true;
  els.btnHangup.disabled = false;
  els.callStatusText.textContent = "Llamando...";
  log("call-started", `: Llamada iniciada a <strong>${call.phoneNumber}</strong>`);
});

socket.on("call:ringing", (data) => {
  els.callStatusText.textContent = "Sonando...";
  log("ringing", `: Llamada ${data.callId} - dispositivo remoto sonando`);
});

socket.on("call:connected", (data) => {
  els.callStatusText.textContent = "Conectado";
  log("connected", ": Llamada respondida - audio activo");
});

socket.on("call:ended", (call) => {
  isCalling = false;
  activeCallId = null;
  els.btnCall.disabled = false;
  els.btnHangup.disabled = true;
  els.callStatusText.textContent = "Llamada terminada";
  log("call-ended", `: Llamada finalizada - razón: ${call.reason || "desconocida"}`);
  loadCallHistory();
});

socket.on("call:error", (data) => {
  isCalling = false;
  activeCallId = null;
  els.btnCall.disabled = false;
  els.btnHangup.disabled = true;
  els.callStatusText.textContent = "Error";
  log("error", `: Error de llamada: ${data.error}`);
});

socket.on("call:audio", (data) => {
  // Audio data received - could show a visual indicator
});

socket.on("tts:voices", (data) => {
  ttsVoices = data.voices;
  els.selectTtsVoice.innerHTML = ttsVoices
    .map((v) => `<option value="${v.id}">${v.name}</option>`)
    .join("");
});

socket.on("tts:generated", (data) => {
  log("status", `: Audio TTS generado: ${data.file}`);
});

socket.on("tts:error", (data) => {
  log("error", `: Error TTS: ${data.error}`);
});

socket.on("auth:reconnect:result", (data) => {
  if (data.ok) {
    log("status", ": Reconexión iniciada");
  } else {
    log("error", ": No se pudo reconectar (no hay sesión guardada)");
  }
});

// ── Actions ────────────────────────────────────────────────────────────

// Generate QR
els.btnGenQr.addEventListener("click", () => {
  socket.emit("auth:connect:qr");
});

// Refresh QR
els.btnRefreshQr.addEventListener("click", () => {
  socket.emit("auth:connect:qr");
});

// Refresh connection
els.btnRefreshConn.addEventListener("click", () => {
  socket.emit("auth:reconnect");
});

// Request pairing code
els.btnRequestCode.addEventListener("click", () => {
  const phone = els.inputPhone.value.trim();
  if (!phone) {
    alert("Por favor introduce un número de teléfono");
    return;
  }
  socket.emit("auth:connect:code", { phoneNumber: phone });
});

// Copy code
els.btnCopyCode.addEventListener("click", () => {
  const code = els.codeValue.textContent;
  navigator.clipboard.writeText(code).then(() => {
    log("status", ": Código copiado al portapapeles");
  });
});

// Make call
els.btnCall.addEventListener("click", () => {
  const number = els.inputCallNumber.value.trim();
  if (!number) {
    alert("Por favor introduce un número de teléfono");
    return;
  }

  let audioSource = els.selectAudio.value;
  let ttsText = "";

  if (audioSource === "tts") {
    ttsText = els.inputTtsText.value.trim();
    if (!ttsText) {
      alert("Por favor escribe un mensaje para TTS");
      return;
    }
    // Generate TTS audio first, then use the file path
    // For now, we'll send "tts" as the source and the server can handle it
    audioSource = "tts";
  }

  socket.emit("call:start", {
    phoneNumber: number,
    audioSource,
    durationMs: 120000,
    ttsText,
    ttsVoice: els.selectTtsVoice.value,
  });
});

// Hang up
els.btnHangup.addEventListener("click", () => {
  socket.emit("call:hangup");
});

// Clear session
els.btnClearSession.addEventListener("click", () => {
  if (confirm("¿Estás seguro de que quieres borrar la sesión guardada? Esto requerirá volver a escanear el QR.")) {
    socket.emit("auth:disconnect");
    // Reload to clear state
    location.reload();
  }
});

// ── Call history ───────────────────────────────────────────────────────
async function loadCallHistory() {
  try {
    const res = await fetch("/call/history");
    const data = await res.json();
    const tbody = els.callsTableBody;
    tbody.innerHTML = "";
    data.calls.forEach((call) => {
      const tr = document.createElement("tr");
      const date = new Date(call.startedAt).toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const duration = call.durationMs
        ? `${Math.floor(call.durationMs / 1000)}s`
        : "-";
      tr.innerHTML = `
        <td>${date}</td>
        <td>${call.phoneNumber}</td>
        <td><span class="badge badge-${call.status}">${call.status}</span></td>
        <td>${duration}</td>
        <td>${call.reason || "-"}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Failed to load call history:", err);
  }
}

// ── Initialize ─────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  loadCallHistory();
  // Request TTS voices
  socket.emit("tts:get-voices");
});
