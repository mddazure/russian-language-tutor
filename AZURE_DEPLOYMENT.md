# Azure Web App Deployment Guide

This guide explains how to deploy the Russian Language Tutor application to Azure as a Web App with Azure OpenAI integration.

## Prerequisites

1. Azure subscription
2. Azure OpenAI resource with a deployed GPT-4o model
3. Azure CLI installed locally

## Step 1: Create Azure Resources

### Create Azure OpenAI Resource

```bash
# Create resource group
az group create --name russian-tutor-rg --location eastus

# Create Azure OpenAI resource
az cognitiveservices account create \
  --name russian-tutor-openai \
  --resource-group russian-tutor-rg \
  --location eastus \
  --kind OpenAI \
  --sku S0

# Deploy GPT-4o model
az cognitiveservices account deployment create \
  --name russian-tutor-openai \
  --resource-group russian-tutor-rg \
  --deployment-name gpt-4o \
  --model-name gpt-4o \
  --model-version "2024-05-13" \
  --model-format OpenAI \
  --sku-capacity 10 \
  --sku-name Standard
```

### Create Azure Web App with Functions

```bash
# Create App Service Plan
az appservice plan create \
  --name russian-tutor-plan \
  --resource-group russian-tutor-rg \
  --location eastus \
  --sku B1 \
  --is-linux

# Create Function App for API
az functionapp create \
  --resource-group russian-tutor-rg \
  --consumption-plan-location eastus \
  --runtime node \
  --runtime-version 18 \
  --functions-version 4 \
  --name russian-tutor-api \
  --storage-account russiantutorstorage

# Create Web App for frontend
az webapp create \
  --resource-group russian-tutor-rg \
  --plan russian-tutor-plan \
  --name russian-tutor-app \
  --runtime "NODE|18-lts"
```

## Step 2: Configure Environment Variables

### Get Azure OpenAI credentials

```bash
# Get endpoint
az cognitiveservices account show \
  --name russian-tutor-openai \
  --resource-group russian-tutor-rg \
  --query "properties.endpoint" \
  --output tsv

# Get API key
az cognitiveservices account keys list \
  --name russian-tutor-openai \
  --resource-group russian-tutor-rg \
  --query "key1" \
  --output tsv
```

### Configure Function App settings

```bash
az functionapp config appsettings set \
  --name russian-tutor-api \
  --resource-group russian-tutor-rg \
  --settings \
  AZURE_OPENAI_ENDPOINT="https://russian-tutor-openai.openai.azure.com/" \
  AZURE_OPENAI_API_KEY="your-api-key-here" \
  AZURE_OPENAI_DEPLOYMENT_NAME="gpt-4o" \
  AZURE_OPENAI_API_VERSION="2024-02-15-preview"
```

### Configure Web App settings

```bash
az webapp config appsettings set \
  --name russian-tutor-app \
  --resource-group russian-tutor-rg \
  --settings \
  VITE_AZURE_OPENAI_ENDPOINT="https://russian-tutor-openai.openai.azure.com/" \
  VITE_AZURE_OPENAI_API_KEY="your-api-key-here" \
  VITE_AZURE_OPENAI_DEPLOYMENT_NAME="gpt-4o" \
  VITE_AZURE_OPENAI_API_VERSION="2024-02-15-preview" \
  VITE_API_BASE_URL="https://russian-tutor-api.azurewebsites.net/api"
```

## Step 3: Deploy the Application

### Deploy Function App (API)

The Function App needs the correct structure for Azure deployment. The issue is that Azure Functions expects the function to be in a named directory, not directly in the api folder.

```bash
# Create proper Azure Functions structure
mkdir -p functions-deploy/llm
cp api/llm.js functions-deploy/llm/index.js  
cp api/function.json functions-deploy/llm/function.json
cp host.json functions-deploy/
cp api/package.json functions-deploy/

# Navigate to deployment directory and install dependencies
cd functions-deploy
npm install

# Deploy to Azure Function App
func azure functionapp publish russian-tutor-api --javascript

# Alternative: Deploy using zip deployment
zip -r api-deploy.zip .
az functionapp deployment source config-zip \
  --resource-group russian-tutor-rg \
  --name russian-tutor-api \
  --src api-deploy.zip

cd ..
```

**Important**: The Function App API will be available at:
- `https://russian-tutor-api.azurewebsites.net/api/llm` (not the base URL)

The base URL `https://russian-tutor-api.azurewebsites.net/api` will return a 404 because there's no function at the root level.

### Deploy Web App (Frontend)

```bash
# Build the frontend
npm install
npm run build

# Deploy to Azure Web App
az webapp deployment source config-zip \
  --resource-group russian-tutor-rg \
  --name russian-tutor-app \
  --src dist.zip
```

## Step 4: Configure CORS

Enable CORS for the Function App to allow requests from your Web App:

```bash
az functionapp cors add \
  --name russian-tutor-api \
  --resource-group russian-tutor-rg \
  --allowed-origins "https://russian-tutor-app.azurewebsites.net"
```

## Step 5: Test the Deployment

