/**
 * WhatsApp Auth Manager.
 *
 * Handles both QR code and 8-digit pairing code authentication
 * using Baileys multi-file auth state for session persistence.
 *
 * @author Kilo
 */
import { EventEmitter } from "node:events";
import { resolve } from "node:path";
import QRCode from "qrcode";
export class AuthManager extends EventEmitter {
    #authDir;
    #sock = null;
    #baileys = null;
    #status = "disconnected";
    #phoneNumber = "";
    #userJid = "";
    #pairingCode = "";
    #pairingPhone = "";
    #reconnectTimer = null;
    #connecting = false;
    constructor(authDir) {
        super();
        this.#authDir = resolve(authDir);
    }
    get status() { return this.#status; }
    get phoneNumber() { return this.#phoneNumber; }
    get userJid() { return this.#userJid; }
    get isConnected() { return this.#status === "connected" && this.#sock !== null; }
    /** Connect using QR code method. */
    async connectQr() {
        if (this.#connecting)
            return;
        this.#connecting = true;
        this.#status = "waiting_qr";
        this.emit("status", "waiting_qr");
        try {
            await this.#initBaileys();
            await this.#createSocket({ printQR: true });
        }
        catch (err) {
            this.#status = "error";
            this.emit("error", err?.message ?? String(err));
            this.#connecting = false;
        }
    }
    /** Connect using 8-digit pairing code method. */
    async connectCode(phoneNumber) {
        if (this.#connecting)
            return;
        this.#pairingPhone = phoneNumber.replace(/\D/g, "");
        this.#status = "waiting_code";
        this.emit("status", "waiting_code", this.#pairingPhone);
        try {
            await this.#initBaileys();
            await this.#createSocket({ pairingPhone: this.#pairingPhone });
        }
        catch (err) {
            this.#status = "error";
            this.emit("error", err?.message ?? String(err));
            this.#connecting = false;
        }
    }
    /** Disconnect from WhatsApp. */
    disconnect() {
        if (this.#reconnectTimer) {
            clearTimeout(this.#reconnectTimer);
            this.#reconnectTimer = null;
        }
        this.#connecting = false;
        this.#status = "disconnected";
        this.#phoneNumber = "";
        this.#userJid = "";
        this.#pairingCode = "";
        this.#pairingPhone = "";
        try {
            this.#sock?.end?.();
        }
        catch { }
        this.#sock = null;
        this.emit("status", "disconnected");
        this.emit("disconnected");
    }
    /** Get the Baileys socket for use by VoipClient. */
    get sock() { return this.#sock; }
    /** Check if there's an existing saved session. */
    hasSavedSession() {
        try {
            const fs = require("node:fs");
            const credsPath = resolve(this.#authDir, "creds.json");
            return fs.existsSync(credsPath);
        }
        catch {
            return false;
        }
    }
    /** Reconnect using saved session. */
    async reconnectSaved() {
        if (!this.hasSavedSession())
            return false;
        if (this.#connecting)
            return false;
        this.#connecting = true;
        this.#status = "waiting_qr";
        this.emit("status", "waiting_qr");
        try {
            await this.#initBaileys();
            await this.#createSocket({ restoreSession: true });
            return true;
        }
        catch (err) {
            this.#status = "error";
            this.emit("error", err?.message ?? String(err));
            this.#connecting = false;
            return false;
        }
    }
    // ─── private ──────────────────────────────────────────────────────────────
    async #initBaileys() {
        this.#baileys = await import("@whiskeysockets/baileys");
    }
    async #createSocket(opts) {
        const { useMultiFileAuthState, default: makeWASocket } = this.#baileys;
        const { state, saveCreds } = await useMultiFileAuthState(this.#authDir);
        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: opts.printQR,
            logger: { level: "silent" },
        });
        this.#sock = sock;
        sock.ev.on("creds.update", saveCreds);
        sock.ev.on("connection.update", (update) => {
            const { qr, connection, lastDisconnect } = update;
            if (qr) {
                this.#handleQr(qr);
                return;
            }
            if (connection === "open") {
                this.#handleOpen(sock);
                return;
            }
            if (connection === "close") {
                this.#handleClose(lastDisconnect, opts);
                return;
            }
        });
        sock.ev.on("message", async (_msg) => {
            // Handle incoming pairing code if we're in code mode
            if (opts.pairingPhone && this.#status === "waiting_code") {
                await this.#handlePairingCode(sock, _msg);
            }
        });
    }
    #handleQr(qr) {
        this.#status = "waiting_qr";
        this.emit("status", "waiting_qr");
        QRCode.toDataURL(qr, { type: "image/png", width: 400, margin: 2 })
            .then((dataUrl) => {
            this.emit("qr", dataUrl);
        })
            .catch((err) => {
            this.emit("error", `QR generation failed: ${err.message}`);
        });
    }
    #handleOpen(sock) {
        this.#connecting = false;
        this.#status = "connected";
        const creds = sock.authState.creds;
        this.#userJid = creds.me?.id ?? "";
        const rawNumber = this.#userJid.replace(/@.*$/, "");
        this.#phoneNumber = rawNumber;
        this.emit("status", "connected", `Conectado: ${this.#phoneNumber}`);
        this.emit("connected", this.#userJid, this.#phoneNumber);
    }
    async #handleClose(lastDisconnect, opts) {
        this.#connecting = false;
        this.#status = "disconnected";
        this.emit("status", "disconnected");
        this.emit("disconnected");
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode === 515 || statusCode === "515";
        if (shouldReconnect) {
            this.#reconnectTimer = setTimeout(async () => {
                try {
                    await this.#createSocket(opts);
                }
                catch { }
            }, 3000);
        }
    }
    async #handlePairingCode(sock, _msg) {
        try {
            const code = sock.authState.creds?.pairingCode;
            if (code && code !== this.#pairingCode && this.#status === "waiting_code") {
                this.#pairingCode = code;
                this.emit("code", code, this.#pairingPhone);
            }
        }
        catch { }
    }
}
export default AuthManager;
