/**
 * Call Manager.
 *
 * Wraps VoipClient to manage outbound calls, track call state,
 * and emit events for the web panel.
 *
 * @author Kilo
 */
import { EventEmitter } from "node:events";
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
export declare class CallManager extends EventEmitter {
    #private;
    constructor(auth: any);
    get activeCallId(): string | null;
    get calls(): CallRecord[];
    get isCalling(): boolean;
    /** Initialize the VoipClient with an existing Baileys socket. */
    initialize(client: VoipClient | null): void;
    /** Place an outbound call. */
    call(phoneNumber: string, opts?: {
        audioSource?: string;
        durationMs?: number;
    }): Promise<string>;
    /** Hang up the active call. */
    hangup(): void;
    /** Get call history. */
    getHistory(): CallRecord[];
}
export default CallManager;
