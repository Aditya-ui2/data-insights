#!/bin/bash
# Deploy Data Insights to EC2 from local machine
# Usage: ./deploy.sh

set -e

# EC2 Configuration - UPDATE THESE VALUES
EC2_HOST="13.233.114.13"
EC2_USER="ubuntu"
EC2_KEY="~/.ssh/your-key.pem"  # Update with your key path
APP_DIR="/var/www/datainsights"

echo "=== Building application ==="
npm run build

echo "=== Syncing files to EC2 ==="
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '.env' \
  -e "ssh -i $EC2_KEY" \
  ./ ${EC2_USER}@${EC2_HOST}:${APP_DIR}/

echo "=== Installing dependencies on EC2 ==="
ssh -i $EC2_KEY ${EC2_USER}@${EC2_HOST} "cd ${APP_DIR} && npm install --production"

echo "=== Restarting application ==="
ssh -i $EC2_KEY ${EC2_USER}@${EC2_HOST} "cd ${APP_DIR} && pm2 restart datainsights || pm2 start dist/index.js --name datainsights"

echo "=== Deployment Complete ==="
echo "API available at: http://${EC2_HOST}"
