# scuderia
## ENV  
Required:  
- POLYMARKET_PRIVATE_KEY 0x......
- SLACK_CLI_TOKEN asdasdas
  
Optional:  
- LLM claude (or gemini)
- DEBUG 0 (or 1)
- TIMEOUT 600s (or custom)
- CLAUDE_MODEL claude-sonnet-4-6
- CLAUDE_EFFORT low
- GEMINI_MODEL gemini-2.5-flash
## Volumes
- One for /home/appuser
- One for /app/persist

## Setup
Initially the container will sleep infinity. It will wait for you to go inside it on a terminal, and run "claude" in the /app folder. Authenticate.
The container will sense this and exit.
Next scheduled run, it will do the right thing :)

## Run locally
docker run --rm -e POLYMARKET_PRIVATE_KEY=0xasdasdasd -e SLACK_CLI_TOKEN=xoxb-zxczxczxc --name scuderia -v ./data:/home/appuser -v ./persist:/app/persist -e DEBUG=0 scuderia:latest