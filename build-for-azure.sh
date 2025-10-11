#!/bin/bash

# Build script for Azure deployment
# This script builds the app with Azure OpenAI environment variables

set -e

echo "🔨 Building Russian Language Tutor for Azure deployment..."

# Check if .env.azure exists
if [ ! -f ".env.azure" ]; then
    echo "❌ .env.azure file not found!"
    echo "Please create .env.azure with your Azure OpenAI configuration:"
    echo ""
    echo "VITE_AZURE_OPENAI_ENDPOINT=https://your-region.api.cognitive.microsoft.com/"
    echo "VITE_AZURE_OPENAI_API_KEY=your-api-key"
    echo "VITE_AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o"
    echo "VITE_AZURE_OPENAI_API_VERSION=2024-02-15-preview"
    echo ""
    exit 1
fi

# Load environment variables from .env.azure
echo "📋 Loading environment variables from .env.azure..."
export $(cat .env.azure | xargs)

# Verify required environment variables
if [ -z "$VITE_AZURE_OPENAI_ENDPOINT" ] || [ -z "$VITE_AZURE_OPENAI_API_KEY" ]; then
    echo "❌ Missing required environment variables in .env.azure:"
    echo "   - VITE_AZURE_OPENAI_ENDPOINT"
    echo "   - VITE_AZURE_OPENAI_API_KEY"
    exit 1
fi

echo "✅ Environment variables loaded:"
echo "   - VITE_AZURE_OPENAI_ENDPOINT: ${VITE_AZURE_OPENAI_ENDPOINT:0:50}..."
echo "   - VITE_AZURE_OPENAI_API_KEY: ${VITE_AZURE_OPENAI_API_KEY:0:8}..."
echo "   - VITE_AZURE_OPENAI_DEPLOYMENT_NAME: $VITE_AZURE_OPENAI_DEPLOYMENT_NAME"
echo "   - VITE_AZURE_OPENAI_API_VERSION: $VITE_AZURE_OPENAI_API_VERSION"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the application
echo "⚙️  Building application..."
npm run build

# Copy web.config to dist
echo "📝 Adding web.config for Azure Web App..."
cp web.config dist/ 2>/dev/null || echo "⚠️  web.config not found, creating basic one..."

# Create basic web.config if it doesn't exist
if [ ! -f "dist/web.config" ]; then
    cat > dist/web.config << 'EOF'
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

# Create deployment package
echo "📦 Creating deployment package..."
cd dist
zip -r ../dist.zip . > /dev/null
cd ..

echo "✅ Build complete!"
echo ""
echo "📁 Build output: dist/"
echo "📦 Deployment package: dist.zip"
echo ""
echo "🚀 To deploy to Azure Web App:"
echo "   az webapp deployment source config-zip \\"
echo "     --resource-group your-resource-group \\"
echo "     --name your-web-app-name \\"
echo "     --src dist.zip"
echo ""
echo "💡 Or use the Azure Portal to upload dist.zip through the Deployment Center."