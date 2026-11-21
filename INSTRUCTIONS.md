# Instrucciones de Ejecución — WhatsApp Caller

## Requisitos previos

- Node.js >= 20 (probado con v24.22.1)
- npm
- FFmpeg (para decodificar audio MP3/WAV)
- espeak-ng (para TTS - texto a voz)
- Una cuenta de WhatsApp activa para vincular

## Instalación rápida

```bash
# 1. Clonar el repositorio
git clone https://github.com/SheIITear/baileys-caller.git
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

## Uso del panel web

1. Abre `http://localhost:3000` en tu navegador
2. **Conectar WhatsApp:**
   - **Opción QR:** Haz clic en "Generar QR", escanea con WhatsApp > Ajustes > Dispositivos vinculados
   - **Opción Código:** Introduce tu número de teléfono, solicita el código de 8 dígitos, introdúcelo en WhatsApp > Dispositivos vinculados > Vincular dispositivo
3. **Realizar una llamada:**
   - Introduce el número de destino (con código de país)
   - Selecciona el audio (Silencio o TTS)
   - Si usas TTS, selecciona voz y escribe el mensaje
   - Haz clic en LLAMAR
   - Usa COLGAR para terminar

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

## Estructura del proyecto

```
baileys-caller/
├── src/
│   ├── index.mts          # VoipClient (SDK principal)
│   ├── wasm-engine.mts    # Motor WASM VoIP
│   ├── audio-feeder.mts   # Alimentador de audio (ffmpeg)
│   ├── relay-transport.mts # Transporte WebRTC
│   ├── signaling.mts      # Puente de señalización Baileys
│   ├── types.mts          # Tipos compartidos
│   ├── worker-bootstrap.mts # Bootstrap de worker_threads
│   ├── auth-manager.mts   # Gestor de autenticación QR/código
│   ├── call-manager.mts   # Gestor de llamadas
│   ├── tts.mts            # Gestor TTS (espeak-ng)
│   ├── server.mts         # Servidor Express + Socket.IO
│   ├── qrcode.d.ts        # Declaración de tipos qrcode
│   └── worker-bootstrap.mts
├── dist/                  # Código compilado
├── public/
│   ├── index.html         # Panel web
│   ├── css/style.css      # Estilos
│   └── js/app.js          # Lógica del frontend
├── assets/wasm/           # Recursos WASM de WhatsApp
├── auth/                  # Sesiones de Baileys (persistencia)
├── tts-cache/             # Archivos de audio TTS generados
├── Dockerfile             # Imagen Docker para Railway
├── railway.json           # Configuración de Railway
├── Procfile               # Para plataformas tipo Heroku
├── .env.example           # Variables de entorno
├── package.json           # Dependencias y scripts
└── README.md              # Documentación original
```

## Variables de entorno

| Variable | Descripción | Valor por defecto |
|----------|-------------|-------------------|
| `PORT` | Puerto del servidor | `3000` |
| `CORS_ORIGIN` | Origen CORS permitido | `*` |
| `AUTH_DIR` | Directorio de sesiones Baileys | `./auth` |
| `TTS_DIR` | Directorio de caché TTS | `./tts-cache` |

## API REST

### Autenticación
- `GET /health` — Estado del servidor
- `GET /auth/status` — Estado de conexión WhatsApp
- `POST /auth/connect/qr` — Iniciar conexión por QR
- `POST /auth/connect/code` — Iniciar conexión por código (body: `{phoneNumber}`)
- `POST /auth/disconnect` — Desconectar WhatsApp
- `POST /auth/reconnect` — Reconectar usando sesión guardada

### Llamadas
- `POST /call` — Realizar llamada (body: `{phoneNumber, audioSource, durationMs}`)
- `POST /call/hangup` — Colgar llamada activa
- `GET /call/history` — Historial de llamadas

### TTS
- `GET /tts/voices` — Voces disponibles
- `POST /tts/generate` — Generar audio TTS (body: `{text, voice}`)
- `GET /tts/file/:fileName` — Descargar archivo de audio generado

### WebSocket (Socket.IO)

Eventos del servidor al cliente:
- `auth:status` — Cambio de estado de WhatsApp
- `auth:qr` — Código QR generado (data URL)
- `auth:code` — Código de 8 dígitos generado
- `auth:connected` — WhatsApp conectado
- `auth:disconnected` — WhatsApp desconectado
- `auth:error` — Error de autenticación
- `call:started` — Llamada iniciada
- `call:ringing` — Dispositivo remoto sonando
- `call:connected` — Llamada respondida
- `call:ended` — Llamada finalizada
- `call:error` — Error de llamada
- `call:audio` — Datos de audio recibidos
- `tts:voices` — Voces TTS disponibles
- `tts:generated` — Audio TTS generado
- `tts:error` — Error TTS

Eventos del cliente al servidor:
- `auth:connect:qr` — Conectar por QR
- `auth:connect:code` — Conectar por código `{phoneNumber}`
- `auth:disconnect` — Desconectar
- `auth:reconnect` — Reconectar sesión guardada
- `call:start` — Iniciar llamada `{phoneNumber, audioSource, durationMs}`
- `call:hangup` — Colgar
- `tts:generate` — Generar TTS `{text, voice}`

## Limitaciones conocidas

1. **Llamadas solo salientes:** El motor solo soporta llamadas salientes individuales. No hay soporte para llamadas entrantes, grupales o videollamadas.
2. **QR por consola:** El primer escaneo del QR muestra el código en la consola del servidor además del panel web.
3. **Código de 8 dígitos:** Depende de la implementación de pareo de Baileys; el código se genera durante el proceso de vinculación.
4. **TTS local:** Usa espeak-ng instalado en el sistema. No requiere servicios externos.
5. **Audio en llamada:** El audio se reproduce a través del canal RTP de WhatsApp; no se escucha localmente en el servidor.

## Seguridad

- El directorio `auth/` contiene las claves de sesión de Baileys. **No lo subas a GitHub.**
- El `.env` no debe contener secretos de producción reales.
- Las sesiones se persisten en disco para sobrevivir reinicios del servidor.
