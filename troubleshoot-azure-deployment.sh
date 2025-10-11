#!/bin/bash

# Azure Deployment Troubleshooting Script
# This script helps diagnose common deployment issues

set -e

# Configuration (update these with your actual resource names)
RESOURCE_GROUP="${RESOURCE_GROUP:-russian-tutor-rg}"
WEB_APP_NAME="${WEB_APP_NAME:-russian-tutor-app}"
OPENAI_RESOURCE="${OPENAI_RESOURCE:-russian-tutor-openai}"

echo "🔍 Azure Deployment Troubleshooting Tool"
echo "========================================"
echo ""

# Function to check if Azure CLI is logged in
check_azure_cli() {
    echo "1. Checking Azure CLI login..."
    if az account show &> /dev/null; then
        local account=$(az account show --query name --output tsv)
        echo "✅ Logged into Azure: $account"
    else
        echo "❌ Not logged into Azure CLI. Run 'az login' first."
        exit 1
    fi
}

# Function to check if resources exist
check_resources() {
    echo ""
    echo "2. Checking Azure resources..."
    
    # Check resource group
    if az group show --name $RESOURCE_GROUP &> /dev/null; then
        echo "✅ Resource group '$RESOURCE_GROUP' exists"
    else
        echo "❌ Resource group '$RESOURCE_GROUP' not found"
        return 1
    fi
    
    # Check Web App
    if az webapp show --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP &> /dev/null; then
        echo "✅ Web App '$WEB_APP_NAME' exists"
        local app_url="https://${WEB_APP_NAME}.azurewebsites.net"
        echo "   URL: $app_url"
        
        # Check Web App status
        local state=$(az webapp show --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP --query state --output tsv)
        echo "   Status: $state"
    else
        echo "❌ Web App '$WEB_APP_NAME' not found"
        return 1
    fi
    
    # Check Azure OpenAI
    if az cognitiveservices account show --name $OPENAI_RESOURCE --resource-group $RESOURCE_GROUP &> /dev/null; then
        echo "✅ Azure OpenAI '$OPENAI_RESOURCE' exists"
        local endpoint=$(az cognitiveservices account show --name $OPENAI_RESOURCE --resource-group $RESOURCE_GROUP --query properties.endpoint --output tsv)
        echo "   Endpoint: $endpoint"
    else
        echo "❌ Azure OpenAI '$OPENAI_RESOURCE' not found"
        return 1
    fi
}

# Function to check deployment files
check_deployment_files() {
    echo ""
    echo "3. Checking deployment files..."
    
    if [ -f "dist/index.html" ]; then
        echo "✅ index.html exists in dist/"
    else
        echo "❌ index.html not found in dist/"
        echo "   Run 'npm run build' to generate build files"
    fi
    
    if [ -f "dist/web.config" ]; then
        echo "✅ web.config exists in dist/"
    else
        echo "⚠️  web.config not found in dist/"
        echo "   This may cause routing issues in Azure Web App"
    fi
    
    if [ -d "dist/assets" ]; then
        echo "✅ assets folder exists in dist/"
        local asset_count=$(find dist/assets -type f | wc -l)
        echo "   Contains $asset_count files"
    else
        echo "❌ assets folder not found in dist/"
    fi
}

