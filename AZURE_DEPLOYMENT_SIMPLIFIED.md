# Azure Web App Deployment Guide (Self-Contained)

This guide explains how to deploy the Russian Language Tutor application as a **self-contained Azure Web App** that directly calls Azure OpenAI without requiring Azure Functions or Azure Storage.

## Architecture Overview

**New Simplified Architecture:**
- **Single Azure Web App**: Hosts the React frontend
- **Direct Azure OpenAI Integration**: Frontend calls Azure OpenAI REST API directly
- **Local Storage**: Uses browser localStorage for data persistence
- **No Azure Functions**: Eliminated the need for a separate API layer
- **No Azure Storage**: No external storage dependencies

**Benefits of This Architecture:**
- Simpler deployment and maintenance
- Reduced Azure costs (no Function App or Storage Account)
- Fewer moving parts and potential failure points
- Direct browser-to-Azure OpenAI communication

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

### Create Azure Web App

```bash
# Create App Service Plan
az appservice plan create \
  --name russian-tutor-plan \
  --resource-group russian-tutor-rg \
  --location eastus \
  --sku B1 \
  --is-linux

# Create Web App for the complete application
az webapp create \
  --resource-group russian-tutor-rg \
  --plan russian-tutor-plan \
  --name russian-tutor-app \
  --runtime "NODE|18-lts"
```

## Step 2: Configure Azure OpenAI CORS

**Important**: Since the frontend will call Azure OpenAI directly from the browser, you need to configure CORS on the Azure OpenAI resource.

```bash
# Enable CORS for your Web App domain
az cognitiveservices account update \
  --name russian-tutor-openai \
  --resource-group russian-tutor-rg \
  --custom-domain-cors-enabled true
```

**Note**: You may also need to configure CORS through the Azure Portal:
1. Go to Azure OpenAI Studio → Your resource → Settings → CORS
2. Add your Web App URL: `https://russian-tutor-app.azurewebsites.net`
3. For development, you can temporarily add `*` but use specific domains in production

## Step 3: Get Azure OpenAI Credentials

```bash
# Get endpoint
AZURE_OPENAI_ENDPOINT=$(az cognitiveservices account show \
  --name russian-tutor-openai \
  --resource-group russian-tutor-rg \
  --query "properties.endpoint" \
  --output tsv)

# Get API key
AZURE_OPENAI_API_KEY=$(az cognitiveservices account keys list \
  --name russian-tutor-openai \
  --resource-group russian-tutor-rg \
  --query "key1" \
  --output tsv)

echo "Endpoint: $AZURE_OPENAI_ENDPOINT"
echo "API Key: $AZURE_OPENAI_API_KEY"
```

## Step 4: Configure Web App Environment Variables

```bash
az webapp config appsettings set \
  --name russian-tutor-app \
  --resource-group russian-tutor-rg \
  --settings \
  VITE_AZURE_OPENAI_ENDPOINT="$AZURE_OPENAI_ENDPOINT" \
  VITE_AZURE_OPENAI_API_KEY="$AZURE_OPENAI_API_KEY" \
  VITE_AZURE_OPENAI_DEPLOYMENT_NAME="gpt-4o" \
  VITE_AZURE_OPENAI_API_VERSION="2024-02-15-preview"
```

## Step 5: Build and Deploy the Application

### Local Build

```bash
# Install dependencies
npm install

# Build the application with environment variables
npm run build
```

### Create Deployment Package

```bash
# Create deployment package including web.config for proper routing
cd dist
cp ../web.config .
zip -r ../dist.zip .
cd ..
```

### Deploy to Azure Web App

```bash
# Deploy using zip deployment
az webapp deployment source config-zip \
  --resource-group russian-tutor-rg \
  --name russian-tutor-app \
  --src dist.zip
```

## Step 6: Test the Deployment

1. **Access the Web App**: Navigate to `https://russian-tutor-app.azurewebsites.net`
2. **Test Story Generation**: 
   - Select a theme and proficiency level
   - Click "Generate Story"
   - Verify the story is generated successfully
3. **Test Questions**: 
   - Generate comprehension or grammar questions
   - Complete the quiz and verify scoring works
4. **Test Data Persistence**: 
   - Generate a story, refresh the page
   - Verify the story is still there (localStorage persistence)

