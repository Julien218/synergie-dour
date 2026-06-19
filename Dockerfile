FROM node:20-alpine

WORKDIR /app

# Installer pnpm
RUN npm install -g pnpm@10

# Copier les fichiers de dépendances
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# Installer sans frozen-lockfile pour éviter les erreurs de sync
RUN pnpm install --no-frozen-lockfile

# Copier le reste du code
COPY . .

# Builder
RUN pnpm run build

EXPOSE 3000

CMD ["pnpm", "run", "start"]
