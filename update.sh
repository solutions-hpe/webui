#!/bin/bash

# WebUI Auto-Update Script
# Pulls latest changes from GitHub, updates dependencies, rebuilds, and restarts the app

set -e

WEBUI_DIR="$(dirname "$0")"  # Directory of this script

cd "$WEBUI_DIR"

# Source config
if [ -f webui.conf ]; then
    source webui.conf
else
    BRANCH=main
fi

echo "Pulling latest changes from GitHub branch: $BRANCH..."
git pull origin $BRANCH

echo "Checking for backend dependency changes..."
cd backend
npm install  # Always install to be safe

echo "Checking for frontend dependency changes..."
cd ../frontend
npm install

echo "Building frontend..."
cd ../backend
npm run build

echo "Restarting application..."
pm2 restart webui

echo "Update complete at $(date)"