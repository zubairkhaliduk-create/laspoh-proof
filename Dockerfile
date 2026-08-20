# Cloud Run image. Playwright's own base image is used because the reference executor drives a real
# Chromium — the browser and its system libraries are part of the runtime, not a dev-only extra.
# The tag MUST match playwright-core in package.json: the image ships a specific Chromium build,
# and a mismatched client refuses to launch it.
FROM mcr.microsoft.com/playwright:v1.62.1-noble

WORKDIR /app
ENV NODE_ENV=production

# Dependencies first so a code change does not re-resolve the whole tree on every build.
# pnpm-workspace.yaml carries the build-script approvals; without it the install refuses to run.
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
RUN corepack enable && pnpm install --prod=false --no-frozen-lockfile

COPY tsconfig.json ./
COPY src ./src
RUN pnpm build

# Cloud Run provides PORT; the server reads it and falls back to 8080 locally.
ENV PORT=8080
EXPOSE 8080
CMD ["node", "dist/server.js"]
