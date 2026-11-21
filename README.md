# Baileys Caller

Sistema de llamadas de WhatsApp desde un panel web moderno, construido con Node.js, TypeScript, Baileys y WhatsApp Web VoIP WASM.

[![GitHub](https://img.shields.io/badge/GitHub-abrahamhr2009/baileys--caller-blue?logo=github)](https://github.com/abrahamhr2009/baileys-caller)
[![Panel Web](https://img.shields.io/badge/Panel-Web-green?logo=globes)](https://abrahamhr2009.github.io/baileys-caller/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-green?logo=node.js)](https://nodejs.org/)
[![Railway](https://img.shields.io/badge/Despliegue-Railway-blue?logo=railway)](https://railway.app/)

---

## Descripción

**Baileys Caller** permite realizar llamadas de voz salientes de WhatsApp directamente desde un panel web. Utiliza [Baileys](https://github.com/WhiskeySockets/Baileys) para autenticación y señalización, y el stack oficial de VoIP WASM de WhatsApp Web para el manejo de llamadas y audio.

Soporta dos métodos de autenticación independientes:
1. **Código QR** — escanea con WhatsApp > Dispositivos vinculados
2. **Código de 8 dígitos** — vinculación mediante código generado

---

## Características

| Categoría | Característica |
|-----------|----------------|
| 🔐 **Autenticación** | QR code y código de 8 dígitos |
| 📞 **Llamadas** | Salientes individuales, colgar, detectar estado |
| 🔊 **Audio** | MP3, WAV, silencio, TTS (texto a voz) |
| 🌐 **Panel web** | Moderno, adaptable a móvil y escritorio |
| ⏱️ **Tiempo real** | Consola de eventos vía Socket.IO |
| 💾 **Persistencia** | Sesiones guardadas en disco |
| 🔄 **Reconexión** | Automática ante caída de conexión |
| 🚂 **Railway** | Dockerfile listo para despliegue |
| 🛡️ **Seguridad** | Sesiones no expuestas en GitHub |

---

## Requisitos

- **Node.js** ≥ 20 (probado con v24)
- **npm** (viene con Node.js)
- **FFmpeg** (para decodificar audio MP3/WAV)
- **espeak-ng** (para TTS - texto a voz)
- Una cuenta de WhatsApp activa para vincular

---

## Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/abrahamhr2009/baileys-caller.git
cd baileys-caller

# 2. Instalar dependencias del sistema (Debian/Ubuntu)
sudo apt-get update
sudo apt-get install -y ffmpeg espeak-ng espeak

# 3. Instalar dependencias de Node.js
npm install

# 4. Compilar TypeScript
npm run build

# 5. Configurar variables de entorno
cp .env.example .env
# Editar .env según sea necesario

# 6. Iniciar el servidor
npm start
# o en modo desarrollo:
npm run dev
```

El servidor estará disponible en: `http://localhost:3000`

---

## Configuración

### Variables de entorno (`.env`)

| Variable | Descripción | Valor por defecto |
|----------|-------------|-------------------|
| `PORT` | Puerto del servidor | `3000` |
| `CORS_ORIGIN` | Origen CORS permitido | `*` |
| `AUTH_DIR` | Directorio de sesiones Baileys | `./auth` |
| `TTS_DIR` | Directorio de caché TTS | `./tts-cache` |

> **⚠️ Seguridad:** El directorio `auth/` contiene las claves de sesión de Baileys. **Nunca lo subas a GitHub.** Está incluido en `.gitignore`.

---

## Conexión mediante QR

1. Abre el panel web en `http://localhost:3000`
2. Haz clic en **"Generar QR"** en la sección de WhatsApp
3. Escanea el código QR con WhatsApp > Ajustes > Dispositivos vinculados > Vincular dispositivo
4. El panel mostrará el estado "Conectado" una vez vinculado

El QR se regenera automáticamente si expira.

---

## Conexión mediante código de 8 dígitos

1. Introduce tu número de teléfono con código de país (ej. `+52 1 234 567 8900`)
2. Haz clic en **"Solicitar código"**
3. Se generará un código de 8 dígitos
4. En WhatsApp: Dispositivos vinculados > Vincular dispositivo > introducir código
5. El panel detectará la vinculación automáticamente

---

## Cómo realizar llamadas

1. Asegúrate de que WhatsApp esté conectado (estado verde)
2. Introduce el número de destino (con código de país)
3. Selecciona el audio:
   - **Silencio** — llamada sin audio de salida
   - **TTS** — reproduce un mensaje de texto a voz
4. Si usas TTS, selecciona voz y escribe el mensaje
5. Haz clic en **📞 LLAMAR**
6. Usa **📴 COLGAR** para terminar

### Estados de llamada
- `pending` — Llamada iniciada
- `ringing` — Dispositivo remoto sonando
- `connected` — Llamada respondida
- `ended` — Llamada finalizada
- `error` — Error durante la llamada

---

## Configuración TTS

El sistema usa **espeak-ng** instalado localmente (no requiere servicios externos).

Voces disponibles:
- `es` — Español (España)
- `es-419` — Español (Latinoamérica)
- `en` — English
- `en-us` — English (US)

Endpoint para generar audio:
```bash
POST /tts/generate
Body: { "text": "Hola mundo", "voice": "es-419" }
```

---

## Reproducción de audio

Durante una llamada activa, el audio se envía a través del canal RTP de WhatsApp:

- **MP3/WAV:** Proporciona la ruta al archivo en `audioSource`
- **Silencio:** Usa `"silence"` para llamada sin audio
- **TTS:** Genera el audio y lo reproduce durante la llamada

---

## Uso del panel web

El panel incluye:

- **Estado de WhatsApp:** conectado/desconectado con indicador visual
- **Métodos de conexión:** QR o código de 8 dígitos
- **Número vinculado:** se muestra tras la autenticación
- **Campo de destino:** número a llamar
- **Selector de audio:** silencio o TTS
- **Selector de idioma/voz:** para TTS
- **Campo de mensaje TTS:** texto a reproducir
- **Botón LLAMAR:** inicia la llamada saliente
- **Botón COLGAR:** termina la llamada activa
- **Consola de eventos:** tiempo real con Socket.IO
- **Registro de llamadas:** historial con estado y duración
- **Botón reiniciar conexión:** reconectar sesión guardada

---

## Despliegue en Railway

### Opción 1: Despliegue automático desde GitHub

1. Conecta tu repositorio de GitHub a Railway
2. Railway detectará el `Dockerfile` y `railway.json`
3. Configura las variables de entorno en Railway:
   - `PORT=3000`
   - `AUTH_DIR=/app/auth`
   - `TTS_DIR=/app/tts-cache`
   - `CORS_ORIGIN=*` (o tu dominio específico)
4. Despliega

### Opción 2: Docker manual

```bash
docker build -t baileys-caller .
docker run -p 3000:3000 \
  -v $(pwd)/auth:/app/auth \
  -v $(pwd)/tts-cache:/app/tts-cache \
  -e PORT=3000 \
  -e AUTH_DIR=/app/auth \
  -e TTS_DIR=/app/tts-cache \
  baileys-caller
```

### Health check

El endpoint `/health` devuelve el estado del servicio:
```json
{
  "status": "ok",
  "whatsapp": "disconnected",
  "connected": false,
  "timestamp": "2026-11-21T..."
}
```

---

## API REST

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/health` | Estado del servidor |
| `GET` | `/auth/status` | Estado de conexión WhatsApp |
| `POST` | `/auth/connect/qr` | Iniciar conexión por QR |
| `POST` | `/auth/connect/code` | Conectar por código (`{phoneNumber}`) |
| `POST` | `/auth/disconnect` | Desconectar WhatsApp |
| `POST` | `/auth/reconnect` | Reconectar sesión guardada |
| `POST` | `/call` | Realizar llamada (`{phoneNumber, audioSource, durationMs}`) |
| `POST` | `/call/hangup` | Colgar llamada activa |
| `GET` | `/call/history` | Historial de llamadas |
| `GET` | `/tts/voices` | Voces TTS disponibles |
| `POST` | `/tts/generate` | Generar audio TTS (`{text, voice}`) |
| `GET` | `/tts/file/:fileName` | Descargar archivo de audio |

---

## Solución de errores

| Problema | Solución |
|----------|----------|
| ffmpeg no encontrado | `sudo apt-get install -y ffmpeg` |
| espeak-ng no encontrado | `sudo apt-get install -y espeak-ng espeak` |
| Puerto 3000 en uso | Cambia `PORT` en `.env` |
| WhatsApp no conecta | Escanea QR o introduce código de 8 dígitos |
| Sesión perdida | El directorio `auth/` persiste entre reinicios |
| Error 515 | Reconexión automática tras 3 segundos |

---

## Limitaciones conocidas

1. **Solo llamadas salientes individuales** — no hay soporte para llamadas entrantes, grupales ni videollamadas
2. **TTS local con espeak-ng** — calidad de voz básica, sin servicios externos
3. **Vinculación real requerida** — se necesita un teléfono con WhatsApp para escanear QR o usar código de 8 dígitos
4. **Audio solo en canal RTP** — no se reproduce localmente en el servidor
5. **No hay autenticación en el panel** — si se expone públicamente, añade middleware de auth

---

## Enlaces

- 📦 **Repositorio:** https://github.com/abrahamhr2009/baileys-caller
- 🌐 **Página informativa:** https://abrahamhr2009.github.io/baileys-caller/
- 📖 **Documentación original:** [README original](https://github.com/SheIITear/baileys-caller)
- 🚂 **Railway:** https://railway.app/

---

## Licencia

MIT © ShellTear — Mejorado por Kilo Dev
