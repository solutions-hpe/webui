#!/bin/bash

# WebUI Auto-Update Script
# Version: 1.0.2
# Pulls latest changes from GitHub, updates dependencies, rebuilds, and restarts the app

set -e

WEBUI_DIR="$(dirname "$0")"  # Directory of this script

cd "$WEBUI_DIR"

if [ ! -d .git ]; then
    echo "Error: this directory is not a git repository. Update aborted."
    exit 1
fi

# Source config
if [ -f webui.conf ]; then
    source webui.conf
    BRANCH=${BRANCH:-main}
    echo "Preserving existing webui.conf; using branch: $BRANCH"
else
    echo "WARNING: webui.conf not found. Defaulting to main branch."
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