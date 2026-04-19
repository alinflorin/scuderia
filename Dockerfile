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

# Claude CLI
RUN npm i -g @anthropic-ai/claude-code@2.1.89

# Playwright + Playwright CLI + Firefox + Deps — install to a fixed path so non-root can access it
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/ms-playwright
RUN npm i -g @playwright/cli@latest
RUN playwright-cli install-browser firefox --with-deps && chmod -R 755 /opt/ms-playwright

# Non-privileged user
RUN useradd -m -s /bin/bash appuser

# Node + Bash project
WORKDIR /app
COPY ./package.json ./package.json
COPY ./package-lock.json ./package-lock.json
RUN npm ci

COPY . .
RUN chmod +x ./*.sh && chown -R appuser:appuser /app

VOLUME /home/appuser/
VOLUME /app/persist/
RUN mkdir -p /home/appuser/.claude && chown -R appuser:appuser /home/appuser
RUN chown -R appuser:appuser /app
USER appuser

ENV NO_BROWSER="true"
ENV PLAYWRIGHT_MCP_ISOLATED="true"
ENV PLAYWRIGHT_MCP_SANDBOX="false"
ENV PLAYWRIGHT_MCP_BROWSER="firefox"
CMD ["./run.sh"]