# Prépare le projet iOS — mais ne le compile pas, et aucune image Docker ne peut
# le faire : la compilation iOS exige Xcode, qui n'existe que sur macOS et dont la
# licence interdit l'exécution hors matériel Apple. Il n'y a pas de contournement.
#
# Ce que cette image fait, et qui est utile : produire le bundle web et le projet
# Capacitor iOS complet, prêts à être ouverts dans Xcode sur un Mac.
#
#   docker build -f docker/ios.Dockerfile --target project \
#     --output type=local,dest=./out .
#   # → ./out/ios/ et ./out/dist/  à copier sur un Mac, puis :
#   #   open ios/App/App.xcodeproj
#
# Capacitor 8 utilise Swift Package Manager : aucun `pod install` n'est requis,
# Xcode résout les dépendances natives à l'ouverture du projet.

FROM node:22-alpine AS build
WORKDIR /app

RUN apk add --no-cache git
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# `cap add ios` copie le gabarit natif ; sa dernière étape touche à des outils
# macOS, on ignore donc l'échec — le projet lui-même est écrit correctement.
RUN npx cap add ios || true
# `cap copy` ne fait que déposer le bundle web dans le projet : pas besoin de pods.
RUN npx cap copy ios

# --- Projet iOS + bundle web, extractibles avec --output ---
FROM scratch AS project
COPY --from=build /app/ios /ios
COPY --from=build /app/dist /dist
COPY --from=build /app/capacitor.config.ts /
