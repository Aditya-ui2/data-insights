# Deploy Data Insights to EC2 from Windows
# Usage: Run in PowerShell

# EC2 Configuration
$EC2_HOST = "13.233.114.13"
$EC2_USER = "ubuntu"
$EC2_KEY = "C:\Users\Aryan\Downloads\datainsights.pem"
$APP_DIR = "/var/www/datainsights"

Write-Host "=== Building application ===" -ForegroundColor Cyan
npm run build

Write-Host "=== Creating deployment package ===" -ForegroundColor Cyan
# Create a zip excluding node_modules
$excludes = @("node_modules", ".git", ".env")
$source = Get-Location
$dest = "$source\deploy\datainsights.zip"

if (Test-Path $dest) { Remove-Item $dest }
Compress-Archive -Path . -DestinationPath $dest -CompressionLevel Optimal

Write-Host "=== Uploading to EC2 ===" -ForegroundColor Cyan
scp -i $EC2_KEY $dest "${EC2_USER}@${EC2_HOST}:/tmp/"

Write-Host "=== Deploying on EC2 ===" -ForegroundColor Cyan
$sshCommands = @"
cd /var/www/datainsights
sudo rm -rf * 
sudo unzip -o /tmp/datainsights.zip
sudo chown -R `$USER:`$USER .
npm install --production
pm2 restart datainsights || pm2 start dist/index.js --name datainsights
rm /tmp/datainsights.zip
"@

ssh -i $EC2_KEY "${EC2_USER}@${EC2_HOST}" $sshCommands

Write-Host "=== Deployment Complete ===" -ForegroundColor Green
Write-Host "API available at: http://$EC2_HOST" -ForegroundColor Yellow
