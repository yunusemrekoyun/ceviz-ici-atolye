# Çok aşamalı imaj: bağımlılıklar -> build -> yalın çalışma zamanı + worker
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Client bundle'a gömülür — compose build arg'ı olarak gelir
ARG NEXT_PUBLIC_BETTER_AUTH_URL
ENV NEXT_PUBLIC_BETTER_AUTH_URL=$NEXT_PUBLIC_BETTER_AUTH_URL
# deps aşamasında şema olmadığından Prisma client üretilmemiş (stub) kalıyor;
# şema burada mevcut — client'ı build'den önce üret.
RUN npx prisma generate
RUN STANDALONE=1 npm run build

# BullMQ e-posta + medya worker'ı; aynı zamanda migrate/seed "toolbox"u
# (standalone runner'da npm/npx yok — prisma CLI ve tsx burada yaşar).
FROM node:22-alpine AS worker
WORKDIR /app
# Video poster kareleri için ffmpeg (görsel varyantları sharp ile üretilir)
RUN apk add --no-cache ffmpeg
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY prisma ./prisma
COPY src ./src
RUN npx prisma generate
# uploads volume'u ilk mount'ta bu sahipliği devralır — node yazabilmeli
RUN mkdir -p /app/uploads && chown node:node /app/uploads
USER node
CMD ["npx", "tsx", "src/worker/index.ts"]

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
RUN mkdir -p /app/uploads && chown node:node /app/uploads
USER node
EXPOSE 3000
CMD ["node", "server.js"]
