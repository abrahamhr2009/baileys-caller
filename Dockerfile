# WhatsApp Caller - Dockerfile
# Railway-compatible multi-stage build

FROM node:20-alpine AS base

# Install system dependencies
RUN apk add --no-cache ffmpeg espeak-ng espeak

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies (incluyendo dev para build de TypeScript)
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Create directories for auth and TTS cache
RUN mkdir -p auth tts-cache

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start the application
CMD ["npm", "start"]
