# API d'authentification

Petit service Express + PostgreSQL, indépendant du jeu (qui reste 100 % côté
navigateur). Il gère uniquement les comptes : inscription, connexion, profil.
Rien dans le front n'appelle encore cette API — c'est une brique d'infra à
part, pas encore branchée.

## Lancer en local

Avec Docker (le plus simple, base + API ensemble) :

```bash
docker compose up -d db api
```

Sans Docker, contre un Postgres local :

```bash
cd server
npm install
cp .env.example .env   # puis renseigner DATABASE_URL et JWT_SECRET
npm run dev             # http://localhost:3001, rechargement à chaud
```

`npm run build` compile en `dist/`, `npm run start` lance la version compilée.

Le schéma (`src/schema.sql`) s'applique automatiquement au démarrage
(`CREATE TABLE IF NOT EXISTS` — pas de framework de migration, une seule table).

## Variables d'environnement

| Variable | Rôle |
| --- | --- |
| `DATABASE_URL` | URL de connexion PostgreSQL |
| `JWT_SECRET` | Secret de signature des tokens — obligatoire, pas de valeur par défaut en dur |
| `PORT` | Port d'écoute HTTP (3001 par défaut) |

## Endpoints

### `POST /api/auth/register`

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"brume42","email":"joueur@example.com","password":"motdepasse123"}'
```

```json
{ "token": "eyJ...", "user": { "id": 1, "username": "brume42", "email": "joueur@example.com" } }
```

`409` si le nom d'utilisateur ou l'email est déjà pris, `400` si la validation échoue.

### `POST /api/auth/login`

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"joueur@example.com","password":"motdepasse123"}'
```

```json
{ "token": "eyJ...", "user": { "id": 1, "username": "brume42", "email": "joueur@example.com" } }
```

`401 "Identifiants invalides."` que l'email soit inconnu ou le mot de passe faux
(le message ne distingue pas les deux cas, exprès).

### `GET /api/auth/me`

```bash
curl http://localhost:3001/api/auth/me -H "Authorization: Bearer $TOKEN"
```

```json
{ "user": { "id": 1, "username": "brume42", "email": "joueur@example.com" } }
```

`401` sans token valide, `404` si le compte a été supprimé depuis.

### `GET /api/save`

```bash
curl http://localhost:3001/api/save -H "Authorization: Bearer $TOKEN"
```

```json
{ "data": null }
```

`{ "data": <objet JSON> }` si une sauvegarde existe déjà pour ce compte,
`{ "data": null }` sinon (compte neuf). `401` sans token valide.

### `PUT /api/save`

```bash
curl -X PUT http://localhost:3001/api/save \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"data":{"version":8}}'
```

```json
{ "ok": true }
```

Remplace (ou crée) la sauvegarde du compte. `data` doit être un objet JSON
non nul — la forme exacte de l'état de jeu n'est pas validée côté serveur,
c'est la responsabilité du front. `400` si `data` n'est pas un objet, `401`
sans token valide.

### `GET /health`

Fait un `SELECT 1` contre la base et répond `{ "ok": true }` (200) ou
`{ "ok": false }` (503). Utilisé par le `HEALTHCHECK` Docker.
