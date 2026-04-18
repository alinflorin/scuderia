FROM debian:trixie-slim

# APT
RUN apt-get update
RUN apt-get install -y curl jq yq

# NodeJS
RUN curl -fsSL https://deb.nodesource.com/setup_24.x | bash - && apt-get install -y nodejs
RUN npm i -g npm

# Playwright + Playwright CLI + Chromium + Deps
RUN npm i -g playwright @playwright/cli
RUN npx -y playwright install chromium --with-deps

# Polymarket CLI
RUN curl -sSL https://raw.githubusercontent.com/Polymarket/polymarket-cli/main/install.sh | sh

# Slack CLI
RUN curl -o /usr/local/bin/slack https://raw.githubusercontent.com/rockymadden/slack-cli/master/src/slack && chmod +x /usr/local/bin/slack

# Gemini CLI
RUN npm i -g @google/gemini-cli

# Node + Bash project
WORKDIR /app
COPY ./package.json ./package.json
COPY ./package-lock.json ./package-lock.json
RUN npm ci

COPY . .
RUN chmod +x ./*.sh

VOLUME /root/.gemini
RUN mkdir -p /root/.gemini
COPY ./gemini_settings.json /root/.gemini/settings.json
COPY ./gemini_trusted_folders.json /root/.gemini/trustedFolders.json

ENV NO_BROWSER=true
ENV POLYMARKET_PRIVATE_KEY=""
ENV SLACK_CLI_TOKEN=""

CMD ["./run.sh"]