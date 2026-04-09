# WebUI Dashboard

A dashboard for managing simulation configurations, monitoring statuses, and integrating with HPE services.

## Quick Start (Local Development)

1. Install dependencies for backend and frontend.
2. Set up environment variables in backend/.env: GITHUB_TOKEN, ARUBA_API_KEY, etc.
3. Build the frontend: `cd backend && npm run build`
4. Run the server: `cd backend && npm start` (serves both frontend and API on port 3000)

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for full instructions on deploying to an Azure Debian VM using the `install.sh` script.

## Features

- Edit simulation config via GitHub API (only for non-default branches)
- Receive simulation status updates
- Pull Aruba Central statuses
- HPE branded UI
