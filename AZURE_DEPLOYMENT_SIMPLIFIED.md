# Azure Web App Deployment Guide (Self-Contained)

This guide explains how to deploy the Russian Language Tutor application as a **self-contained Azure Web App** that directly calls Azure OpenAI without requiring Azure Functions or Azure Storage.

## Architecture Overview

**New Simplified Architecture:**
- **Single Azure Web App**: Hosts the React frontend built with Vite
- **Direct Azure OpenAI Integration**: Frontend calls Azure OpenAI REST API directly from the browser
- **Browser Storage**: Uses browser localStorage for data persistence (no server-side storage needed)
- **No Azure Functions**: Eliminated the need for a separate API layer or proxy
- **No Azure Storage**: No external storage dependencies or accounts required

**Benefits of This Architecture:**
- Dramatically simpler deployment and maintenance
- Significant cost reduction (eliminates Function App and Storage Account costs)
- Fewer moving parts and potential failure points  
- Direct browser-to-Azure OpenAI communication with lower latency
- Single deployment artifact and process

## Prerequisites

1. **Azure subscription** with permissions to create resources
2. **Azure CLI installed locally** and authenticated (`az login`)
3. **Node.js 18+** installed for local building
4. **Access to Azure OpenAI** service (may require special approval)

## Important Notes Before Starting

- **API Key Security**: This architecture exposes the Azure OpenAI API key in the client-side JavaScript bundle
- **CORS Configuration**: You must configure CORS on your Azure OpenAI resource to allow browser requests
- **Cost Considerations**: Monitor Azure OpenAI usage as it's pay-per-use
- **Rate Limits**: Configure appropriate rate limits on Azure OpenAI to prevent abuse

## Step 1: Create Azure Resources

### 1.1 Create Resource Group and Azure OpenAI Resource

```bash
# Set variables for consistent naming
RESOURCE_GROUP="russian-tutor-rg"
LOCATION="eastus"
OPENAI_RESOURCE="russian-tutor-openai"
WEB_APP_NAME="russian-tutor-app"

# Create resource group
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION

# Create Azure OpenAI resource
az cognitiveservices account create \
  --name $OPENAI_RESOURCE \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --kind OpenAI \
  --sku S0
```

### 1.2 Deploy GPT-4o Model

```bash
# Deploy GPT-4o model (required for the application)
az cognitiveservices account deployment create \
  --name $OPENAI_RESOURCE \
  --resource-group $RESOURCE_GROUP \
  --deployment-name gpt-4o \
  --model-name gpt-4o \
  --model-version "2024-05-13" \
  --model-format OpenAI \
  --sku-capacity 10 \
  --sku-name Standard

# Verify deployment
az cognitiveservices account deployment list \
  --name $OPENAI_RESOURCE \
  --resource-group $RESOURCE_GROUP \
  --output table
```

### 1.3 Create Azure Web App

```bash
# Create App Service Plan (Linux-based for Node.js)
az appservice plan create \
  --name russian-tutor-plan \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku B1 \
  --is-linux

# Create Web App for the complete application
az webapp create \
  --resource-group $RESOURCE_GROUP \
  --plan russian-tutor-plan \
  --name $WEB_APP_NAME \
  --runtime "NODE|18-lts"

# Verify Web App creation
az webapp show \
  --name $WEB_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "{name:name,state:state,hostNames:hostNames}" \
  --output table
```

## Step 2: Configure Azure OpenAI CORS

**Critical Step**: Since the frontend calls Azure OpenAI directly from the browser, you must configure CORS on the Azure OpenAI resource to allow cross-origin requests.

### 2.1 Enable CORS via Azure CLI

```bash
# Method 1: Enable custom domain CORS (if available)
az cognitiveservices account update \
  --name $OPENAI_RESOURCE \
  --resource-group $RESOURCE_GROUP \
  --custom-domain-cors-enabled true
```

### 2.2 Configure CORS via Azure Portal (Recommended)

The CLI method may not always work. Use the Azure Portal for more reliable configuration:

