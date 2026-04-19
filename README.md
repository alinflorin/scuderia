# scuderia
## ENV  
Required:  
- POLYMARKET_PRIVATE_KEY 0x......
- SLACK_CLI_TOKEN asdasdas
  
Optional:  
- DEBUG 0
- TIMEOUT 600s
- MODEL claude-sonnet-4-6

## Volumes
- One for /home/appuser
- One for /app/persist


## Run locally
docker run --rm -e POLYMARKET_PRIVATE_KEY=0xasdasdasd -e SLACK_CLI_TOKEN=xoxb-zxczxczxc --name scuderia -v ./data:/root -v ./persist:/app/persist -e DEBUG=0 scuderia:latest