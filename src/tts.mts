/**
 * TTS Manager.
 *
 * Uses espeak-ng (system-installed) to generate WAV audio from text.
 * Supports Spanish (Spain), Spanish (Latin America), and English voices.
 *
 * @author Kilo
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export type TtsVoice = {
  id: string;
  name: string;
  lang: string;
};

export const DEFAULT_TTS_DIR = resolve(process.cwd(), "tts-cache");

const AVAILABLE_VOICES: TtsVoice[] = [
  { id: "es", name: "Español (España)", lang: "es" },
  { id: "es-419", name: "Español (Latinoamérica)", lang: "es-419" },
  { id: "en", name: "English", lang: "en" },
  { id: "en-us", name: "English (US)", lang: "en-us" },
];

export class TtsManager {
  #cacheDir: string;
  #defaultVoice: string;

  constructor(cacheDir: string = DEFAULT_TTS_DIR, defaultVoice: string = "es") {
    this.#cacheDir = cacheDir;
    this.#defaultVoice = defaultVoice;
    if (!existsSync(this.#cacheDir)) {
      mkdirSync(this.#cacheDir, { recursive: true });
    }
  }

  get voices(): TtsVoice[] { return AVAILABLE_VOICES; }
  get defaultVoice(): string { return this.#defaultVoice; }

  /** Generate a WAV file from text and return its path. */
  generate(text: string, voiceId?: string): string {
    const voice = AVAILABLE_VOICES.find((v) => v.id === voiceId) ??
      AVAILABLE_VOICES.find((v) => v.id === this.#defaultVoice) ??
      AVAILABLE_VOICES[0];

    const safeName = text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .slice(0, 60);
    const hash = Buffer.from(text + voice.id).toString("hex").slice(0, 8);
    const filename = `${safeName}_${hash}.wav`;
    const filePath = resolve(this.#cacheDir, filename);

    if (existsSync(filePath)) return filePath;

    const lang = voice.lang;
    const speed = "150";
    const pitch = "50";

    try {
      execSync(`espeak-ng -v ${lang} -s ${speed} -p ${pitch} -w "${filePath}" "${text}"`, {
        stdio: "pipe",
        timeout: 30000,
      });
    } catch (err: any) {
      throw new Error(`TTS generation failed: ${err?.message ?? String(err)}`);
    }

    return filePath;
  }

  /** List available voices. */
  listVoices(): TtsVoice[] {
    return [...AVAILABLE_VOICES];
  }
}

export default TtsManager;
