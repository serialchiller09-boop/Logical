# syntax=docker/dockerfile:1

# Logical needs Node 22.12+ because it uses node:sqlite.
FROM node:22-slim AS deps
WORKDIR /app

# Install dependencies first for better Docker layer caching.
COPY package.json package-lock.json ./
COPY server/package.json ./server/package.json
COPY web/package.json ./web/package.json
RUN npm ci

FROM deps AS build
WORKDIR /app
COPY . .
RUN npm run build
RUN npm test

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8787 \
    LOGICAL_DATA_DIR=/data

# Install runtime dependencies only. The web bundle is copied from the build stage.
COPY package.json package-lock.json ./
COPY server/package.json ./server/package.json
COPY web/package.json ./web/package.json
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/server ./server
COPY --from=build /app/web/dist ./web/dist

VOLUME ["/data"]
EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 8787) + '/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["npm", "start"]
