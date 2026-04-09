#!/bin/bash

# WebUI Installation Script for Azure Debian VM
# Version: 1.0.1
# This script sets up the full-stack webui application

set -e  # Exit on any error

echo "WebUI Version: $(cat VERSION)"

echo "Updating system packages..."
sudo apt update && sudo apt upgrade -y

echo "Installing Node.js 22..."
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

echo "Installing Apache web server..."
sudo apt install -y apache2
sudo a2enmod proxy proxy_http
sudo systemctl enable apache2

echo "Cloning the webui repository..."
read -p "Enter the branch to use for webui (default: main): " BRANCH
if [ -z "$BRANCH" ]; then
    BRANCH=main
fi
git clone -b $BRANCH https://github.com/solutions-hpe/webui.git webui
cd webui

# Create config file with selected branch
echo "# WebUI Configuration" > webui.conf
echo "BRANCH=$BRANCH" >> webui.conf

echo "Installing backend dependencies..."
cd backend
npm install

echo "Installing frontend dependencies..."
cd ../frontend
npm install

echo "Building frontend..."
cd ../backend
npm run build

echo "Setting up environment variables..."
# Note: You need to manually edit backend/.env with your GITHUB_TOKEN and ARUBA credentials
if [ ! -f .env ]; then
    cp .env.example .env
    echo "Please edit backend/.env with your API tokens before starting the server."
fi

echo "Configuring Apache as reverse proxy..."
sudo tee /etc/apache2/sites-available/webui.conf > /dev/null <<EOF
<VirtualHost *:80>
    ServerName localhost
    ProxyPreserveHost On
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/
</VirtualHost>
EOF
sudo a2ensite webui.conf
sudo a2dissite 000-default.conf
sudo systemctl reload apache2

echo "Setting up cron for auto-updates..."
sudo systemctl enable cron
sudo systemctl start cron

echo "Creating update script..."
chmod +x update.sh

echo "Scheduling daily update at 2 AM..."
(crontab -l ; echo "0 2 * * * $PWD/update.sh") | crontab -

echo "Installation complete!"
echo "The webui is running at http://your-vm-ip:3000"
echo "Auto-updates are scheduled daily at 2 AM."
echo "To check status: pm2 status"
echo "To view logs: pm2 logs webui"
echo "To check cron: crontab -l"