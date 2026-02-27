#!/usr/bin/env bash
set -euo pipefail

GARAGE="docker exec foss-garage /garage"

echo "==> Waiting for Garage to start..."
sleep 3

# 1. Get node ID and configure layout
echo "==> Configuring cluster layout..."
NODE_ID=$($GARAGE status 2>/dev/null | grep -oP '^[a-f0-9]+' | head -1)
echo "    Node ID: $NODE_ID"
$GARAGE layout assign -z dc1 -c 10G "$NODE_ID"
$GARAGE layout apply --version 1
echo "==> Layout applied"

# 2. Create buckets
echo "==> Creating buckets..."
$GARAGE bucket create foss-files
$GARAGE bucket create foss-assets
echo "==> Buckets created: foss-files, foss-assets"

# 3. Create API key
echo "==> Creating API key..."
$GARAGE key create foss-app-key

# 4. Grant permissions
echo "==> Setting permissions..."
$GARAGE bucket allow --read --write --owner foss-files  --key foss-app-key
$GARAGE bucket allow --read --write --owner foss-assets --key foss-app-key
echo "==> Permissions set"

echo ""
echo "========================================"
echo "  Garage HQ setup complete!"
echo "  Copy the Key ID and Secret Key below"
echo "  into your .env.local file as:"
echo "    S3_ACCESS_KEY_ID=<Key ID>"
echo "    S3_SECRET_ACCESS_KEY=<Secret key>"
echo "========================================"
echo ""
$GARAGE key info foss-app-key
