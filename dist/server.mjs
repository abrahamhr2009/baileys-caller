/**
 * Main server — Express + Socket.IO.
 *
 * Serves the web panel and bridges WhatsApp auth, calls, and TTS
 * to the browser in real time.
 *
 * @author Kilo
 */
import express from "express";
import { createServer } from "node:http";
import { Server as IoServer } from "socket.io";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { VoipClient } from "./index.mjs";
import AuthManager from "./auth-manager.mjs";
import CallManager from "./call-manager.mjs";
import { TtsManager } from "./tts.mjs";
const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(fileURLToPath(import.meta.url), "..", "..");
const PORT = Number(process.env.PORT) || 3000;
const AUTH_DIR = process.env.AUTH_DIR || resolve(__dirname, "auth");
const TTS_DIR = process.env.TTS_DIR || resolve(__dirname, "tts-cache");
const PUBLIC_DIR = resolve(__dirname, "public");
const app = express();
const httpServer = createServer(app);
const io = new IoServer(httpServer, {
    cors: {
        origin: process.env.CORS_ORIGIN ?? "*",
        methods: ["GET", "POST"],
    },
});
app.use(express.json());
app.use(express.static(PUBLIC_DIR));
// Singleton instances
const authManager = new AuthManager(AUTH_DIR);
const callManager = new CallManager(authManager);
const ttsManager = new TtsManager(TTS_DIR);
let voipClient = null;
// ── Health check ─────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
    res.json({
        status: "ok",
        whatsapp: authManager.status,
        connected: authManager.isConnected,
        timestamp: new Date().toISOString(),
    });
});
// ── Auth endpoints ───────────────────────────────────────────────────────
app.get("/auth/status", (_req, res) => {
    res.json({
        status: authManager.status,
        connected: authManager.isConnected,
        phoneNumber: authManager.phoneNumber,
        userJid: authManager.userJid,
        hasSavedSession: authManager.hasSavedSession(),
    });
});
app.post("/auth/connect/qr", async (_req, res) => {
    try {
        await authManager.connectQr();
        res.json({ ok: true, method: "qr" });
    }
    catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});
app.post("/auth/connect/code", async (req, res) => {
    const { phoneNumber } = req.body ?? {};
    if (!phoneNumber) {
        return res.status(400).json({ ok: false, error: "phoneNumber is required" });
    }
    try {
        await authManager.connectCode(phoneNumber);
        res.json({ ok: true, method: "code", phoneNumber });
    }
    catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});
app.post("/auth/disconnect", (_req, res) => {
    authManager.disconnect();
    voipClient = null;
    callManager.initialize(null);
    res.json({ ok: true });
});
app.post("/auth/reconnect", async (_req, res) => {
    const ok = await authManager.reconnectSaved();
    res.json({ ok });
});
// ── Call endpoints ───────────────────────────────────────────────────────
app.post("/call", async (req, res) => {
    const { phoneNumber, audioSource, durationMs } = req.body ?? {};
    if (!phoneNumber) {
        return res.status(400).json({ ok: false, error: "phoneNumber is required" });
    }
    if (!authManager.isConnected) {
        return res.status(400).json({ ok: false, error: "WhatsApp not connected" });
    }
    if (!voipClient) {
        return res.status(500).json({ ok: false, error: "VoipClient not initialized" });
    }
    if (callManager.isCalling) {
        return res.status(400).json({ ok: false, error: "A call is already active" });
    }
    try {
        callManager.initialize(voipClient);
        const callId = await callManager.call(phoneNumber, {
            audioSource,
            durationMs,
        });
        res.json({ ok: true, callId });
    }
    catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});
app.post("/call/hangup", (_req, res) => {
    callManager.hangup();
    res.json({ ok: true });
});
app.get("/call/history", (_req, res) => {
    res.json({ calls: callManager.getHistory() });
});
// ── TTS endpoints ────────────────────────────────────────────────────────
app.get("/tts/voices", (_req, res) => {
    res.json({ voices: ttsManager.listVoices() });
});
app.post("/tts/generate", (req, res) => {
    const { text, voice } = req.body ?? {};
    if (!text) {
        return res.status(400).json({ ok: false, error: "text is required" });
    }
    try {
        const filePath = ttsManager.generate(text, voice);
        const fileName = filePath.split("/").pop() ?? filePath;
        res.json({ ok: true, file: fileName, path: filePath });
    }
    catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});
