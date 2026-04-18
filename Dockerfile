FROM debian:trixie-slim

# APT
RUN apt-get update
RUN apt-get install -y curl jq yq

# NodeJS
RUN curl -fsSL https://deb.nodesource.com/setup_24.x | bash - && apt-get install -y nodejs
RUN npm i -g npm

# Polymarket CLI
RUN curl -sSL https://raw.githubusercontent.com/Polymarket/polymarket-cli/main/install.sh | sh

# Slack CLI
RUN curl -o /usr/local/bin/slack https://raw.githubusercontent.com/rockymadden/slack-cli/master/src/slack && chmod +x /usr/local/bin/slack

# Gemini CLI
RUN npm i -g @google/gemini-cli

# Playwright + Playwright CLI + Firefox + Deps
RUN npm i -g @playwright/cli@latest
RUN playwright-cli install-browser firefox --with-deps

# Node + Bash project
WORKDIR /app
COPY ./package.json ./package.json
COPY ./package-lock.json ./package-lock.json
RUN npm ci

COPY . .
RUN chmod +x ./*.sh

VOLUME /root/.gemini
VOLUME /app/persist
RUN mkdir -p /root/.gemini

ENV NO_BROWSER="true"
#ENV GEMINI_SYSTEM_MD="/app/SYSTEM.md"
ENV PLAYWRIGHT_MCP_ISOLATED="true"
ENV PLAYWRIGHT_MCP_SANDBOX="false"
ENV PLAYWRIGHT_MCP_BROWSER="firefox"
CMD ["./run.sh"]