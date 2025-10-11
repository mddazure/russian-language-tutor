#!/bin/bash

# Azure Web App Deployment Script (Simplified Architecture)
# This script deploys the Russian Language Tutor as a self-contained Web App

set -e

# Configuration
RESOURCE_GROUP="russian-tutor-rg"
LOCATION="eastus"
OPENAI_RESOURCE="russian-tutor-openai"
WEB_APP_NAME="russian-tutor-app"
APP_SERVICE_PLAN="russian-tutor-plan"
MODEL_DEPLOYMENT_NAME="gpt-4o"

echo "🚀 Starting simplified Azure deployment..."

# Function to check if resource exists
resource_exists() {
    az $1 show --name $2 --resource-group $RESOURCE_GROUP &> /dev/null
}

# Create resource group
echo "📁 Creating resource group..."
az group create --name $RESOURCE_GROUP --location $LOCATION --output table

# Create Azure OpenAI resource
echo "🤖 Creating Azure OpenAI resource..."
if ! resource_exists "cognitiveservices account" $OPENAI_RESOURCE; then
    az cognitiveservices account create \
        --name $OPENAI_RESOURCE \
        --resource-group $RESOURCE_GROUP \
        --location $LOCATION \
        --kind OpenAI \
        --sku S0 \
        --output table
    echo "✅ Azure OpenAI resource created"
else
    echo "ℹ️  Azure OpenAI resource already exists"
fi

# Deploy GPT-4o model
echo "🎯 Deploying GPT-4o model..."
if ! az cognitiveservices account deployment show \
    --name $OPENAI_RESOURCE \
    --resource-group $RESOURCE_GROUP \
    --deployment-name $MODEL_DEPLOYMENT_NAME &> /dev/null; then
    
    az cognitiveservices account deployment create \
        --name $OPENAI_RESOURCE \
        --resource-group $RESOURCE_GROUP \
        --deployment-name $MODEL_DEPLOYMENT_NAME \
        --model-name gpt-4o \
        --model-version "2024-05-13" \
        --model-format OpenAI \
        --sku-capacity 10 \
        --sku-name Standard \
        --output table
    echo "✅ GPT-4o model deployed"
else
    echo "ℹ️  GPT-4o model already deployed"
fi

# Create App Service Plan
echo "📋 Creating App Service Plan..."
if ! resource_exists "appservice plan" $APP_SERVICE_PLAN; then
    az appservice plan create \
        --name $APP_SERVICE_PLAN \
        --resource-group $RESOURCE_GROUP \
        --location $LOCATION \
        --sku B1 \
        --is-linux \
        --output table
    echo "✅ App Service Plan created"
else
    echo "ℹ️  App Service Plan already exists"
fi

# Create Web App
echo "🌐 Creating Web App..."
if ! resource_exists "webapp" $WEB_APP_NAME; then
    az webapp create \
        --resource-group $RESOURCE_GROUP \
        --plan $APP_SERVICE_PLAN \
        --name $WEB_APP_NAME \
        --runtime "NODE|18-lts" \
        --output table
    echo "✅ Web App created"
else
    echo "ℹ️  Web App already exists"
fi

# Get Azure OpenAI credentials
echo "🔑 Retrieving Azure OpenAI credentials..."
AZURE_OPENAI_ENDPOINT=$(az cognitiveservices account show \
    --name $OPENAI_RESOURCE \
    --resource-group $RESOURCE_GROUP \
    --query "properties.endpoint" \
    --output tsv)

AZURE_OPENAI_API_KEY=$(az cognitiveservices account keys list \
    --name $OPENAI_RESOURCE \
    --resource-group $RESOURCE_GROUP \
    --query "key1" \
    --output tsv)

echo "✅ Credentials retrieved"
echo "   Endpoint: $AZURE_OPENAI_ENDPOINT"
echo "   API Key: ${AZURE_OPENAI_API_KEY:0:8}..."

# Build application with environment variables
echo "🔨 Building application with environment variables..."

# Create temporary .env file for build
cat > .env << EOF
VITE_AZURE_OPENAI_ENDPOINT=$AZURE_OPENAI_ENDPOINT
VITE_AZURE_OPENAI_API_KEY=$AZURE_OPENAI_API_KEY
VITE_AZURE_OPENAI_DEPLOYMENT_NAME=$MODEL_DEPLOYMENT_NAME
VITE_AZURE_OPENAI_API_VERSION=2024-02-15-preview
EOF

# Install dependencies and build with environment variables
npm install
npm run build

# Remove the temporary .env file
rm .env

echo "📦 Creating deployment package..."
cd dist
cp ../web.config . 2>/dev/null || echo "⚠️  web.config not found, creating basic one..."

# Create basic web.config if it doesn't exist
if [ ! -f "web.config" ]; then
    cat > web.config << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <defaultDocument>
      <files>
        <clear />
        <add value="index.html" />
      </files>
    </defaultDocument>
    <rewrite>
      <rules>
        <rule name="React Routes" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/index.html" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
EOF
fi

zip -r ../dist.zip . > /dev/null
cd ..

echo "🚀 Deploying to Azure Web App..."
az webapp deployment source config-zip \
    --resource-group $RESOURCE_GROUP \
    --name $WEB_APP_NAME \
    --src dist.zip \
    --output table

# Configure CORS for Azure OpenAI (important for web app to work)
echo "🔧 Configuring CORS for Azure OpenAI..."
az cognitiveservices account update \
    --name $OPENAI_RESOURCE \
    --resource-group $RESOURCE_GROUP \
    --custom-domain "" \
    || echo "⚠️  CORS configuration may need manual setup"

echo "✅ Deployment complete!"
echo ""
echo "🎉 Your Russian Language Tutor is now deployed!"
echo "🌐 Web App URL: https://${WEB_APP_NAME}.azurewebsites.net"
echo ""
echo "📋 Next steps:"
echo "   1. Test the application by generating a story"
echo "   2. If you get CORS errors, configure CORS manually in Azure OpenAI Studio"
echo "   3. Monitor usage and costs in Azure Portal"
echo ""
echo "💡 To configure CORS manually if needed:"
echo "   - Go to Azure OpenAI Studio"
echo "   - Navigate to your resource → Settings → CORS"
echo "   - Add: https://${WEB_APP_NAME}.azurewebsites.net"
echo ""
echo "🗂️  Resource Group: $RESOURCE_GROUP"
echo "🤖 Azure OpenAI: $OPENAI_RESOURCE"
echo "🌐 Web App: $WEB_APP_NAME"

# Clean up temporary files
rm -f dist.zip

echo "✨ Deployment script completed successfully!"