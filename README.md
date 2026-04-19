# scuderia
## ENV
- POLYMARKET_PRIVATE_KEY 0x......
- SLACK_CLI_TOKEN asdasdas
- DEBUG 1 or 0
- TIMEOUT 600s
- MODEL claude-sonnet-4-6


## Run locally
docker run --rm -e POLYMARKET_PRIVATE_KEY=0xasdasdasd -e SLACK_CLI_TOKEN=xoxb-zxczxczxc --name scuderia -v ./data:/root -v ./persist:/app/persist -e DEBUG=0 scuderia:latest