#!/bin/bash

# Azure Web App Deployment Troubleshooting Script
# This script helps diagnose common deployment issues

set -e

# Configuration (update these values)
RESOURCE_GROUP="russian-tutor-rg"
WEB_APP_NAME="russian-tutor-app"

echo "🔍 Azure Web App Deployment Troubleshooting"
echo "==========================================="
echo ""

# Function to check if Azure CLI is logged in
check_azure_login() {
    echo "🔐 Checking Azure CLI login..."
    if az account show > /dev/null 2>&1; then
        SUBSCRIPTION=$(az account show --query name --output tsv)
        echo "✅ Logged in to Azure subscription: $SUBSCRIPTION"
    else
        echo "❌ Not logged in to Azure CLI. Please run 'az login'"
        exit 1
    fi
    echo ""
}

# Function to check resource group
check_resource_group() {
    echo "📁 Checking resource group: $RESOURCE_GROUP"
    if az group show --name $RESOURCE_GROUP > /dev/null 2>&1; then
        echo "✅ Resource group exists"
    else
        echo "❌ Resource group '$RESOURCE_GROUP' not found"
        echo "💡 Create it with: az group create --name $RESOURCE_GROUP --location eastus"
        exit 1
    fi
    echo ""
}

# Function to check web app
check_web_app() {
    echo "🌐 Checking web app: $WEB_APP_NAME"
    if az webapp show --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP > /dev/null 2>&1; then
        STATE=$(az webapp show --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP --query state --output tsv)
        DEFAULT_DOMAIN=$(az webapp show --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP --query defaultHostName --output tsv)
        echo "✅ Web app exists"
        echo "   State: $STATE"
        echo "   URL: https://$DEFAULT_DOMAIN"
        
        if [ "$STATE" = "Running" ]; then
            echo "✅ Web app is running"
        else
            echo "⚠️  Web app state: $STATE"
        fi
    else
        echo "❌ Web app '$WEB_APP_NAME' not found"
        echo "💡 Create it with the deployment script"
        exit 1
    fi
    echo ""
}

# Function to check app settings
check_app_settings() {
    echo "⚙️  Checking app settings..."
    SETTINGS=$(az webapp config appsettings list --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP --output table)
    
    echo "Current app settings:"
    echo "$SETTINGS"
    
    # Check specific required settings
    ENDPOINT=$(az webapp config appsettings list --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP --query "[?name=='VITE_AZURE_OPENAI_ENDPOINT'].value" --output tsv)
    API_KEY=$(az webapp config appsettings list --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP --query "[?name=='VITE_AZURE_OPENAI_API_KEY'].value" --output tsv)
    DEPLOYMENT_NAME=$(az webapp config appsettings list --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP --query "[?name=='VITE_AZURE_OPENAI_DEPLOYMENT_NAME'].value" --output tsv)
    
    if [ -n "$ENDPOINT" ]; then
        echo "✅ VITE_AZURE_OPENAI_ENDPOINT is set"
    else
        echo "❌ VITE_AZURE_OPENAI_ENDPOINT is missing"
    fi
    
    if [ -n "$API_KEY" ]; then
        echo "✅ VITE_AZURE_OPENAI_API_KEY is set"
    else
        echo "❌ VITE_AZURE_OPENAI_API_KEY is missing"
    fi
    
    if [ -n "$DEPLOYMENT_NAME" ]; then
        echo "✅ VITE_AZURE_OPENAI_DEPLOYMENT_NAME is set to: $DEPLOYMENT_NAME"
    else
        echo "❌ VITE_AZURE_OPENAI_DEPLOYMENT_NAME is missing"
    fi
    echo ""
}

# Function to check deployment files
check_deployment_files() {
    echo "📦 Checking local deployment files..."
    
    if [ -f "dist/index.html" ]; then
        echo "✅ dist/index.html exists"
    else
        echo "❌ dist/index.html missing - run 'npm run build'"
    fi
    
    if [ -f "dist/web.config" ]; then
        echo "✅ dist/web.config exists"
    else
        echo "⚠️  dist/web.config missing - will be created during deployment"
    fi
    
    if [ -d "dist/assets" ]; then
        ASSET_COUNT=$(ls -1 dist/assets/ 2>/dev/null | wc -l)
        echo "✅ dist/assets directory exists with $ASSET_COUNT files"
    else
        echo "❌ dist/assets directory missing - run 'npm run build'"
    fi
    echo ""
}

