# Mesma imagem para API e worker: muda só o comando.
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/
RUN npm ci --workspace backend --include-workspace-root=false
COPY backend backend
RUN npm run build --workspace backend

FROM node:22-bookworm-slim
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg fonts-dejavu-core fontconfig ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY backend/package.json backend/
RUN npm ci --workspace backend --include-workspace-root=false --omit=dev
COPY --from=build /app/backend/dist backend/dist
WORKDIR /app/backend
USER node
EXPOSE 3333
CMD ["node", "dist/server.js"]
