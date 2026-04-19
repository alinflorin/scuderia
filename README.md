# scuderia
## ENV  
Required:  
- POLYMARKET_PRIVATE_KEY 0x......
- SLACK_CLI_TOKEN asdasdas
  
Optional + default:  
- LLM claude (or gemini)
- DEBUG 0 (or 1)
- CLAUDE_MODEL claude-sonnet-4-6
- CLAUDE_EFFORT low
- GEMINI_MODEL gemini-2.5-flash

- REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET - completely optional

## Volumes
- One for /home/appuser
- One for /app/persist

## Setup
Initially the container will sleep infinity. It will wait for you to go inside it on a terminal, and run "claude" or "gemini" in the /app folder. Authenticate.
The container will sense this and exit.
Next scheduled run, it will do the right thing :)

## Run locally
docker run --rm -e POLYMARKET_PRIVATE_KEY=0xasdasdasd -e SLACK_CLI_TOKEN=xoxb-zxczxczxc --name scuderia -v ./data:/home/appuser -v ./persist:/app/persist -e DEBUG=0 -e LLM=gemini scuderia:latest