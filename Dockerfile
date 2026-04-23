FROM debian:trixie-slim

# APT
RUN apt-get update
RUN apt-get install -y curl jq yq

# Polymarket CLI
RUN curl -sSL https://raw.githubusercontent.com/Polymarket/polymarket-cli/main/install.sh | sh

# Slack CLI
RUN curl -o /usr/local/bin/slack https://raw.githubusercontent.com/rockymadden/slack-cli/master/src/slack && chmod +x /usr/local/bin/slack

# NodeJS
RUN curl -fsSL https://deb.nodesource.com/setup_24.x | bash - && apt-get install -y nodejs

# Verdict - browser CLI
RUN npm install -g verdict-cli

# Claude CLI
RUN npm i -g @anthropic-ai/claude-code

# Python
RUN apt-get install -y python3 python3-pip python3-venv && \
    ln -s /usr/bin/python3 /usr/local/bin/python && \
    ln -s /usr/bin/pip3 /usr/local/bin/pip

ENV UV_INSTALL_DIR=/usr/local/bin
ENV PATH="/root/.local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
RUN curl -LsSf https://astral.sh/uv/install.sh | bash


# Node + Bash project
WORKDIR /app
COPY ./package.json ./package.json
COPY ./package-lock.json ./package-lock.json
RUN npm ci
COPY . .
RUN npm run build
RUN chmod +x ./*.sh


ENV NO_BROWSER="true"
ENV CLAUDE_MODEL="claude-sonnet-4-6"
ENV SLACK_CHANNEL="trading"
ENV CLAUDE_EFFORT="medium"
ENV POLYMARKET_SIGNATURE_TYPE="proxy"
ENV HOSTNAME="scuderia"
ENV BUDGETCAPPERCENT="20"
ENV CLAUDE_CODE_ENABLE_TELEMETRY="0"
ENV CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC="1"
ENV IS_SANDBOX="1"

VOLUME /app/persist
RUN mkdir -p /app/persist || true

CMD ["./run.sh"]