# --- Étape 1 : build du bundle web ---
FROM node:22-alpine AS build
WORKDIR /app

# Les dépendances d'abord : cette couche est réutilisée tant que package.json ne change pas.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- Étape 2 : service statique ---
# Le jeu tourne entièrement dans le navigateur (sauvegarde en localStorage),
# il n'y a donc aucun serveur applicatif à faire tourner.
FROM nginx:1.27-alpine AS serve
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost/ >/dev/null || exit 1
