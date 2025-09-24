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

```bash
# Build and deploy functions
cd api
npm install
func azure functionapp publish russian-tutor-api
```

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
2. Generate a story to test the integration
3. Try the comprehension and grammar questions

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