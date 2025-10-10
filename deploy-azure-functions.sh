#!/bin/bash

# Azure Functions deployment script
# This script creates the correct directory structure for Azure Functions deployment

echo "Creating Azure Functions deployment structure..."

# Clean up previous deployment directory
rm -rf functions-deploy
rm -f api-deploy.zip

# Create proper Azure Functions structure
mkdir -p functions-deploy/llm

# Copy function files with correct naming
cp api/llm.js functions-deploy/llm/index.js
cp api/llm.js functions-deploy/llm/llm.js
cp api/function.json functions-deploy/llm/function.json
cp host.json functions-deploy/
cp api/package.json functions-deploy/

# Navigate to deployment directory
cd functions-deploy

echo "Installing dependencies..."
npm install --production

echo "Creating deployment package..."
zip -r ../api-deploy.zip .

cd ..

echo "Deployment package created: api-deploy.zip"
echo ""
echo "To deploy to Azure, run:"
echo "az functionapp deployment source config-zip \\"
echo "  --resource-group russian-tutor-rg \\"
echo "  --name russian-tutor-api \\"
echo "  --src api-deploy.zip"
echo ""
echo "Or use Azure Functions Core Tools:"
echo "cd functions-deploy && func azure functionapp publish russian-tutor-api --javascript"
echo ""
echo "After deployment, the API will be available at:"
echo "https://russian-tutor-api.azurewebsites.net/api/llm"