# Function to test web app response
test_web_app_response() {
    echo "🌐 Testing web app response..."
    DEFAULT_DOMAIN=$(az webapp show --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP --query defaultHostName --output tsv)
    URL="https://$DEFAULT_DOMAIN"
    
    echo "Testing: $URL"
    
    # Test main page
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$URL" || echo "000")
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ Web app responds with HTTP 200"
        
        # Check if it's serving the React app or default page
        CONTENT=$(curl -s "$URL" | grep -o "<title>[^<]*</title>" || echo "")
        if [[ "$CONTENT" == *"Russian Language Tutor"* ]]; then
            echo "✅ Serving correct application (found Russian Language Tutor title)"
        else
            echo "⚠️  May be serving default App Service page"
            echo "   Title found: $CONTENT"
        fi
    else
        echo "❌ Web app responds with HTTP $HTTP_CODE"
        if [ "$HTTP_CODE" = "000" ]; then
            echo "   Connection failed - check if app is running"
        fi
    fi
    
    # Test static assets
    echo ""
    echo "Testing static assets..."
    ASSET_URL="$URL/assets/"
    ASSET_HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$ASSET_URL" || echo "000")
    
    if [ "$ASSET_HTTP_CODE" = "403" ] || [ "$ASSET_HTTP_CODE" = "404" ]; then
        echo "✅ Assets directory properly protected (HTTP $ASSET_HTTP_CODE)"
    else
        echo "ℹ️  Assets directory responds with HTTP $ASSET_HTTP_CODE"
    fi
    echo ""
}

# Function to check logs
check_logs() {
    echo "📋 Checking recent logs..."
    echo "Recent application logs:"
    az webapp log download --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP --log-file app-logs.zip 2>/dev/null || echo "Could not download logs"
    
    echo ""
    echo "💡 To view live logs, run:"
    echo "   az webapp log tail --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP"
    echo ""
}

# Function to provide recommendations
provide_recommendations() {
    echo "💡 Recommendations:"
    echo "=================="
    
    # Check if app is showing default page
    DEFAULT_DOMAIN=$(az webapp show --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP --query defaultHostName --output tsv)
    URL="https://$DEFAULT_DOMAIN"
    
    CONTENT=$(curl -s "$URL" | head -20)
    if [[ "$CONTENT" == *"Your app service is up and running"* ]] || [[ "$CONTENT" == *"Microsoft Azure App Service"* ]]; then
        echo ""
        echo "🚨 ISSUE DETECTED: App Service is showing the default welcome page"
        echo ""
        echo "This means your application files weren't deployed correctly."
        echo ""
        echo "Solutions:"
        echo "1. Rebuild and redeploy:"
        echo "   npm run build"
        echo "   cd dist && zip -r ../dist.zip . && cd .."
        echo "   az webapp deployment source config-zip --resource-group $RESOURCE_GROUP --name $WEB_APP_NAME --src dist.zip"
        echo ""
        echo "2. Check Kudu console:"
        echo "   Navigate to: https://$WEB_APP_NAME.scm.azurewebsites.net"
        echo "   Go to Debug console > CMD"
        echo "   Check if files exist in: site/wwwroot/"
        echo ""
        echo "3. Verify web.config is present and correct"
        echo ""
    fi
    
    echo "General troubleshooting steps:"
    echo "1. Ensure all files are built: npm run build"
    echo "2. Verify web.config is in the deployment package"
    echo "3. Check that environment variables are set correctly"
    echo "4. Test Azure OpenAI connectivity separately"
    echo "5. Review deployment logs in Azure Portal"
    echo ""
}

# Main execution
echo "Starting troubleshooting checks..."
echo ""

check_azure_login
check_resource_group
check_web_app
check_app_settings
check_deployment_files
test_web_app_response
check_logs
provide_recommendations

echo "🔍 Troubleshooting complete!"
echo ""
echo "If issues persist:"
echo "1. Check the full deployment guide: AZURE_DEPLOYMENT_SIMPLIFIED.md"
echo "2. Review Azure Portal logs"
echo "3. Test components individually"