1. Navigate to `https://russian-tutor-app.azurewebsites.net`
2. Test the API endpoint directly:
   - GET request to `https://russian-tutor-api.azurewebsites.net/api/llm` should return 405 (Method Not Allowed)
   - POST request to `https://russian-tutor-api.azurewebsites.net/api/llm` with JSON body should work
3. Generate a story in the web app to test the full integration
4. Try the comprehension and grammar questions

### API Endpoint Testing

The API has only one endpoint: `/api/llm`

**Correct API URLs:**
- Function App base: `https://russian-tutor-api.azurewebsites.net`
- LLM endpoint: `https://russian-tutor-api.azurewebsites.net/api/llm`

## Deployment Verification Steps

After deploying both the Function App and Web App, verify the deployment:

### 1. Verify Function App Structure
```bash
# Check if the function is deployed correctly
az functionapp function show \
  --resource-group russian-tutor-rg \
  --name russian-tutor-api \
  --function-name llm
```

### 2. Test Function App Endpoints
```bash
# This should return 404 (expected - no function at root)
curl https://russian-tutor-api.azurewebsites.net/api

# This should return 405 Method Not Allowed (function exists but wrong method)
curl https://russian-tutor-api.azurewebsites.net/api/llm

# This should work (POST with proper body)
curl -X POST https://russian-tutor-api.azurewebsites.net/api/llm \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello world", "modelName": "gpt-4o"}'
```

### 3. Check Function App Logs
```bash
# Stream logs to monitor function execution
az functionapp log tail \
  --resource-group russian-tutor-rg \
  --name russian-tutor-api
```

### 4. Verify Web App Configuration
```bash
# Check that environment variables are set
az webapp config appsettings list \
  --resource-group russian-tutor-rg \
  --name russian-tutor-app \
  --query "[?name=='VITE_API_BASE_URL']"
```

The `VITE_API_BASE_URL` should be set to: `https://russian-tutor-api.azurewebsites.net/api`

## Why the Base URL Returns 404

**This is normal Azure Functions behavior**. Azure Functions creates routes like:
- `https://your-app.azurewebsites.net/api/{function-name}`

There is no function at the root `/api` path, so it returns 404. Your functions are available at:
- `https://russian-tutor-api.azurewebsites.net/api/llm`

The application is configured to call the correct endpoint (`/api/llm`), not the base URL.

## Environment Variables Reference

### Function App (API)
- `AZURE_OPENAI_ENDPOINT`: Your Azure OpenAI endpoint URL
- `AZURE_OPENAI_API_KEY`: Your Azure OpenAI API key
- `AZURE_OPENAI_DEPLOYMENT_NAME`: Name of your deployed model (e.g., "gpt-4o")
- `AZURE_OPENAI_API_VERSION`: API version (e.g., "2024-02-15-preview")

### Web App (Frontend)
- `VITE_AZURE_OPENAI_ENDPOINT`: Same as above (for client-side config)
- `VITE_AZURE_OPENAI_API_KEY`: Same as above (for client-side config)
- `VITE_AZURE_OPENAI_DEPLOYMENT_NAME`: Same as above
- `VITE_AZURE_OPENAI_API_VERSION`: Same as above
- `VITE_API_BASE_URL`: URL of your Function App API

## Local Development

For local development, create a `.env` file in the root directory:

```env
VITE_AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
VITE_AZURE_OPENAI_API_KEY=your-api-key-here
VITE_AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o
VITE_AZURE_OPENAI_API_VERSION=2024-02-15-preview
VITE_API_BASE_URL=http://localhost:7071/api
```

Run the Function App locally:
```bash
cd api
func start
```

Run the frontend locally:
```bash
npm run dev
```

## Troubleshooting

### Common Issues

1. **CORS errors**: Make sure CORS is configured on the Function App
2. **API key errors**: Verify environment variables are set correctly
3. **Model not found**: Ensure the deployment name matches your Azure OpenAI model deployment
4. **Build errors**: Check that all dependencies are installed
5. **Web App not displaying**: See [AZURE_TROUBLESHOOTING.md](./AZURE_TROUBLESHOOTING.md) for detailed solutions

### Web App Display Issues

If the Azure Web App shows a blank page or doesn't load properly:

1. Ensure you're using the correct build command: `npm run build:azure`
2. Verify `web.config` is present in the deployment
3. Check that static assets are being served correctly
4. Review the detailed troubleshooting guide: [AZURE_TROUBLESHOOTING.md](./AZURE_TROUBLESHOOTING.md)

### Monitoring

Use Azure Application Insights to monitor your application:

```bash
# Enable Application Insights
az monitor app-insights component create \
  --resource-group russian-tutor-rg \
  --app russian-tutor-insights \
  --location eastus \
  --application-type web
```

## Security Considerations

1. Store sensitive keys in Azure Key Vault
2. Use managed identities instead of API keys where possible
3. Enable HTTPS only on your Web App
4. Configure appropriate CORS origins
5. Monitor API usage and costs

## Cost Optimization

- Use B1 or F1 App Service plans for development/testing
- Monitor Azure OpenAI token usage
- Consider using consumption plans for Function Apps
- Set up billing alerts