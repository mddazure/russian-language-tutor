# API 500 Error Troubleshooting Guide

## Problem: LLM API Endpoint Returns 500 Error

The API endpoint `https://russian-tutor-api.azurewebsites.net/api/llm` is returning a 500 Internal Server Error. This guide provides systematic troubleshooting steps.

## Most Likely Causes

### 1. Missing Environment Variables

The Azure Function requires these environment variables to be set in the Function App configuration:

**Required Variables:**
- `AZURE_OPENAI_ENDPOINT` - Your Azure OpenAI service endpoint (e.g., `https://your-resource.openai.azure.com/`)
- `AZURE_OPENAI_API_KEY` - API key for your Azure OpenAI service
- `AZURE_OPENAI_DEPLOYMENT_NAME` - Name of your deployed model (e.g., `gpt-4o`)

**Optional Variables:**
- `AZURE_OPENAI_API_VERSION` - API version (defaults to `2024-02-15-preview`)

### 2. Incorrect Azure OpenAI Configuration

Common configuration issues:
- Endpoint URL format is wrong
- Deployment name doesn't match the actual deployment
- API key is expired or invalid
- Azure OpenAI resource is in wrong region

## Troubleshooting Steps

### Step 1: Check Function App Environment Variables

1. Go to Azure Portal → Your Function App → Configuration → Application settings
2. Verify these variables exist and have correct values:
   ```
   AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
   AZURE_OPENAI_API_KEY=[your-32-character-key]
   AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o
   AZURE_OPENAI_API_VERSION=2024-02-15-preview
   ```

### Step 2: Test Environment Variables

Use this test endpoint to verify configuration:

```bash
# Test if environment variables are properly set
curl -X POST https://russian-tutor-api.azurewebsites.net/api/llm \
  -H "Content-Type: application/json" \
  -d '{"prompt": "test"}'
```

The improved error handling will now return specific messages like:
- `AZURE_OPENAI_ENDPOINT environment variable is not set`
- `AZURE_OPENAI_API_KEY environment variable is not set`
- `AZURE_OPENAI_DEPLOYMENT_NAME environment variable is not set`

### Step 3: Check Azure OpenAI Resource

1. Go to Azure Portal → Your Azure OpenAI resource
2. Verify the resource is running and accessible
3. Check deployments:
   - Go to Model deployments
   - Verify a model is deployed with the correct name
   - Note the deployment name exactly (case-sensitive)

### Step 4: Test Azure OpenAI Connection

Use the Azure OpenAI Studio or direct API call to test:

```bash
# Test direct API call to Azure OpenAI
curl -X POST "https://your-resource.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2024-02-15-preview" \
  -H "Content-Type: application/json" \
  -H "api-key: YOUR_API_KEY" \
  -d '{
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 100
  }'
```

### Step 5: Check Function App Logs

1. Go to Azure Portal → Your Function App → Monitoring → Live metrics
2. Or go to Monitoring → Logs
3. Look for detailed error messages in the logs

The updated function now logs:
```javascript
{
  hasEndpoint: true/false,
  hasApiKey: true/false,
  hasDeploymentName: true/false,
  apiVersion: "2024-02-15-preview",
  endpoint: "https://your-resource..."
}
```

### Step 6: Redeploy Function with Updated Code

The function has been updated with better error handling. Redeploy:

```bash
cd functions-deploy
func azure functionapp publish russian-tutor-api --javascript
```

## Common Error Messages and Solutions

### "Authentication failed - check API key"
- **Cause**: Invalid or expired API key
- **Solution**: Get new API key from Azure Portal → Azure OpenAI → Keys and Endpoint

### "Azure OpenAI resource or deployment not found"
- **Cause**: Wrong endpoint URL or deployment name
- **Solution**: Verify endpoint format and deployment name in Azure Portal

### "Rate limit exceeded"
- **Cause**: Too many requests
- **Solution**: Wait and try again, or upgrade Azure OpenAI tier

### "API quota exceeded"
- **Cause**: Reached usage limits
- **Solution**: Check usage in Azure Portal, may need to upgrade plan

## Testing the Fixed API

Use Postman or curl to test:

```bash
curl -X POST https://russian-tutor-api.azurewebsites.net/api/llm \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Write a short sentence in Russian",
    "modelName": "gpt-4o",
    "jsonMode": false
  }'
```

Expected successful response:
```json
{
  "content": "Привет, как дела?"
}
```

## Environment Variable Setup Script

If setting up new Azure resources, use these Azure CLI commands:

```bash
# Set environment variables in Function App
az functionapp config appsettings set \
  --name russian-tutor-api \
  --resource-group your-resource-group \
  --settings \
    AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com/" \
    AZURE_OPENAI_API_KEY="your-32-character-key" \
    AZURE_OPENAI_DEPLOYMENT_NAME="gpt-4o" \
    AZURE_OPENAI_API_VERSION="2024-02-15-preview"
```

## Next Steps

1. Set the required environment variables
2. Redeploy the function with the updated error handling
3. Test the API endpoint
4. Check Function App logs for specific error details
5. Verify Azure OpenAI resource is properly configured

The improved error handling will help identify the specific cause of the 500 error.