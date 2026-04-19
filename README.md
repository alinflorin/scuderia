# scuderia

## Environment Variables

**Required:**

| Variable | Example |
|---|---|
| `POLYMARKET_PRIVATE_KEY` | `0x...` |
| `SLACK_CLI_TOKEN` | `xoxb-...` |

**Optional (with defaults):**

| Variable | Default | Options |
|---|---|---|
| `LLM` | `claude` | `gemini` |
| `DEBUG` | `0` | `1` |
| `CLAUDE_MODEL` | `claude-sonnet-4-6` | |
| `CLAUDE_EFFORT` | `low` | |
| `GEMINI_MODEL` | `gemini-2.5-flash` | |
| `REDDIT_CLIENT_ID` | — | |
| `REDDIT_CLIENT_SECRET` | — | |

## Volumes

| Mount | Purpose |
|---|---|
| `/home/appuser` | User home directory |
| `/app/persist` | Persistent app data |

## Running Locally

Clone the repo and build:

```sh
git clone https://github.com/alinflorin/scuderia.git
cd scuderia
docker build -t scuderia:latest .
```

Run with the local image:

```sh
docker run --rm \
  --name scuderia \
  -e POLYMARKET_PRIVATE_KEY=0x... \
  -e SLACK_CLI_TOKEN=xoxb-... \
  -e LLM=gemini \
  -e DEBUG=0 \
  -v ./data:/home/appuser \
  -v ./persist:/app/persist \
  scuderia:latest
```

Or use the pre-built image from the registry:

```sh
docker run --rm \
  --name scuderia \
  -e POLYMARKET_PRIVATE_KEY=0x... \
  -e SLACK_CLI_TOKEN=xoxb-... \
  -e LLM=gemini \
  -e DEBUG=0 \
  -v ./data:/home/appuser \
  -v ./persist:/app/persist \
  ghcr.io/alinflorin/scuderia:latest
```

## First-time Setup

On first run, the container sleeps and waits for authentication. Exec into it and run `claude` or `gemini` from `/app` to authenticate:

```sh
docker exec -it scuderia bash
cd /app
claude   # or: gemini
```

Once authentication completes, the container exits. On the next scheduled run, everything works automatically.
