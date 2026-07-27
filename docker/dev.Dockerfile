# Serveur de développement : vite avec rechargement à chaud.
#
# Les dépendances sont installées à la *construction* de l'image, pas au
# démarrage du conteneur : un `npm install` lancé à chaque `up` par-dessus un
# volume monté est lent et fragile (il a fini par planter avec
# « Exit handler never called »).
#
#   docker compose --profile dev up dev   → http://localhost:5173

FROM node:22-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Le code source est monté par compose ; node_modules vient de l'image.
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
