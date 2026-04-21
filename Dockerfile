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

# Claude CLI + Gemini CLI
RUN npm i -g @google/gemini-cli @anthropic-ai/claude-code

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
RUN chmod +x ./*.sh

RUN mkdir -p /home/appuser/.claude /app/persist || true
RUN chown -R appuser:appuser /app || true
RUN chown -R appuser:appuser /home/appuser || true
VOLUME /home/appuser/
VOLUME /app/persist/
RUN mkdir -p /home/appuser/.claude /app/persist || true
RUN chown -R appuser:appuser /app || true
RUN chown -R appuser:appuser /home/appuser || true

ENV NO_BROWSER="true"
ENV PLAYWRIGHT_MCP_ISOLATED="true"
ENV PLAYWRIGHT_MCP_SANDBOX="false"
ENV PLAYWRIGHT_MCP_BROWSER="firefox"
ENV GEMINI_MODEL="gemini-2.5-flash"
ENV CLAUDE_MODEL="claude-sonnet-4-6"
ENV SLACK_CHANNEL="trading"
ENV CLAUDE_EFFORT="medium"
ENV LLM="claude"
ENV POLYMARKET_SIGNATURE_TYPE="proxy"
ENV HOSTNAME="scuderia"
ENV BUDGETCAPPERCENT="20"

USER appuser

CMD ["./run.sh"]