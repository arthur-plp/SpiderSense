# syntax=docker/dockerfile:1

ARG NODE_VERSION=22-alpine
# Must match the npm that wrote package-lock.json: npm 10 (bundled with
# node:22) rejects lockfiles from npm 11 as out of sync.
ARG NPM_VERSION=11.6.2

# --- Dependencies ---------------------------------------------------------
FROM node:${NODE_VERSION} AS deps
ARG NPM_VERSION
WORKDIR /app
RUN npm install -g npm@${NPM_VERSION}
COPY package.json package-lock.json ./
RUN npm ci

# --- Build ----------------------------------------------------------------
FROM node:${NODE_VERSION} AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --- Runtime --------------------------------------------------------------
FROM node:${NODE_VERSION} AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# `output: "standalone"` bundles only the server files and the node_modules
# it needs; public/ and .next/static must be copied next to it.
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

USER node
EXPOSE 3000

CMD ["node", "server.js"]
