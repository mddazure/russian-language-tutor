#!/bin/bash

# Exit on any error
set -e

echo "Starting deployment..."

# Install dependencies
echo "Installing dependencies..."
npm ci

# Build the application
echo "Building application..."
npm run build

# Copy build files to wwwroot
echo "Copying files..."
cp -r dist/* $DEPLOYMENT_TARGET/
cp web.config $DEPLOYMENT_TARGET/

# Install API dependencies
echo "Installing API dependencies..."
cd api
npm install
cd ..

echo "Deployment completed successfully!"