## Configuration Reference

### Environment Variables

The application requires these environment variables to be set in the Azure Web App:

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_AZURE_OPENAI_ENDPOINT` | Your Azure OpenAI endpoint URL | `https://your-resource.openai.azure.com/` |
| `VITE_AZURE_OPENAI_API_KEY` | Your Azure OpenAI API key | `abc123...` |
| `VITE_AZURE_OPENAI_DEPLOYMENT_NAME` | Name of your deployed model | `gpt-4o` |
| `VITE_AZURE_OPENAI_API_VERSION` | Azure OpenAI API version | `2024-02-15-preview` |

### Local Development

For local development, create a `.env` file in the root directory:

```env
VITE_AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
VITE_AZURE_OPENAI_API_KEY=your-api-key-here
VITE_AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o
VITE_AZURE_OPENAI_API_VERSION=2024-02-15-preview
```

Then run:
```bash
npm run dev
```

## Security Considerations

### API Key Security
- **Client-side exposure**: The API key will be visible in the browser since it's embedded in the built JavaScript
- **Recommendation for production**: 
  - Use Azure Managed Identity if possible
  - Implement rate limiting on Azure OpenAI
  - Monitor API usage closely
  - Consider implementing a simple API proxy if security is a major concern

### Alternative Secure Architecture (Optional)
If you need to keep the API key server-side, you could:
1. Create a minimal Node.js API within the same Web App
2. Use Azure App Service's built-in Node.js support to serve both frontend and a simple API endpoint
3. This would be more complex but keeps credentials server-side

## Monitoring and Troubleshooting

### Enable Application Insights

```bash
# Create Application Insights
az monitor app-insights component create \
  --resource-group russian-tutor-rg \
  --app russian-tutor-insights \
  --location eastus \
  --application-type web

# Get instrumentation key
INSTRUMENTATION_KEY=$(az monitor app-insights component show \
  --resource-group russian-tutor-rg \
  --app russian-tutor-insights \
  --query "instrumentationKey" \
  --output tsv)

# Configure Web App to use Application Insights
az webapp config appsettings set \
  --name russian-tutor-app \
  --resource-group russian-tutor-rg \
  --settings \
  APPINSIGHTS_INSTRUMENTATIONKEY="$INSTRUMENTATION_KEY"
```

### View Logs

```bash
# Stream Web App logs
az webapp log tail \
  --resource-group russian-tutor-rg \
  --name russian-tutor-app

# Download log files
az webapp log download \
  --resource-group russian-tutor-rg \
  --name russian-tutor-app
```

## Cost Optimization

**Cost Savings with New Architecture:**
- **Eliminated**: Azure Function App (~$13-50/month)
- **Eliminated**: Azure Storage Account (~$1-5/month)
- **Remaining**: 
  - Azure Web App B1 (~$13/month)
  - Azure OpenAI (pay-per-use)

**Additional Optimizations:**
- Use F1 (Free) tier for development/testing
- Monitor Azure OpenAI token usage
- Set up billing alerts

## Migration from Function App Architecture

If you're migrating from the previous Function App architecture:

1. **Keep the same Azure OpenAI resource** - no changes needed
2. **Remove the Function App** - no longer needed
3. **Update Web App environment variables** - remove `VITE_API_BASE_URL`
4. **Redeploy the Web App** with the updated code
5. **Test thoroughly** to ensure direct Azure OpenAI calls work

## Comparison: Old vs New Architecture

| Aspect | Old (Function App) | New (Self-Contained) |
|--------|-------------------|---------------------|
| **Components** | Web App + Function App + Storage | Web App only |
| **API Layer** | Azure Functions | Direct Azure OpenAI calls |
| **Data Storage** | Azure Storage / Spark KV | Browser localStorage |
| **CORS** | Handled by Function App | Configured on Azure OpenAI |
| **Security** | API key server-side | API key client-side |
| **Deployment** | Two deployments | Single deployment |
| **Cost** | Higher (multiple services) | Lower (single service) |
| **Maintenance** | More complex | Simpler |

This simplified architecture is perfect for applications like this language tutor where:
- The API requirements are simple (just LLM calls)
- Data storage needs are minimal (user preferences, current session)
- Reduced complexity and cost are priorities
- Direct Azure OpenAI integration is acceptable