#!/bin/bash

# Deployment script for VPS with npm dependency fix
# This script handles the ajv dependency conflict automatically

echo "Starting deployment process..."

# Navigate to project directory
cd /var/www/cloleo

# Pull latest changes
echo "Pulling latest changes from GitHub..."
git pull origin main

# Navigate to backend and install dependencies
echo "Installing backend dependencies..."
cd backend
source venv/bin/activate
pip install -r requirements.txt

# Navigate to frontend and install dependencies with legacy peer deps
echo "Installing frontend dependencies..."
cd ../frontend
npm install --legacy-peer-deps

# Build frontend
echo "Building frontend..."
npm run build

# Restart backend
echo "Restarting backend..."
cd ../backend
pm2 restart cloleo-backend

# Reload Apache
echo "Reloading Apache..."
systemctl reload apache2

# Check status
echo "Checking service status..."
pm2 status
systemctl status apache2

echo "Deployment completed successfully!"