# Function to test build configuration
check_build_config() {
    echo ""
    echo "4. Checking build configuration..."
    
    if [ -f ".env.azure" ]; then
        echo "✅ .env.azure file exists"
        echo "   Environment variables for build:"
        while IFS= read -r line; do
            if [[ $line == *"="* ]] && [[ $line != \#* ]]; then
                local key=$(echo $line | cut -d'=' -f1)
                local value=$(echo $line | cut -d'=' -f2)
                if [[ $key == *"API_KEY"* ]]; then
                    echo "     $key=${value:0:8}..."
                else
                    echo "     $key=$value"
                fi
            fi
        done < .env.azure
    else
        echo "❌ .env.azure file not found"
        echo "   Environment variables won't be available during build"
    fi
    
    # Check package.json build scripts
    if command -v jq &> /dev/null; then
        local build_script=$(jq -r '.scripts.build // empty' package.json)
        if [ ! -z "$build_script" ]; then
            echo "✅ Build script: $build_script"
        else
            echo "❌ No build script found in package.json"
        fi
    fi
}

# Function to test Azure connectivity
test_azure_connectivity() {
    echo ""
    echo "5. Testing Azure connectivity..."
    
    # Test Web App URL
    local app_url="https://${WEB_APP_NAME}.azurewebsites.net"
    echo "   Testing Web App URL: $app_url"
    
    if curl -s --head --request GET $app_url | head -n 1 | grep -q "200 OK"; then
        echo "✅ Web App is accessible"
        
        # Check if it returns HTML
        local response=$(curl -s $app_url | head -c 100)
        if [[ $response == *"<!DOCTYPE html>"* ]]; then
            echo "✅ Web App returns HTML content"
        else
            echo "⚠️  Web App doesn't return expected HTML content"
            echo "     Response preview: ${response:0:50}..."
        fi
    else
        echo "❌ Web App is not accessible"
        echo "   Check if the app is running and deployed correctly"
    fi
    
    # Test Azure OpenAI endpoint
    local openai_endpoint=$(az cognitiveservices account show --name $OPENAI_RESOURCE --resource-group $RESOURCE_GROUP --query properties.endpoint --output tsv 2>/dev/null || echo "")
    if [ ! -z "$openai_endpoint" ]; then
        echo "   Testing Azure OpenAI endpoint: $openai_endpoint"
        if curl -s --head --request GET $openai_endpoint | head -n 1 | grep -q -E "(200|401|403)"; then
            echo "✅ Azure OpenAI endpoint is reachable"
        else
            echo "❌ Azure OpenAI endpoint is not reachable"
        fi
    fi
}

# Function to check logs
check_logs() {
    echo ""
    echo "6. Checking recent logs..."
    
    echo "   Recent Web App logs (last 10 lines):"
    az webapp log tail --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP --provider application --slot production 2>/dev/null | tail -10 || echo "   No logs available or access denied"
}

# Function to provide recommendations
provide_recommendations() {
    echo ""
    echo "7. Recommendations..."
    echo "==================="
    
    echo ""
    echo "🔧 If the generate story button doesn't work:"
    echo "   1. Check browser console for errors (F12 → Console)"
    echo "   2. Verify environment variables are built into the app"
    echo "   3. Rebuild with: ./build-for-azure.sh"
    echo "   4. Check CORS settings in Azure OpenAI Studio"
    echo ""
    echo "🌐 If the web app shows default page:"
    echo "   1. Ensure index.html is in the deployment package"
    echo "   2. Verify web.config exists and is correct"
    echo "   3. Check file permissions in Kudu console"
    echo ""
    echo "🔑 If you get authentication errors:"
    echo "   1. Verify API key is correct in .env.azure"
    echo "   2. Check if the OpenAI resource is properly deployed"
    echo "   3. Ensure the deployment model name matches"
    echo ""
    echo "💡 Quick fixes to try:"
    echo "   - Restart the Web App: az webapp restart --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP"
    echo "   - Redeploy: az webapp deployment source config-zip --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP --src dist.zip"
    echo "   - Check Kudu console: https://${WEB_APP_NAME}.scm.azurewebsites.net"
}

# Main execution
main() {
    check_azure_cli
    
    if check_resources; then
        check_deployment_files
        check_build_config
        test_azure_connectivity
        check_logs
    fi
    
    provide_recommendations
    
    echo ""
    echo "✨ Troubleshooting complete!"
    echo ""
    echo "🔗 Useful links:"
    echo "   - Web App: https://${WEB_APP_NAME}.azurewebsites.net"
    echo "   - Kudu Console: https://${WEB_APP_NAME}.scm.azurewebsites.net"
    echo "   - Azure Portal: https://portal.azure.com/#@/resource/subscriptions/$(az account show --query id --output tsv)/resourceGroups/$RESOURCE_GROUP/overview"
}

# Run the main function
main