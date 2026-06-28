#!/usr/bin/env bash
# Deploy the VintageFit backend to fly.io.
# Usage:
#   ./deploy.sh                  # deploys with whatever's in fly.toml
#   ./deploy.sh --first-time     # also creates the app + volume + sets secrets
set -euo pipefail

if ! command -v fly >/dev/null 2>&1; then
    echo "flyctl not installed. brew install flyctl, then 'fly auth login'." >&2
    exit 1
fi

if [[ "${1:-}" == "--first-time" ]]; then
    fly launch --copy-config --no-deploy --yes
    fly volumes create vintagefit_data --size 1 --region iad
    echo "Now set your secrets, e.g.:"
    echo "  fly secrets set ANTHROPIC_API_KEY=sk-... VISION_PROVIDER=anthropic RESEARCH_PROVIDER=anthropic"
fi

fly deploy
echo
echo "Deployed. Backend URL:"
fly status | awk '/Hostname/ {print "https://" $2}'