1. **Navigate to Azure OpenAI Studio**:
   - Go to [https://oai.azure.com/](https://oai.azure.com/)
   - Select your subscription and Azure OpenAI resource

2. **Configure CORS Settings**:
   - In the left sidebar, go to **Settings** → **CORS**  
   - Click **Add CORS rule**
   - Add your Web App URL: `https://russian-tutor-app.azurewebsites.net`
   - For development/testing, you can temporarily use `*` but **never use `*` in production**

3. **Verify CORS Configuration**:
   - Ensure the rule shows "Enabled" status
   - Test with a simple browser request to verify CORS headers

### 2.3 Alternative: Configure via REST API

```bash
# Get access token
ACCESS_TOKEN=$(az account get-access-token --query accessToken -o tsv)

# Configure CORS (replace variables with your values)
curl -X PUT \
  "https://management.azure.com/subscriptions/{SUBSCRIPTION_ID}/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.CognitiveServices/accounts/$OPENAI_RESOURCE/corsPolicy?api-version=2023-05-01" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "corsRules": [
      {
        "allowedOrigins": ["https://russian-tutor-app.azurewebsites.net"],
        "allowedMethods": ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS"],
        "allowedHeaders": ["*"],
        "maxAgeInSeconds": 300
      }
    ]
  }'
```

## Step 3: Get Azure OpenAI Credentials

```bash
# Get Azure OpenAI endpoint URL
AZURE_OPENAI_ENDPOINT=$(az cognitiveservices account show \
  --name $OPENAI_RESOURCE \
  --resource-group $RESOURCE_GROUP \
  --query "properties.endpoint" \
  --output tsv)

# Get Azure OpenAI API key
AZURE_OPENAI_API_KEY=$(az cognitiveservices account keys list \
  --name $OPENAI_RESOURCE \
  --resource-group $RESOURCE_GROUP \
  --query "key1" \
  --output tsv)

# Display credentials (for verification)
echo "✅ Azure OpenAI Endpoint: $AZURE_OPENAI_ENDPOINT"
echo "✅ API Key (first 8 chars): ${AZURE_OPENAI_API_KEY:0:8}..."

# Save these values - you'll need them for the next step
echo "VITE_AZURE_OPENAI_ENDPOINT=$AZURE_OPENAI_ENDPOINT" > .env.azure
echo "VITE_AZURE_OPENAI_API_KEY=$AZURE_OPENAI_API_KEY" >> .env.azure
echo "VITE_AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o" >> .env.azure
echo "VITE_AZURE_OPENAI_API_VERSION=2024-02-15-preview" >> .env.azure
```

## Step 4: Configure Web App Environment Variables

The Web App needs these environment variables to connect to Azure OpenAI:

```bash
# Configure all required environment variables in the Web App
az webapp config appsettings set \
  --name $WEB_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings \
    VITE_AZURE_OPENAI_ENDPOINT="$AZURE_OPENAI_ENDPOINT" \
    VITE_AZURE_OPENAI_API_KEY="$AZURE_OPENAI_API_KEY" \
    VITE_AZURE_OPENAI_DEPLOYMENT_NAME="gpt-4o" \
    VITE_AZURE_OPENAI_API_VERSION="2024-02-15-preview" \
    NODE_ENV="production" \
  --output table

# Verify the settings were applied
az webapp config appsettings list \
  --name $WEB_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "[?name=='VITE_AZURE_OPENAI_ENDPOINT'].{Name:name,Value:value}" \
  --output table
```

**Important Notes:**
- The `VITE_` prefix makes these variables available to the Vite build process
- These values will be embedded in the client-side JavaScript bundle
- The API key will be visible to users who inspect the source code

## Step 5: Build and Deploy the Application

### 5.1 Prepare the Local Environment

```bash
# Ensure you're in the project root directory
cd /path/to/russian-language-tutor

# Install all dependencies
npm install

# Optional: Test the build locally with Azure configuration
# Copy the environment variables to a local .env file for testing
cp .env.azure .env

# Test build locally (optional but recommended)
npm run build

# If local build succeeds, proceed with deployment
```

### 5.2 Create Production Build

```bash
# Create the production build with all environment variables
# The build process will embed the VITE_ environment variables
npm run build

# Verify the build output
ls -la dist/
echo "✅ Build completed successfully"
```

### 5.3 Prepare Deployment Package

```bash
# Navigate to the build output directory
cd dist

# Ensure web.config exists for proper IIS routing in Azure
if [ ! -f "web.config" ]; then
  echo "📋 Creating web.config for Azure Web App..."
  cp ../web.config . 2>/dev/null || cat > web.config << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
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

# Create deployment ZIP package
zip -r ../deployment.zip . -x "*.map"
cd ..

echo "📦 Deployment package created: deployment.zip"
```

### 5.4 Deploy to Azure Web App

```bash
# Deploy the application using ZIP deployment
echo "🚀 Deploying to Azure Web App..."

az webapp deployment source config-zip \
  --resource-group $RESOURCE_GROUP \
  --name $WEB_APP_NAME \
  --src deployment.zip

# Wait for deployment to complete and verify
az webapp show \
  --name $WEB_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "{name:name,state:state,defaultHostName:defaultHostName}" \
  --output table

echo "✅ Deployment completed!"
echo "🌐 Your app is available at: https://$WEB_APP_NAME.azurewebsites.net"
```

### 5.5 Automated Deployment Script

Alternatively, you can use the included deployment script:

```bash
# Make the script executable
chmod +x deploy-azure-simplified.sh

# Edit the script to update resource names if needed
nano deploy-azure-simplified.sh

# Run the automated deployment
./deploy-azure-simplified.sh
```

## Step 6: Test the Deployment

### 6.1 Basic Functionality Testing

1. **Access the Web App**: 
   ```bash
   # Open your browser to the Web App URL
   echo "🌐 Open: https://$WEB_APP_NAME.azurewebsites.net"
   ```

2. **Test Story Generation**: 
   - Select a theme (e.g., "Daily Life") and proficiency level (e.g., "B1")
   - Click "Generate Story"
   - Verify a Russian story is generated successfully
   - Check that the story appears in Cyrillic script

3. **Test Question Generation**: 
   - After generating a story, click "Test Comprehension"
   - Verify that 5 comprehension questions are generated
   - Try "Practice Grammar" to test grammar questions
   - Complete a question to verify the feedback system works

4. **Test Quiz Functionality**: 
   - Complete all questions in a quiz
   - Verify the results page shows correct scores
   - Check that explanations are provided for incorrect answers

5. **Test Data Persistence**: 
   - Generate a story and answer some questions
   - Refresh the page or close/reopen the browser tab
   - Verify the story and progress are still there (localStorage persistence)

### 6.2 Network and Performance Testing

Open browser Developer Tools (F12) and check the Network tab:

1. **Verify API Calls**:
   - Should see direct calls to `*.openai.azure.com` domains
   - Should NOT see any calls to Azure Function endpoints
   - Look for successful 200 responses from Azure OpenAI

2. **Check Response Times**:
   - Story generation: typically 3-10 seconds
   - Question generation: typically 5-15 seconds
   - Should be faster than the previous Function App architecture

3. **Monitor for Errors**:
   - Look for any 4xx or 5xx HTTP errors
   - Check browser console for JavaScript errors
   - Verify CORS errors are not present

### 6.3 Error Handling Testing

Test the application's error handling:

1. **Temporarily break configuration**:
   ```bash
   # Temporarily remove API key to test error handling
   az webapp config appsettings set \
     --name $WEB_APP_NAME \
     --resource-group $RESOURCE_GROUP \
     --settings VITE_AZURE_OPENAI_API_KEY=""
   ```

2. **Verify error messages**:
   - Try to generate a story
   - Should see user-friendly error message about configuration
   - Check browser console for detailed error information

3. **Restore configuration**:
   ```bash
   # Restore the API key
   az webapp config appsettings set \
     --name $WEB_APP_NAME \
     --resource-group $RESOURCE_GROUP \
     --settings VITE_AZURE_OPENAI_API_KEY="$AZURE_OPENAI_API_KEY"
   ```

## Troubleshooting Common Issues

### Issue 1: CORS Errors

**Problem**: Browser console shows CORS policy errors:
```
Access to fetch at 'https://your-resource.openai.azure.com/...' from origin 'https://your-app.azurewebsites.net' has been blocked by CORS policy
```

**Solutions**:
1. **Verify CORS Configuration**:
   - Go to Azure OpenAI Studio → Settings → CORS
   - Ensure your Web App URL is listed
   - Try adding both `https://` and `http://` versions

2. **Check URL Format**:
   - Ensure no trailing slashes in CORS origins
   - Use exact URL: `https://russian-tutor-app.azurewebsites.net`

3. **Temporary Debugging**:
   - Add `*` as origin for testing (NEVER in production)
   - If `*` works, the issue is CORS configuration

### Issue 2: Authentication Failures

**Problem**: API calls return 401 Unauthorized errors:
```
Authentication failed - please check your API key
```

**Solutions**:
1. **Verify API Key**:
   ```bash
   # Check if API key is set correctly
   az webapp config appsettings list \
     --name $WEB_APP_NAME \
     --resource-group $RESOURCE_GROUP \
     --query "[?name=='VITE_AZURE_OPENAI_API_KEY']"
   ```

2. **Regenerate API Key**:
   ```bash
   # Generate new API key
   az cognitiveservices account keys regenerate \
     --name $OPENAI_RESOURCE \
     --resource-group $RESOURCE_GROUP \
     --key-name key1
   
   # Update Web App with new key
   NEW_KEY=$(az cognitiveservices account keys list \
     --name $OPENAI_RESOURCE \
     --resource-group $RESOURCE_GROUP \
     --query "key1" -o tsv)
   
   az webapp config appsettings set \
     --name $WEB_APP_NAME \
     --resource-group $RESOURCE_GROUP \
     --settings VITE_AZURE_OPENAI_API_KEY="$NEW_KEY"
   ```

### Issue 3: Model Deployment Not Found

**Problem**: 404 errors with message "deployment not found":
```
Azure OpenAI resource or deployment not found
```

**Solutions**:
1. **Verify Model Deployment**:
   ```bash
   # List all deployments
   az cognitiveservices account deployment list \
     --name $OPENAI_RESOURCE \
     --resource-group $RESOURCE_GROUP \
     --output table
   ```

2. **Check Deployment Name**:
   - Ensure `VITE_AZURE_OPENAI_DEPLOYMENT_NAME` matches exactly
   - Common names: `gpt-4o`, `gpt-4`, `gpt-35-turbo`

3. **Check Model Status**:
   - Verify deployment status is "Succeeded"  
   - Ensure deployment has available capacity

### Issue 4: Environment Variables Not Loading

**Problem**: Application shows configuration errors or variables appear as `undefined`

**Solutions**:
1. **Verify Build Process**:
   - Environment variables must be set BEFORE building
   - Redeploy after changing any `VITE_` variables

2. **Check Variable Names**:
   - Must start with `VITE_` to be available in browser
   - Case sensitive: `VITE_AZURE_OPENAI_ENDPOINT`

3. **Rebuild and Redeploy**:
   ```bash
   # After changing environment variables, rebuild
   npm run build
   cd dist
   zip -r ../deployment.zip .
   cd ..
   
   az webapp deployment source config-zip \
     --resource-group $RESOURCE_GROUP \
     --name $WEB_APP_NAME \
     --src deployment.zip
   ```

### Issue 5: Slow Performance

**Problem**: Story or question generation takes too long

**Solutions**:
1. **Check Azure OpenAI Quotas**:
   - Verify you haven't hit rate limits
   - Check quota usage in Azure Portal

2. **Optimize Model Settings**:
   - Reduce `max_tokens` if responses are too long
   - Adjust `temperature` for faster responses

3. **Monitor Azure OpenAI Metrics**:
   ```bash
   # Check Azure OpenAI usage and performance
   az monitor metrics list \
     --resource /subscriptions/{subscription}/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.CognitiveServices/accounts/$OPENAI_RESOURCE \
     --metric "TotalTokens" \
     --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
     --end-time $(date -u +%Y-%m-%dT%H:%M:%S)
   ```

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

### API Key Exposure Risk

⚠️ **Critical Security Note**: In this simplified architecture, the Azure OpenAI API key is embedded in the client-side JavaScript bundle and visible to anyone who inspects the source code.

**Risk Assessment:**
- **High Risk**: API key can be extracted and used by malicious actors
- **Medium Risk**: Potential for API abuse and unexpected charges
- **Low Risk**: No access to other Azure resources (only OpenAI API calls)

### Mitigation Strategies

1. **Monitor API Usage**:
   ```bash
   # Set up billing alerts
   az monitor action-group create \
     --name billing-alerts \
     --resource-group $RESOURCE_GROUP \
     --short-name billing
   
   # Create budget alert (adjust amount as needed)
   az consumption budget create \
     --budget-name openai-budget \
     --amount 100 \
     --resource-group $RESOURCE_GROUP \
     --time-grain Monthly
   ```

2. **Configure Rate Limiting**:
   - Set quotas on your Azure OpenAI deployment
   - Monitor requests per minute/hour in Azure Portal
   - Set up alerts for unusual usage patterns

3. **API Key Rotation**:
   ```bash
   # Regularly rotate API keys (recommended monthly)
   az cognitiveservices account keys regenerate \
     --name $OPENAI_RESOURCE \
     --resource-group $RESOURCE_GROUP \
     --key-name key1
   ```

4. **Network-Level Protection**:
   - Consider using Azure Private Endpoints for production
   - Implement Azure Front Door or CDN for additional security layers
   - Use Azure Application Gateway with Web Application Firewall

### Alternative Secure Architecture (Recommended for Production)

For production deployments requiring better security:

```bash
# Option 1: Add a simple Express.js proxy to the same Web App
# This keeps the API key server-side while maintaining simplicity

# Option 2: Use Azure API Management
az apim create \
  --name russian-tutor-apim \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --publisher-email admin@yourdomain.com \
  --publisher-name "Your Organization"

# Option 3: Implement Azure Managed Identity
az webapp identity assign \
  --name $WEB_APP_NAME \
  --resource-group $RESOURCE_GROUP

# Grant the managed identity access to Azure OpenAI
az role assignment create \
  --assignee $(az webapp identity show --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP --query principalId -o tsv) \
  --role "Cognitive Services OpenAI User" \
  --scope /subscriptions/{subscription}/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.CognitiveServices/accounts/$OPENAI_RESOURCE
```

## Monitoring and Maintenance

### 1. Enable Application Insights

Application Insights provides comprehensive monitoring for your Web App:

```bash
# Create Application Insights resource
az monitor app-insights component create \
  --resource-group $RESOURCE_GROUP \
  --app russian-tutor-insights \
  --location $LOCATION \
  --application-type web

# Get instrumentation key
INSTRUMENTATION_KEY=$(az monitor app-insights component show \
  --resource-group $RESOURCE_GROUP \
  --app russian-tutor-insights \
  --query "instrumentationKey" \
  --output tsv)

# Configure Web App to use Application Insights
az webapp config appsettings set \
  --name $WEB_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings \
    APPINSIGHTS_INSTRUMENTATIONKEY="$INSTRUMENTATION_KEY" \
    ApplicationInsightsAgent_EXTENSION_VERSION="~3"

echo "✅ Application Insights configured"
echo "📊 View metrics at: https://portal.azure.com/#resource/subscriptions/{subscription}/resourceGroups/$RESOURCE_GROUP/providers/microsoft.insights/components/russian-tutor-insights"
```

### 2. Configure Logging and Monitoring

```bash
# Enable Web App logging
az webapp log config \
  --name $WEB_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --web-server-logging filesystem \
  --level verbose

# Enable detailed error messages
az webapp config set \
  --name $WEB_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --detailed-error-logging-enabled true

# Enable failed request tracing
az webapp config set \
  --name $WEB_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --failed-request-tracing-enabled true
```

### 3. View and Stream Logs

```bash
# Stream live logs from the Web App
az webapp log tail \
  --resource-group $RESOURCE_GROUP \
  --name $WEB_APP_NAME

# Download log files for offline analysis
az webapp log download \
  --resource-group $RESOURCE_GROUP \
  --name $WEB_APP_NAME \
  --log-file logs.zip

# View specific log files
az webapp log show \
  --resource-group $RESOURCE_GROUP \
  --name $WEB_APP_NAME
```

### 4. Set Up Alerts and Notifications

```bash
# Create action group for notifications
az monitor action-group create \
  --resource-group $RESOURCE_GROUP \
  --name webapp-alerts \
  --short-name webapp \
  --email admin your-email@domain.com

# Create alert for high error rate
az monitor metrics alert create \
  --name "High Error Rate" \
  --resource-group $RESOURCE_GROUP \
  --scopes /subscriptions/{subscription}/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Web/sites/$WEB_APP_NAME \
  --condition "avg Http5xx > 10" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action webapp-alerts

# Create alert for Azure OpenAI quota usage
az monitor metrics alert create \
  --name "OpenAI Quota Alert" \
  --resource-group $RESOURCE_GROUP \
  --scopes /subscriptions/{subscription}/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.CognitiveServices/accounts/$OPENAI_RESOURCE \
  --condition "total TotalTokens > 50000" \
  --window-size 1h \
  --evaluation-frequency 5m \
  --action webapp-alerts
```

### 5. Performance Monitoring

Track key metrics for your application:

**Web App Metrics to Monitor:**
- Response time (aim for <2 seconds)
- Error rate (keep below 1%)
- CPU and memory usage
- Request count and patterns

**Azure OpenAI Metrics to Monitor:**
- Total tokens consumed
- Requests per minute
- Response time
- Error rate

```bash
# Query Web App performance metrics
az monitor metrics list \
  --resource /subscriptions/{subscription}/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Web/sites/$WEB_APP_NAME \
  --metric AverageResponseTime \
  --start-time $(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --interval 1h

# Query Azure OpenAI usage metrics  
az monitor metrics list \
  --resource /subscriptions/{subscription}/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.CognitiveServices/accounts/$OPENAI_RESOURCE \
  --metric TotalTokens \
  --start-time $(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --interval 1h
```

### 6. Regular Maintenance Tasks

Create a maintenance checklist for weekly/monthly tasks:

**Weekly Tasks:**
- [ ] Review Application Insights dashboards
- [ ] Check error logs for any new issues  
- [ ] Monitor Azure OpenAI usage and costs
- [ ] Verify CORS settings are still correct
- [ ] Test core functionality (story generation, quizzes)

**Monthly Tasks:**
- [ ] Rotate Azure OpenAI API keys
- [ ] Review and optimize Azure OpenAI quotas
- [ ] Update dependencies (`npm audit` and `npm update`)
- [ ] Review cost optimization opportunities
- [ ] Backup configuration and deployment scripts

**Quarterly Tasks:**
- [ ] Security review and penetration testing
- [ ] Performance optimization analysis
- [ ] User feedback review and feature planning
- [ ] Disaster recovery plan testing

## Cost Optimization

This simplified architecture provides significant cost savings compared to the previous Function App approach:

### Cost Breakdown

**Eliminated Costs (Previous Architecture):**
- Azure Function App: ~$13-50/month (depending on usage)
- Azure Storage Account: ~$1-5/month
- Additional networking costs for inter-service communication

**Remaining Costs (New Architecture):**
- **Azure Web App (B1 tier)**: ~$13/month (fixed)
- **Azure OpenAI**: Pay-per-use based on tokens consumed
  - Typical usage: $5-20/month for moderate use
  - Heavy usage: $50-200/month depending on story generation frequency

### Cost Optimization Strategies

1. **Web App Tier Optimization**:
   ```bash
   # Use F1 (Free) tier for development/testing
   az appservice plan update \
     --name russian-tutor-plan \
     --resource-group $RESOURCE_GROUP \
     --sku F1
   
   # Scale back to B1 for production
   az appservice plan update \
     --name russian-tutor-plan \
     --resource-group $RESOURCE_GROUP \
     --sku B1
   ```

2. **Azure OpenAI Usage Optimization**:
   - Set appropriate `max_tokens` limits in API calls
   - Implement client-side caching for repeated requests
   - Use lower-cost models when appropriate (gpt-3.5-turbo vs gpt-4o)
   - Monitor and set quotas to prevent unexpected usage spikes

3. **Resource Management**:
   ```bash
   # Set up auto-shutdown for development environments
   az webapp config appsettings set \
     --name $WEB_APP_NAME \
     --resource-group $RESOURCE_GROUP \
     --settings \
       WEBSITE_TIME_ZONE="UTC" \
       WEBSITE_HTTPLOGGING_RETENTION_DAYS="3"
   
   # Enable compression to reduce bandwidth costs
   az webapp config set \
     --name $WEB_APP_NAME \
     --resource-group $RESOURCE_GROUP \
     --use-32bit-worker-process false \
     --http20-enabled true
   ```

4. **Billing Alerts**:
   ```bash
   # Create budget alerts to monitor costs
   az consumption budget create \
     --budget-name russian-tutor-budget \
     --amount 50 \
     --category Cost \
     --time-grain Monthly \
     --resource-group $RESOURCE_GROUP
   ```

### Expected Monthly Costs

| Component | Development | Production | Enterprise |
|-----------|-------------|------------|------------|
| **Web App** | Free (F1) | $13 (B1) | $56 (S1) |
| **Azure OpenAI** | $5-10 | $15-30 | $50-150 |
| **Application Insights** | Free | $0-5 | $5-20 |
| **Total** | $5-10 | $28-48 | $111-226 |

**Comparison to Previous Architecture:**
- **50-70% cost reduction** for most use cases
- **Simpler billing** with fewer line items
- **More predictable costs** due to fewer variables

## Migration from Function App Architecture

If you're migrating from the previous Function App architecture, follow these steps:

### Pre-Migration Checklist

- [ ] **Backup current configuration**: Export Web App settings and Function App code
- [ ] **Document current setup**: Note all resource names and configurations
- [ ] **Test new architecture locally**: Verify the simplified architecture works in development
- [ ] **Plan downtime**: Minimal downtime expected (5-15 minutes)

### Migration Steps

1. **Keep the same Azure OpenAI resource** - No changes needed to your existing Azure OpenAI resource or model deployments

2. **Update Web App environment variables**:
   ```bash
   # Remove old variables
   az webapp config appsettings delete \
     --name $WEB_APP_NAME \
     --resource-group $RESOURCE_GROUP \
     --setting-names VITE_API_BASE_URL
   
   # Add new variables (use your existing OpenAI resource)
   AZURE_OPENAI_ENDPOINT=$(az cognitiveservices account show \
     --name $OPENAI_RESOURCE \
     --resource-group $RESOURCE_GROUP \
     --query "properties.endpoint" -o tsv)
   
   AZURE_OPENAI_API_KEY=$(az cognitiveservices account keys list \
     --name $OPENAI_RESOURCE \
     --resource-group $RESOURCE_GROUP \
     --query "key1" -o tsv)
   
   az webapp config appsettings set \
     --name $WEB_APP_NAME \
     --resource-group $RESOURCE_GROUP \
     --settings \
       VITE_AZURE_OPENAI_ENDPOINT="$AZURE_OPENAI_ENDPOINT" \
       VITE_AZURE_OPENAI_API_KEY="$AZURE_OPENAI_API_KEY" \
       VITE_AZURE_OPENAI_DEPLOYMENT_NAME="gpt-4o" \
       VITE_AZURE_OPENAI_API_VERSION="2024-02-15-preview"
   ```

3. **Configure CORS on Azure OpenAI** (Critical step - see Step 2 above)

4. **Redeploy the Web App** with the updated code using Step 5 above

5. **Test thoroughly** using the testing procedures in Step 6

6. **Clean up old resources** (optional but recommended for cost savings):
   ```bash
   # List Function Apps to confirm names
   az functionapp list --resource-group $RESOURCE_GROUP --output table
   
   # Delete the old Function App
   az functionapp delete \
     --name russian-tutor-api \
     --resource-group $RESOURCE_GROUP
   
   # Delete storage account if it was only used by the Function App
   az storage account delete \
     --name yourstorageaccount \
     --resource-group $RESOURCE_GROUP
   ```

### Post-Migration Verification

After migration, verify that:
- [ ] Stories generate correctly
- [ ] Questions work for both comprehension and grammar types
- [ ] Quiz scoring functions properly  
- [ ] Data persists across browser sessions
- [ ] No console errors appear in browser DevTools
- [ ] Response times are equal or better than before
- [ ] Cost monitoring shows reduced monthly expenses

### Rollback Plan

If issues arise, you can rollback by:
1. Redeploying the old Function App from backup
2. Restoring the previous Web App environment variables
3. Using git to revert code changes

Keep the old deployment files until you're confident the migration is successful.

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

## Quick Reference

### Essential Commands

```bash
# Set variables (customize these values)
RESOURCE_GROUP="russian-tutor-rg"
OPENAI_RESOURCE="russian-tutor-openai"  
WEB_APP_NAME="russian-tutor-app"

# Build and deploy in one command
npm install && npm run build
cd dist && zip -r ../deployment.zip . && cd ..
az webapp deployment source config-zip \
  --resource-group $RESOURCE_GROUP \
  --name $WEB_APP_NAME \
  --src deployment.zip

# Stream logs for debugging
az webapp log tail --resource-group $RESOURCE_GROUP --name $WEB_APP_NAME

# Check environment variables
az webapp config appsettings list --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP

# Restart Web App
az webapp restart --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP
```

### Important URLs

- **Your Web App**: `https://{WEB_APP_NAME}.azurewebsites.net`
- **Azure Portal**: `https://portal.azure.com`
- **Azure OpenAI Studio**: `https://oai.azure.com`
- **Application Insights**: Available in Azure Portal under your resource group

### Support and Resources

- **Azure Documentation**: [Azure App Service](https://docs.microsoft.com/en-us/azure/app-service/)
- **Azure OpenAI Documentation**: [Azure OpenAI Service](https://docs.microsoft.com/en-us/azure/cognitive-services/openai/)
- **Troubleshooting**: See the troubleshooting section above for common issues
- **Cost Monitoring**: Use Azure Cost Management in the portal
- **Performance Monitoring**: Application Insights provides detailed metrics

### Best Practices Summary

1. **Security**:
   - Rotate API keys regularly
   - Monitor usage and set alerts  
   - Configure CORS correctly
   - Never use `*` for CORS in production

2. **Performance**:
   - Monitor response times and error rates
   - Set appropriate Azure OpenAI quotas
   - Use Application Insights for detailed monitoring
   - Test thoroughly after any changes

3. **Cost Management**:
   - Set up billing alerts
   - Use appropriate App Service tiers
   - Monitor Azure OpenAI token usage
   - Clean up unused resources

4. **Maintenance**:
   - Keep dependencies updated
   - Review logs regularly
   - Test disaster recovery procedures
   - Document any customizations

---

## Summary

This simplified Azure deployment architecture provides:

✅ **Reduced Complexity**: Single Web App instead of multiple services  
✅ **Lower Costs**: 50-70% cost reduction compared to Function App architecture  
✅ **Better Performance**: Direct API calls with reduced latency  
✅ **Easier Maintenance**: Fewer moving parts and deployment steps  
✅ **Simplified Monitoring**: All activity in one Web App  

The Russian Language Tutor application is now deployed as a self-contained web application that directly integrates with Azure OpenAI, providing an efficient and cost-effective solution for AI-powered language learning.

For questions or issues with this deployment, refer to the troubleshooting section or check the application logs through Azure Portal.