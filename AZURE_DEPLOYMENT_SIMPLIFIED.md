# Azure Deployment Guide - Simplified Architecture

This guide covers deploying the Russian Language Tutor as a self-contained Azure Web App that directly calls Azure OpenAI.

## Architecture Overview

```
Browser → Azure Web App (Static Files + React) → Azure OpenAI
```

- **Azure Web App**: Hosts the React application as static files
- **Azure OpenAI**: Provides AI capabilities (GPT-4o model)
- **No Azure Functions or Storage Account required**

## Prerequisites

1. Azure subscription
2. Azure CLI installed and logged in
3. Node.js 18+ installed locally

## Deployment Steps

### 1. Clone and Prepare Repository

```bash
git clone https://github.com/mddazure/russian-language-tutor
cd russian-language-tutor
npm install
```

### 2. Configure Environment Variables

Create or update `.env.azure` file:

```env
VITE_AZURE_OPENAI_ENDPOINT=https://your-region.api.cognitive.microsoft.com/
VITE_AZURE_OPENAI_API_KEY=your-api-key
VITE_AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o
VITE_AZURE_OPENAI_API_VERSION=2024-02-15-preview
```

### 3. Deploy Using Script

```bash
chmod +x deploy-azure-simplified.sh
./deploy-azure-simplified.sh
```

### 4. Manual Deployment (Alternative)

If the script fails, deploy manually:

#### Create Azure Resources

```bash
# Set variables
RESOURCE_GROUP="russian-tutor-rg"
LOCATION="eastus"
OPENAI_RESOURCE="russian-tutor-openai"
WEB_APP_NAME="russian-tutor-app"
APP_SERVICE_PLAN="russian-tutor-plan"

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create Azure OpenAI
az cognitiveservices account create \
  --name $OPENAI_RESOURCE \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --kind OpenAI \
  --sku S0

# Deploy GPT-4o model
az cognitiveservices account deployment create \
  --name $OPENAI_RESOURCE \
  --resource-group $RESOURCE_GROUP \
  --deployment-name gpt-4o \
  --model-name gpt-4o \
  --model-version "2024-05-13" \
  --model-format OpenAI \
  --sku-capacity 10 \
  --sku-name Standard

# Create App Service Plan
az appservice plan create \
  --name $APP_SERVICE_PLAN \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku B1 \
  --is-linux

# Create Web App
az webapp create \
  --resource-group $RESOURCE_GROUP \
  --plan $APP_SERVICE_PLAN \
  --name $WEB_APP_NAME \
  --runtime "NODE|18-lts"
```

#### Get Credentials and Configure

```bash
# Get credentials
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

# Configure Web App
az webapp config appsettings set \
  --name $WEB_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings \
  VITE_AZURE_OPENAI_ENDPOINT="$AZURE_OPENAI_ENDPOINT" \
  VITE_AZURE_OPENAI_API_KEY="$AZURE_OPENAI_API_KEY" \
  VITE_AZURE_OPENAI_DEPLOYMENT_NAME="gpt-4o" \
  VITE_AZURE_OPENAI_API_VERSION="2024-02-15-preview"
```

#### Build and Deploy Application

```bash
# Build application with environment variables
npm run build

# Create deployment package
cd dist
cp ../web.config .
zip -r ../dist.zip .
cd ..

# Deploy to Azure
az webapp deployment source config-zip \
  --resource-group $RESOURCE_GROUP \
  --name $WEB_APP_NAME \
  --src dist.zip
```

## Troubleshooting

### Issue: Generate Story Button Not Working

**Problem**: The button works in Spark but not in Azure Web App deployment.

**Root Cause**: Environment variables are not available during build time in Azure.

**Solutions**:

1. **Use the Updated Deployment Script** (Recommended):
   ```bash
   ./deploy-azure-simplified.sh
   ```
   This script now builds the app with environment variables before deployment.

2. **Manual Build with Environment Variables**:
   ```bash
   # Ensure .env.azure has correct values
   ./build-for-azure.sh
   
   # Then deploy the generated dist.zip
   az webapp deployment source config-zip \
     --resource-group russian-tutor-rg \
     --name russian-tutor-app \
     --src dist.zip
   ```

