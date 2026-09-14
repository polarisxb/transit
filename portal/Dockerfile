FROM node:22-bookworm-slim AS build
WORKDIR /build
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm@10 && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# 只放静态文件；compose 里的 portal-assets 用 /bin/sh + cp 把它拷进 Caddy 的卷
FROM busybox:stable
COPY --from=build /build/dist /opt/portal
