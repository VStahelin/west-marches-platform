FROM node:20-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.14.4 --activate

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/backend/package.json ./apps/backend/package.json

RUN pnpm install --filter backend --prod --frozen-lockfile

COPY apps/backend/src ./apps/backend/src

WORKDIR /app/apps/backend

EXPOSE 3001

CMD ["node", "src/index.js"]
