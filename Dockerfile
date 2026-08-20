# Cloud Run image. Playwright's own base image is used because the reference executor drives a real
# Chromium — the browser and its system libraries are part of the runtime, not a dev-only extra.
FROM mcr.microsoft.com/playwright:v1.56.0-noble

WORKDIR /app
ENV NODE_ENV=production

# Dependencies first so a code change does not re-resolve the whole tree on every build.
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable && pnpm install --prod=false --no-frozen-lockfile

COPY tsconfig.json ./
COPY src ./src
RUN pnpm build

# Cloud Run provides PORT; the server reads it and falls back to 8080 locally.
ENV PORT=8080
EXPOSE 8080
CMD ["node", "dist/server.js"]
