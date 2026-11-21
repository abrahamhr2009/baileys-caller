/**
 * WhatsApp Auth Manager.
 *
 * Handles both QR code and 8-digit pairing code authentication
 * using Baileys multi-file auth state for session persistence.
 *
 * @author Kilo
 */
import { EventEmitter } from "node:events";
export type AuthStatus = "disconnected" | "waiting_qr" | "waiting_code" | "connected" | "error";
export declare class AuthManager extends EventEmitter {
    #private;
    constructor(authDir: string);
    get status(): AuthStatus;
    get phoneNumber(): string;
    get userJid(): string;
    get isConnected(): boolean;
    /** Connect using QR code method. */
    connectQr(): Promise<void>;
    /** Connect using 8-digit pairing code method. */
    connectCode(phoneNumber: string): Promise<void>;
    /** Disconnect from WhatsApp. */
    disconnect(): void;
    /** Get the Baileys socket for use by VoipClient. */
    get sock(): any;
    /** Check if there's an existing saved session. */
    hasSavedSession(): boolean;
    /** Reconnect using saved session. */
    reconnectSaved(): Promise<boolean>;
}
export default AuthManager;
