# Migration Guide: From Function App to Self-Contained Architecture

This guide explains how to migrate from the previous Function App architecture to the new simplified self-contained Web App architecture.

## Architecture Changes

### Previous Architecture (Complex)
```
┌─────────────────┐    HTTP     ┌──────────────────┐    Azure OpenAI API
│   Azure Web App │─────────────▶│ Azure Function   │─────────────────────▶
│   (Frontend)    │             │ App (API Proxy)  │
└─────────────────┘             └──────────────────┘
        │
        ▼
┌─────────────────┐
│ Azure Storage   │
│ (Optional)      │
└─────────────────┘
```

### New Architecture (Simplified)
```
┌─────────────────┐    Direct Azure OpenAI API
│   Azure Web App │─────────────────────────────────▶
│ (Self-Contained)│
└─────────────────┘
        │
        ▼ 
┌─────────────────┐
│ Browser         │
│ localStorage    │
└─────────────────┘
```

## Benefits of Migration

1. **Cost Reduction**: Eliminates Function App (~$13-50/month) and Storage Account (~$1-5/month)
2. **Simplified Deployment**: Single deployment instead of coordinating Web App + Function App
3. **Reduced Complexity**: Fewer moving parts, easier maintenance
4. **Better Performance**: Direct API calls instead of proxy layer
5. **Easier Debugging**: All logic in one place

## Migration Steps

### Step 1: Update the Codebase

The codebase has already been updated with:

- **Modified LLM Service** (`src/services/llm.ts`): Now calls Azure OpenAI directly
- **Removed API Dependencies** (`src/config.ts`): No longer needs `VITE_API_BASE_URL`
- **Updated Web Config** (`web.config`): Removed API routing rules

### Step 2: Deploy New Architecture

Use the new simplified deployment script:

```bash
# Make the script executable
chmod +x deploy-azure-simplified.sh

# Run the deployment
./deploy-azure-simplified.sh
```

Or follow the manual steps in `AZURE_DEPLOYMENT_SIMPLIFIED.md`.

### Step 3: Configure CORS

**Critical**: Configure CORS on Azure OpenAI resource:

```bash
# Enable CORS through CLI
az cognitiveservices account update \
  --name russian-tutor-openai \
  --resource-group russian-tutor-rg \
  --custom-domain-cors-enabled true
```

**Or through Azure Portal**:
1. Go to Azure OpenAI Studio
2. Navigate to your resource → Settings → CORS  
3. Add your Web App URL: `https://your-app-name.azurewebsites.net`

### Step 4: Clean Up Old Resources (Optional)

After verifying the new deployment works:

```bash
# Remove the old Function App
az functionapp delete \
  --name russian-tutor-api \
  --resource-group russian-tutor-rg

# Remove storage account if it was used
az storage account delete \
  --name your-storage-account \
  --resource-group russian-tutor-rg
```

## Environment Variables Changes

### Before (Function App Architecture)
```bash
# Web App needed API endpoint
VITE_API_BASE_URL=https://russian-tutor-api.azurewebsites.net/api

# Function App needed these
AZURE_OPENAI_ENDPOINT=...
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_DEPLOYMENT_NAME=...
AZURE_OPENAI_API_VERSION=...
```

### After (Simplified Architecture)
```bash
# Web App needs direct Azure OpenAI access
VITE_AZURE_OPENAI_ENDPOINT=...
VITE_AZURE_OPENAI_API_KEY=...
VITE_AZURE_OPENAI_DEPLOYMENT_NAME=...
VITE_AZURE_OPENAI_API_VERSION=...
```

**Key Changes**:
- Removed: `VITE_API_BASE_URL`
- Added `VITE_` prefix to all Azure OpenAI variables (client-side access)

## Testing the Migration

### 1. Functional Testing
- ✅ Generate a Russian story
- ✅ Create comprehension questions
- ✅ Create grammar questions  
- ✅ Complete a quiz and see results
- ✅ Refresh page and verify data persists

