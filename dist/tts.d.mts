export type TtsVoice = {
    id: string;
    name: string;
    lang: string;
};
export declare const DEFAULT_TTS_DIR: string;
export declare class TtsManager {
    #private;
    constructor(cacheDir?: string, defaultVoice?: string);
    get voices(): TtsVoice[];
    get defaultVoice(): string;
    /** Generate a WAV file from text and return its path. */
    generate(text: string, voiceId?: string): string;
    /** List available voices. */
    listVoices(): TtsVoice[];
}
export default TtsManager;
