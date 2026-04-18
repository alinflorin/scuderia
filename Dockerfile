FROM debian:trixie-slim

# APT
RUN apt-get update
RUN apt-get install -y curl

# NodeJS
RUN curl -fsSL https://deb.nodesource.com/setup_24.x | bash - && apt-get install -y nodejs
RUN npm i -g npm

# Playwright + Chromium + Deps
RUN npx -y playwright install chromium --with-deps

# Node + Bash project
WORKDIR /app
COPY ./package.json ./package.json
COPY ./package-lock.json ./package-lock.json
RUN npm ci

COPY . .
CMD ["npm", "run", "tsx", "index.ts"]