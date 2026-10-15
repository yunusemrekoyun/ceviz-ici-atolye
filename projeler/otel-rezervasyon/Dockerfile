FROM node:22-bookworm-slim AS deps

WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS builder

WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/kutahya_garden?schema=public"
ENV DIRECT_URL="postgresql://postgres:postgres@localhost:5432/kutahya_garden?schema=public"
ENV JWT_ACCESS_SECRET="build-time-placeholder-not-used-at-runtime"

RUN npm run build

FROM node:22-bookworm-slim AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/node_modules/sharp ./node_modules/sharp
COPY --from=builder --chown=node:node /app/node_modules/@img ./node_modules/@img

# Create writable uploads directory for media storage
RUN mkdir -p public/uploads/originals public/uploads/thumb public/uploads/medium public/uploads/large \
  && chown -R node:node public/uploads

USER node
EXPOSE 3000

CMD ["node", "server.js"]