### 2. Network Testing
Open browser DevTools → Network tab:
- ✅ Should see direct calls to `*.openai.azure.com`
- ❌ Should NOT see calls to Function App endpoints

### 3. Error Handling
Test with invalid configuration:
- Clear environment variables temporarily
- Verify proper error messages appear

## Troubleshooting Common Issues

### CORS Errors
**Problem**: Browser blocks requests to Azure OpenAI
```
Access to fetch at 'https://your-resource.openai.azure.com/...' from origin 'https://your-app.azurewebsites.net' has been blocked by CORS policy
```

**Solution**: Configure CORS on Azure OpenAI resource (see Step 3 above)

### Authentication Errors
**Problem**: 401 Unauthorized errors
```
Authentication failed - please check your API key
```

**Solutions**:
1. Verify `VITE_AZURE_OPENAI_API_KEY` is set correctly
2. Check API key hasn't expired or been regenerated
3. Ensure the key has proper permissions

### Model Not Found Errors  
**Problem**: 404 errors when calling Azure OpenAI
```
Azure OpenAI resource or deployment not found
```

**Solutions**:
1. Verify `VITE_AZURE_OPENAI_DEPLOYMENT_NAME` matches your model deployment
2. Check the deployment is active and has available capacity
3. Verify the endpoint URL is correct

### Environment Variables Not Loading
**Problem**: Configuration values are empty or undefined

**Solutions**:
1. Ensure environment variables are set in Azure Web App settings
2. Rebuild and redeploy after changing environment variables
3. Use Azure Portal to verify app settings are correctly configured

## Rollback Plan

If you need to rollback to the Function App architecture:

1. **Keep the old deployment files**:
   - `api/` directory
   - `functions-deploy/` directory
   - Original `AZURE_DEPLOYMENT.md`

2. **Redeploy Function App**:
   ```bash
   # Redeploy the Function App
   cd functions-deploy
   func azure functionapp publish russian-tutor-api
   ```

3. **Update Web App settings**:
   ```bash
   az webapp config appsettings set \
     --name russian-tutor-app \
     --resource-group russian-tutor-rg \
     --settings \
     VITE_API_BASE_URL="https://russian-tutor-api.azurewebsites.net/api"
   ```

4. **Revert code changes**: Use git to revert to the previous version

## Security Considerations

### API Key Exposure
⚠️ **Important**: In the new architecture, the Azure OpenAI API key is embedded in the client-side JavaScript bundle.

**Mitigation strategies**:
1. **Monitor usage**: Set up Azure OpenAI usage alerts
2. **Rate limiting**: Configure rate limits on Azure OpenAI
3. **Key rotation**: Regularly rotate API keys
4. **Network restrictions**: Use Azure networking features if available

### Alternative Secure Approach
If client-side API key exposure is unacceptable:
1. Create a minimal API proxy within the same Web App
2. Use server-side rendering with Azure OpenAI calls
3. Implement Azure Managed Identity for authentication

## Performance Comparison

| Metric | Function App | Self-Contained | Improvement |
|--------|-------------|----------------|-------------|
| **Response Time** | ~500-800ms | ~300-500ms | 30-40% faster |
| **Cold Start** | 2-5 seconds | None | Eliminated |
| **Deployment Time** | 3-5 minutes | 1-2 minutes | 50% faster |
| **Monthly Cost** | ~$30-70 | ~$13-20 | 50-70% cheaper |

## Post-Migration Checklist

- [ ] New deployment successfully completed
- [ ] CORS configured on Azure OpenAI
- [ ] All stories generate correctly
- [ ] Questions work for both comprehension and grammar
- [ ] Quiz scoring functions properly
- [ ] Data persists across browser sessions
- [ ] No console errors in browser DevTools
- [ ] Old Function App resources cleaned up (optional)
- [ ] Team notified of new architecture
- [ ] Documentation updated

## Support

If you encounter issues during migration:
1. Check the troubleshooting section above
2. Review Azure Web App logs: `az webapp log tail --name your-app --resource-group your-rg`
3. Check browser console for JavaScript errors
4. Verify all environment variables are set correctly in Azure Portal