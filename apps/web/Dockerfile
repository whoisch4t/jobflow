# Build from the repository root: docker build -f apps/web/Dockerfile .
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN npm ci --workspace @jobflow/web

FROM deps AS build
# Rewrites are fixed at build time, so the API address must be known here.
ARG API_URL=http://api:4100
ENV API_URL=$API_URL NEXT_TELEMETRY_DISABLED=1 NEXT_OUTPUT=standalone
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN npm run build -w @jobflow/web

FROM node:24-alpine AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3100 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
USER node
EXPOSE 3100
CMD ["node", "apps/web/server.js"]
