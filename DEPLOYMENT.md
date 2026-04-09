<!-- Version: 1.0.2 -->

# WebUI Deployment Guide

This guide explains how to deploy the WebUI dashboard on an Azure Debian VM using the provided installation script.

## Prerequisites
- An Azure account with permissions to create VMs.
- SSH access to the VM.
- GitHub Personal Access Token with `repo` permissions for config editing.
- Aruba Central API credentials (optional, for real integration).

## Step 1: Create an Azure Debian VM
1. Go to the Azure portal.
2. Create a new VM:
   - OS: Debian (latest version).
   - Size: At least Standard B1s (1 vCPU, 1 GB RAM) for testing.
   - Networking: Allow SSH (port 22) and HTTP (port 80/3000).
3. SSH into the VM: `ssh azureuser@your-vm-ip`

## Step 2: Run the Installation Script
The `install.sh` script automates the entire setup process.

1. Download and run the script:
   ```
   wget https://raw.githubusercontent.com/solutions-hpe/webui/main/install.sh
   chmod +x install.sh
   sudo ./install.sh
   ```

   During installation, you'll be prompted to enter the branch (e.g., `main`, `develop`). If left blank, it defaults to `main`.

2. The script will:
   - Update system packages.
   - Install Node.js 22.
   - Install PM2 for process management.
   - Install Apache web server and configure as reverse proxy.
   - Start the backend Node app with PM2.
   - Clone the webui repository.
   - Install backend and frontend dependencies.
   - Build the frontend.
   - Copy `.env.example` to `.env` (you'll need to edit it).
   - Start the server with PM2 on port 3000.
   - Configure Apache to proxy requests to the app on port 80.
   - Set up cron for daily auto-updates at 2 AM.

## Auto-Updates
The installation script sets up a cron job to automatically update the application daily at 2 AM from the selected branch. The update process:
- Pulls the latest code from the configured GitHub branch.
- Reinstalls dependencies (backend and frontend).
- Rebuilds the frontend.
- Restarts the application with PM2.

The branch is stored in `webui.conf`. To change branches, edit this file and restart the update manually.

To modify the schedule, edit the crontab: `crontab -e` and change the line for `update.sh`.
To disable, remove the line from crontab.

## Step 3: Configure Environment Variables
After the script runs, edit the `.env` file in the `webui/backend/` directory:

```
GITHUB_TOKEN=your_github_personal_access_token
ARUBA_CLIENT_ID=your_aruba_client_id
ARUBA_CLIENT_SECRET=your_aruba_client_secret
PORT=3000
```

- **GITHUB_TOKEN**: Required for editing config files.
- **ARUBA credentials**: Optional; the app works with mocked data if not provided.
- Save and restart: `pm2 restart webui`

## Step 4: Access the Application
- The app runs on port 3000 by default.
- Visit `http://your-vm-ip:3000` in a browser.
- For production, configure nginx to proxy port 80 to 3000.

## Step 5: Production Setup (Optional)
- Enable auto-start: The script runs `pm2 startup`—follow the output instructions.
- Monitor: `pm2 monit` or `pm2 logs webui`.
- SSL: Use Let's Encrypt with certbot for HTTPS.

## Troubleshooting
- **Port issues**: Ensure port 3000 is open in Azure NSG.
- **Dependencies fail**: Check internet connection and Node.js version (`node -v`).
- **API errors**: Verify tokens in `.env`.
- **Restart**: `pm2 restart webui` or `pm2 reload webui`.
- **Update issues**: Check cron logs (`grep CRON /var/log/syslog`) or run `update.sh` manually for errors.

## Updating the Application
To update to the latest version:
```
cd webui
git pull
cd backend
npm install  # If dependencies changed
npm run build
pm2 restart webui
```

For questions, check the README.md or open an issue in the repository.