/**
 * Call Manager.
 *
 * Wraps VoipClient to manage outbound calls, track call state,
 * and emit events for the web panel.
 *
 * @author Kilo
 */
import { EventEmitter } from "node:events";
import { resolve } from "node:path";
import { VoipClient } from "./index.mjs";
export type CallRecord = {
  id: string;
  phoneNumber: string;
  audioSource: string;
  status: "pending" | "ringing" | "connected" | "ended" | "error";
  reason?: string;
  startedAt: number;
  endedAt?: number;
  durationMs?: number;
};

export class CallManager extends EventEmitter {
  #client: VoipClient | null = null;
  #auth: any;
  #activeCallId: string | null = null;
  #calls = new Map<string, CallRecord>();
  #maxCallHistory = 100;

  constructor(auth: any) {
    super();
    this.#auth = auth;
  }

  get activeCallId(): string | null { return this.#activeCallId; }
  get calls(): CallRecord[] { return [...this.#calls.values()].reverse(); }
  get isCalling(): boolean { return this.#activeCallId !== null; }

  /** Initialize the VoipClient with an existing Baileys socket. */
  initialize(client: VoipClient | null): void {
    this.#client = client;
  }

  /** Place an outbound call. */
  async call(phoneNumber: string, opts: { audioSource?: string; durationMs?: number } = {}): Promise<string> {
    if (!this.#client) throw new Error("VoipClient not initialized");
    if (!this.#auth.isConnected) throw new Error("WhatsApp not connected");
    if (this.#activeCallId) throw new Error("A call is already active");

    const targetNumber = phoneNumber.replace(/\D/g, "");
    const callId = `call_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const record: CallRecord = {
      id: callId,
      phoneNumber: targetNumber,
      audioSource: opts.audioSource ?? "silence",
      status: "pending",
      startedAt: Date.now(),
    };
    this.#calls.set(callId, record);
    this.#trimHistory();

    const call = await this.#client.call(targetNumber, {
      audioSource: record.audioSource,
      durationMs: opts.durationMs ?? 120_000,
    });

    this.#activeCallId = callId;
    record.status = "ringing";
    this.emit("callStarted", record);
    this.emit("callRinging", callId);

    call.on("ringing", () => {
      record.status = "ringing";
      this.emit("callRinging", callId);
    });

    call.on("connected", () => {
      record.status = "connected";
      this.emit("callConnected", callId);
    });

    call.on("ended", (reason: string) => {
      record.status = "ended";
      record.reason = reason;
      record.endedAt = Date.now();
      record.durationMs = record.endedAt - record.startedAt;
      this.#activeCallId = null;
      this.emit("callEnded", record);
    });

    call.on("error", (err: Error) => {
      record.status = "error";
      record.reason = err.message;
      record.endedAt = Date.now();
      this.#activeCallId = null;
      this.emit("callError", callId, err.message);
    });

    call.on("audio", (_pcm: Float32Array) => {
      this.emit("audioData", callId, _pcm.length);
    });

    return callId;
  }

  /** Hang up the active call. */
  hangup(): void {
    if (this.#client && this.#activeCallId) {
      const record = this.#calls.get(this.#activeCallId);
      if (record && record.status !== "ended") {
        record.status = "ended";
        record.reason = "hangup";
        record.endedAt = Date.now();
        record.durationMs = record.endedAt - record.startedAt;
        this.#activeCallId = null;
        this.emit("callEnded", record);
      }
    }
  }

  /** Get call history. */
  getHistory(): CallRecord[] {
    return this.calls;
  }

  #trimHistory(): void {
    if (this.#calls.size > this.#maxCallHistory) {
      const entries = [...this.#calls.entries()].sort((a, b) => a[1].startedAt - b[1].startedAt);
      const toRemove = entries.slice(0, this.#calls.size - this.#maxCallHistory);
      for (const [id] of toRemove) this.#calls.delete(id);
    }
  }
}

export default CallManager;
