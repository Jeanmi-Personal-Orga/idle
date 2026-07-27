# --- Étape 1 : build TypeScript ---
FROM node:22-alpine AS build
WORKDIR /app

COPY server/package.json server/package-lock.json* ./
RUN npm install

COPY server/ .
RUN npm run build

# --- Étape 2 : runtime minimal ---
# Seuls dist/ et les dépendances de production survivent : pas de compilateur
# ni de sources TypeScript dans l'image finale.
FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production

COPY server/package.json server/package-lock.json* ./
RUN npm install --omit=dev

COPY --from=build /app/dist ./dist

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:3001/health >/dev/null || exit 1

CMD ["node", "dist/index.js"]
