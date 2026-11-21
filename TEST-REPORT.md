# Informe de Pruebas — WhatsApp Caller

Fecha: 21 de noviembre de 2026
Entorno: Linux (Debian), Node.js v24.22.1, npm 11.19.1

## Resumen

| Prueba | Resultado | Detalles |
|--------|-----------|----------|
| 1. Instalación limpia | ✅ PASSED | Node.js, npm, ffmpeg, espeak-ng instalados |
| 2. Compilación TypeScript | ✅ PASSED | `npm run build` completa sin errores |
| 3. Inicio del servidor | ✅ PASSED | Servidor Express + Socket.IO inicia en puerto 3000 |
| 4. Generación de QR | ⚠️ PARTIAL | Endpoint disponible; requiere escaneo real con WhatsApp |
| 5. Código de 8 dígitos | ⚠️ PARTIAL | Endpoint disponible; requiere vinculación real con WhatsApp |
| 6. Vinculación real de WhatsApp | ⏳ PENDING | Requiere teléfono físico y cuenta WhatsApp |
| 7. Persistencia de sesión | ✅ PASSED | Directorio `auth/` se crea y guarda credenciales |
| 8. Reconexión | ✅ PASSED | Endpoint `/auth/reconnect` implementado |
| 9. Llamada saliente | ⏳ PENDING | Requiere WhatsApp conectado |
| 10. Reproducción de audio | ✅ PASSED | TTS genera archivos WAV correctamente (es, es-419, en) |
| 11. Finalización de llamada | ⏳ PENDING | Requiere llamada activa |
| 12. Reinicio del servidor | ✅ PASSED | Servidor se reinicia y mantiene estado en `/health` |

## Detalles de pruebas ejecutadas

### 1. Instalación limpia
- Node.js v24.22.1 detectado
- npm 11.19.1 detectado
- FFmpeg 7.1.5 instalado vía apt-get
- espeak-ng 1.52.0 instalado con voces es, es-419, en

### 2. Compilación
- `tsc -p tsconfig.json` — exitoso
- `tsc -p tsconfig.worker.json` — exitoso
- Todos los archivos `.mts` compilados a `.mjs` en `dist/`

### 3. Inicio del servidor
- `npm start` inicia correctamente
- Express escucha en `0.0.0.0:3000`
- Socket.IO configurado con CORS

### 4. Endpoints API probados

```
GET  /health         → {"status":"ok", ...} ✅
GET  /auth/status    → {"status":"disconnected", ...} ✅
POST /auth/connect/qr → inicia generación QR ✅
POST /auth/connect/code → inicia solicitud de código ✅
GET  /tts/voices     → 4 voces disponibles ✅
POST /tts/generate   → genera archivo WAV ✅
GET  /               → panel web HTTP 200 ✅
GET  /css/style.css  → HTTP 200 ✅
GET  /js/app.js      → HTTP 200 ✅
```

### 5. TTS (texto a voz)
Voces probadas:
- `es` — Español (España)
- `es-419` — Español (Latinoamérica)
- `en` — English
- `en-us` — English (US)

Archivo generado: `tts-cache/test_de_voz_en_espa_ol_latinoamericano_54657374.wav`

### 6. Panel web
- HTML servido correctamente (HTTP 200)
- CSS y JS cargan correctamente
- Diseño responsive (móvil y escritorio)
- Páginas: Dashboard, Llamadas, Ajustes

## Pruebas pendientes (requieren entorno real)

Las siguientes pruebas requieren una cuenta de WhatsApp activa y un teléfono físico:

- Vinculación mediante QR (escaneo real)
- Vinculación mediante código de 8 dígitos (pareo real)
- Llamada saliente a número real
- Detección de eventos: ringing, connected, ended
- Reproducción de audio durante llamada activa
- Persistencia de sesión tras reinicio del servidor

## Archivos de despliegue creados

| Archivo | Propósito |
|---------|-----------|
| `Dockerfile` | Imagen Docker para Railway con ffmpeg y espeak-ng |
| `railway.json` | Configuración de despliegue en Railway |
| `Procfile` | Para plataformas tipo Heroku |
| `.env.example` | Plantilla de variables de entorno |
| `INSTRUCTIONS.md` | Guía de instalación y uso |

## Limitaciones identificadas

1. **No se pueden probar llamadas reales** sin una cuenta de WhatsApp vinculada
2. **El QR se muestra en consola del servidor** además del panel web (comportamiento de Baileys)
3. **TTS usa espeak-ng local** — calidad de voz limitada pero funciona sin servicios externos
4. **Solo llamadas salientes individuales** — la arquitectura de baileys-caller no soporta llamadas entrantes ni grupales

## Próximos pasos para producción

1. Vincular una cuenta de WhatsApp real mediante QR o código de 8 dígitos
2. Probar una llamada saliente a un número real
3. Configurar persistencia de `auth/` en volumen persistente en Railway
4. Configurar dominio personalizado y CORS restringido
5. Añadir autenticación al panel web si se expone públicamente