3. **Verify Build Configuration**:
   - Environment variables must be present during `npm run build`
   - Check browser console for configuration errors
   - Use the troubleshooting script: `./troubleshoot-azure-deployment.sh`

4. **Debug Steps**:
   ```bash
   # Check if environment variables are built into the app
   unzip -p dist.zip assets/index-*.js | grep -o "VITE_AZURE_OPENAI" || echo "Variables not found in build"
   
   # Test the deployed app
   curl https://your-app-name.azurewebsites.net
   ```

### Issue: Web App Shows Default App Service Page

**Problem**: The application isn't loading index.html properly.

**Solutions**:

1. **Check web.config**: Ensure `web.config` is in the deployment package:
   ```xml
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
   ```

2. **Verify files are deployed**: Check Azure Portal > Web App > Advanced Tools > Kudu Console:
   - Navigate to `/home/site/wwwroot`
   - Verify `index.html` and `assets/` folder exist
   - Verify `web.config` exists

3. **Check build output**: Ensure `npm run build` generates files in `dist/`:
   ```bash
   npm run build
   ls -la dist/  # Should show index.html, assets/, etc.
   ```

4. **Manual file verification**:
   ```bash
   # Check if files are in the right place
   curl https://your-app-name.azurewebsites.net/index.html
   ```

### Issue: Environment Variables Not Loading

**Problem**: Azure OpenAI credentials not accessible.

**Solutions**:

1. **Verify App Settings**: In Azure Portal > Web App > Configuration:
   - `VITE_AZURE_OPENAI_ENDPOINT`
   - `VITE_AZURE_OPENAI_API_KEY`
   - `VITE_AZURE_OPENAI_DEPLOYMENT_NAME`
   - `VITE_AZURE_OPENAI_API_VERSION`

2. **Rebuild with correct environment**: Environment variables must be available during build:
   ```bash
   # Set environment variables
   export VITE_AZURE_OPENAI_ENDPOINT="https://your-endpoint/"
   export VITE_AZURE_OPENAI_API_KEY="your-key"
   export VITE_AZURE_OPENAI_DEPLOYMENT_NAME="gpt-4o"
   export VITE_AZURE_OPENAI_API_VERSION="2024-02-15-preview"
   
   # Rebuild
   npm run build
   ```

### Issue: CORS Errors

**Problem**: Browser blocks Azure OpenAI requests.

**Solution**: Configure CORS in Azure OpenAI:
1. Go to Azure OpenAI Studio
2. Navigate to your resource → Settings → CORS
3. Add your web app URL: `https://your-app-name.azurewebsites.net`

### Issue: 404 Errors on Refresh

**Problem**: Direct navigation to routes fails.

**Solution**: Verify `web.config` has proper URL rewriting rules (included in the web.config above).

## Verification Steps

1. **Check Web App Status**:
   ```bash
   az webapp show --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP --query state
   ```

2. **Test Application**:
   - Navigate to `https://your-app-name.azurewebsites.net`
   - Should show Russian Language Tutor interface
   - Try generating a story to test Azure OpenAI connection

3. **Check Logs**:
   ```bash
   az webapp log tail --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP
   ```

## Cost Optimization

- **App Service Plan**: Use B1 (Basic) for development, scale up for production
- **Azure OpenAI**: Monitor token usage, set spending limits
- **Auto-scaling**: Configure based on expected traffic

## Security Considerations

- API keys are exposed to the client (acceptable for this architecture)
- Consider using Azure Managed Identity for production
- Implement rate limiting to prevent abuse
- Monitor usage patterns

## Monitoring

- Enable Application Insights for the Web App
- Monitor Azure OpenAI usage and costs
- Set up alerts for high usage or errors

## Next Steps

After successful deployment:

1. Configure custom domain (optional)
2. Set up SSL certificate (automatic with App Service)
3. Configure monitoring and alerting
4. Set up CI/CD pipeline for automated deployments
5. Consider implementing authentication for production use

## Support

For issues with this deployment:

1. Check the troubleshooting section above
2. Verify all prerequisites are met
3. Review Azure Portal logs
4. Test individual components (Web App, Azure OpenAI) separately