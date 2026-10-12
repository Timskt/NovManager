# ==============================================================================
# 墨枢 · InkVerse (By Timskt) — Web Workstation Dockerfile
# Multi-stage build: Node 20 + pnpm -> Nginx Alpine Production Server
# ==============================================================================

FROM node:20-alpine AS builder

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install

COPY . .
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN pnpm build

FROM nginx:alpine AS runtime

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -q -O - http://127.0.0.1:80/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
