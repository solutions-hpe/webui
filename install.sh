#!/bin/bash

# WebUI Installation Script for Azure Debian VM
# Version: 1.0.2
# This script sets up the full-stack webui application

set -e  # Exit on any error

echo "WebUI Version: $(cat VERSION)"

echo "Updating system packages..."
sudo apt update && sudo apt upgrade -y

echo "Installing Node.js 22..."
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

echo "Installing PM2 process manager..."
sudo npm install -g pm2

echo "Installing Apache web server..."
sudo apt install -y apache2
sudo a2enmod proxy proxy_http
sudo systemctl enable apache2

echo "Cleaning up any old webui install in current directory..."
if [ -d "./webui" ]; then
    echo "Removing old webui directory..."
    rm -rf ./webui
fi

WEBUI_DIR="/opt/webui"
if [ -d "$WEBUI_DIR" ]; then
    echo "Detected existing webui directory at $WEBUI_DIR"
    read -p "Existing webui directory detected at $WEBUI_DIR. Reuse it? [Y/n] " REUSE_DIR
    REUSE_DIR=${REUSE_DIR:-Y}
    if [[ "$REUSE_DIR" =~ ^[Yy] ]]; then
        cd "$WEBUI_DIR"
        if [ -f webui.conf ]; then
            read -p "webui.conf exists. Keep existing webui.conf? [Y/n] " KEEP_CONF
            KEEP_CONF=${KEEP_CONF:-Y}
            if [[ ! "$KEEP_CONF" =~ ^[Yy] ]]; then
                rm -f webui.conf
            fi
        fi
    else
        echo "Removing existing webui directory..."
        sudo rm -rf "$WEBUI_DIR"
        WEBUI_DIR=""
    fi
fi

if [ -z "$WEBUI_DIR" ]; then
    read -p "Enter the branch to use for webui (default: main): " BRANCH
    BRANCH=${BRANCH:-main}
    echo "Cloning the webui repository to $WEBUI_DIR..."
    sudo mkdir -p /opt
    sudo git clone -b "$BRANCH" https://github.com/solutions-hpe/webui.git "$WEBUI_DIR"
    sudo chown -R $SUDO_USER:$SUDO_USER "$WEBUI_DIR" 2>/dev/null || true  # Try to chown if SUDO_USER is set
    cd "$WEBUI_DIR"
    echo "# WebUI Configuration" > webui.conf
    echo "BRANCH=$BRANCH" >> webui.conf
else
    cd "$WEBUI_DIR"
    if [ -f webui.conf ]; then
        source webui.conf
        BRANCH=${BRANCH:-main}
        echo "Preserving existing webui.conf; using branch: $BRANCH"
    else
        read -p "Enter the branch to use for webui (default: main): " BRANCH
        BRANCH=${BRANCH:-main}
        echo "# WebUI Configuration" > webui.conf
        echo "BRANCH=$BRANCH" >> webui.conf
    fi
fi

echo "Installing backend dependencies..."
cd backend
npm install

echo "Installing frontend dependencies..."
cd ../frontend
npm install

echo "Building frontend..."
cd ../backend
npm run build

echo "Starting the webui application with PM2..."
if pm2 describe webui >/dev/null 2>&1; then
    pm2 restart webui
else
    pm2 start server.js --name webui
fi
pm2 save

echo "Verifying app startup..."
pm2 status webui
if ss -ltnp | grep -q ':3000'; then
    echo "Port 3000 is listening. WebUI should be available on localhost:3000."
else
    echo "WARNING: Port 3000 is not listening. Run 'pm2 logs webui' to inspect startup errors."
fi

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