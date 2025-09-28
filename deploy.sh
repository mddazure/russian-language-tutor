#!/bin/bash

# Exit on any error
set -e

echo "Starting deployment..."

# Install dependencies
echo "Installing dependencies..."
npm ci

# Build the application for Azure
echo "Building application..."
npm run build:azure

# Copy build files to wwwroot (dist already contains web.config)
echo "Copying files..."
cp -r dist/* $DEPLOYMENT_TARGET/

# Install API dependencies
echo "Installing API dependencies..."
cd api
npm install
cd ..

echo "Deployment completed successfully!"