app.get("/tts/file/:fileName", (req, res) => {
    const fileName = req.params.fileName;
    const filePath = resolve(TTS_DIR, fileName);
    if (!filePath.startsWith(TTS_DIR)) {
        return res.status(400).json({ ok: false, error: "Invalid file path" });
    }
    res.sendFile(filePath);
});
// ── Socket.IO ────────────────────────────────────────────────────────────
io.on("connection", (socket) => {
    console.log("[Socket] Client connected:", socket.id);
    // Send initial state
    socket.emit("auth:status", {
        status: authManager.status,
        connected: authManager.isConnected,
        phoneNumber: authManager.phoneNumber,
        userJid: authManager.userJid,
        hasSavedSession: authManager.hasSavedSession(),
    });
    socket.emit("call:state", {
        isCalling: callManager.isCalling,
        activeCallId: callManager.activeCallId,
        calls: callManager.getHistory(),
    });
    socket.emit("tts:voices", { voices: ttsManager.listVoices() });
    // Auth events
    authManager.on("status", (status, detail) => {
        socket.emit("auth:status", {
            status,
            connected: authManager.isConnected,
            phoneNumber: authManager.phoneNumber,
            userJid: authManager.userJid,
            detail,
        });
    });
    authManager.on("qr", (qrDataUrl) => {
        socket.emit("auth:qr", { qr: qrDataUrl });
    });
    authManager.on("code", (code, phoneNumber) => {
        socket.emit("auth:code", { code, phoneNumber });
    });
    authManager.on("connected", (userJid, phoneNumber) => {
        socket.emit("auth:connected", { userJid, phoneNumber });
        // Initialize VoipClient with the shared Baileys socket
        if (!voipClient && authManager.sock) {
            voipClient = new VoipClient({ authDir: AUTH_DIR, sock: authManager.sock });
            void voipClient.connect().catch((err) => {
                console.error("[Voip] Failed to initialize VoipClient:", err);
            });
            console.log("[Voip] VoipClient initialized with shared socket");
        }
    });
    authManager.on("disconnected", () => {
        socket.emit("auth:disconnected");
        voipClient = null;
    });
    authManager.on("error", (message) => {
        socket.emit("auth:error", { message });
    });
    // Call events
    callManager.on("callStarted", (call) => {
        socket.emit("call:started", call);
    });
    callManager.on("callRinging", (callId) => {
        socket.emit("call:ringing", { callId });
    });
    callManager.on("callConnected", (callId) => {
        socket.emit("call:connected", { callId });
    });
    callManager.on("callEnded", (call) => {
        socket.emit("call:ended", call);
    });
    callManager.on("callError", (callId, error) => {
        socket.emit("call:error", { callId, error });
    });
    callManager.on("audioData", (callId, length) => {
        socket.emit("call:audio", { callId, length });
    });
    // Client commands
    socket.on("auth:connect:qr", async () => {
        await authManager.connectQr();
    });
    socket.on("auth:connect:code", async (data) => {
        await authManager.connectCode(data.phoneNumber);
    });
    socket.on("auth:disconnect", () => {
        authManager.disconnect();
        voipClient = null;
    });
    socket.on("auth:reconnect", async () => {
        const ok = await authManager.reconnectSaved();
        socket.emit("auth:reconnect:result", { ok });
    });
    socket.on("call:start", async (data) => {
        if (!authManager.isConnected) {
            socket.emit("call:error", { callId: "", error: "WhatsApp not connected" });
            return;
        }
        if (!voipClient && authManager.sock) {
            voipClient = new VoipClient({ authDir: AUTH_DIR, sock: authManager.sock });
            void voipClient.connect().catch((err) => {
                console.error("[Voip] Failed to initialize VoipClient:", err);
            });
        }
        callManager.initialize(voipClient);
        try {
            const callId = await callManager.call(data.phoneNumber, {
                audioSource: data.audioSource,
                durationMs: data.durationMs,
            });
            socket.emit("call:started", { id: callId, ...data });
        }
        catch (err) {
            socket.emit("call:error", { callId: "", error: err.message });
        }
    });
    socket.on("call:hangup", () => {
        callManager.hangup();
    });
    socket.on("tts:generate", (data) => {
        try {
            const filePath = ttsManager.generate(data.text, data.voice);
            const fileName = filePath.split("/").pop() ?? filePath;
            socket.emit("tts:generated", { file: fileName, path: filePath });
        }
        catch (err) {
            socket.emit("tts:error", { error: err.message });
        }
    });
    socket.on("disconnect", () => {
        console.log("[Socket] Client disconnected:", socket.id);
    });
});
// ── Start ────────────────────────────────────────────────────────────────
httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
    console.log(`Auth dir: ${AUTH_DIR}`);
    console.log(`TTS dir: ${TTS_DIR}`);
});
export { app, httpServer, io, authManager, callManager, ttsManager, voipClient };
