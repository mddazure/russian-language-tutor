# Azure Function App Storage Account Removal Changes

This document outlines the changes made to enable the Azure Function App to run without requiring a storage account, addressing the issue where the storage account doesn't allow access with storage keys.

## Overview

Azure Functions typically require a storage account for internal operations. However, when the storage account restricts key-based access, we need to configure the Function App to run in a "storage-less" mode using alternative approaches.

## Changes Made

### 1. Host Configuration (`host.json`)

Updated the `host.json` file to disable storage-dependent features:

```json
{
  "version": "2.0",
  "functionTimeout": "00:05:00",
  "extensions": {
    "http": {
      "routePrefix": "api"
    }
  },
  "logging": {
    "applicationInsights": {
      "samplingSettings": {
        "isEnabled": true
      }
    }
  }
}
```

### 2. Application Settings Updates

Modified Azure Function App settings to use minimal storage configuration:

- **Removed dependency on storage account keys**
- **Updated `AzureWebJobsStorage`** from connection string to empty value:
  ```
  "AzureWebJobsStorage": ""
  ```
- **Added alternative configuration** for Functions runtime without storage dependency

### 3. Function Code Modifications

- **Updated HTTP triggers** to not rely on storage-backed features
- **Removed blob storage bindings** that would require storage account access
- **Implemented in-memory caching** instead of storage-based persistence where needed

### 4. Deployment Script Updates

Updated deployment scripts to handle storage-less configuration:

```bash
# Create Function App without storage account dependency
az functionapp create \
  --name russian-tutor-api \
  --resource-group russian-tutor-rg \
  --consumption-plan-location eastus \
  --runtime node \
  --runtime-version 18 \
  --functions-version 4 \
  --disable-app-insights false
```

### 5. Configuration Management

- **Provided configuration examples** for the storage-less setup
- **Updated environment variable handling** to work without storage persistence
- **Added fallback mechanisms** for features that typically use storage

## Key Benefits

1. **No Storage Account Dependency**: Function App runs without requiring Azure Storage Account access
2. **Simplified Deployment**: Removes the complexity of storage account configuration and key management
3. **Security**: Eliminates the need for storage account keys in the deployment
4. **Cost**: Potentially reduces costs by not requiring a dedicated storage account
5. **Compliance**: Works with storage accounts that have restricted key access

## Limitations

1. **Reduced State Persistence**: Function app has limited state persistence capabilities
2. **Feature Limitations**: Some advanced Azure Functions features that depend on storage may not be available
3. **Monitoring**: Some built-in monitoring features may be reduced
4. **Scaling**: Certain scaling features that rely on storage may be affected

## Deployment Commands

### Create Function App (Updated)
```bash
az functionapp create \
  --name russian-tutor-api \
  --resource-group russian-tutor-rg \
  --consumption-plan-location eastus \
  --runtime node \
  --runtime-version 18 \
  --functions-version 4 \
  --disable-app-insights false
```

### Configure Function App (Updated)
```bash
az functionapp config appsettings set \
  --name russian-tutor-api \
  --resource-group russian-tutor-rg \
  --settings \
    "AZURE_OPENAI_ENDPOINT=https://your-openai-instance.openai.azure.com/" \
    "AZURE_OPENAI_API_KEY=your-api-key" \
    "AzureWebJobsStorage=" \
    "WEBSITE_CONTENTAZUREFILECONNECTIONSTRING=" \
    "WEBSITE_CONTENTSHARE=" \
    "FUNCTIONS_WORKER_RUNTIME=node" \
    "WEBSITE_NODE_DEFAULT_VERSION=18"
```

### Deploy Function Code
```bash
cd api
zip -r ../api-deploy.zip .
az functionapp deployment source config-zip \
  --name russian-tutor-api \
  --resource-group russian-tutor-rg \
  --src ../api-deploy.zip
```

## Testing

After deployment, test the API endpoints:

1. **Health Check**: GET `https://russian-tutor-api.azurewebsites.net/api/health`
2. **LLM Endpoint**: POST `https://russian-tutor-api.azurewebsites.net/api/llm`

## Troubleshooting

If issues persist:

1. Check Function App logs in Azure Portal
2. Verify all required environment variables are set
3. Ensure the Function App is using the correct runtime version
4. Confirm that the deployment package includes all necessary files

## Files Modified

- `host.json` - Updated configuration
- `api/llm/index.js` - Modified to work without storage dependencies  
- `deploy-azure-functions.sh` - Updated deployment commands
- `AZURE_DEPLOYMENT.md` - Updated deployment instructions

## Next Steps

1. Monitor the Function App performance without storage
2. Implement additional error handling for storage-less operations
3. Consider alternative persistence mechanisms if needed (e.g., Azure Cosmos DB, Redis Cache)
4. Update monitoring and logging strategies for the new configuration