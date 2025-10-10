# Azure Web App Troubleshooting Guide

## Common Issues and Solutions

### Issue: Azure Web App not displaying index.html

**Symptoms:**
- Azure Web App shows a blank page or error
- Static assets not loading
- Client-side routing not working

**Solutions:**

#### 1. Ensure Proper Build Configuration
Make sure you're using the correct build command:
```bash
npm run build:azure
```

This command:
- Builds the React app with Vite
- Copies the web.config to the dist folder

#### 2. Verify web.config is Present
The `dist/web.config` file should contain:
- Default document configuration pointing to `index.html`
- URL rewrite rules for SPA routing
- Static file MIME type mappings
- Proper asset handling rules

#### 3. Check Deployment Script
The `.deployment` file should point to `deploy.sh`, which:
- Runs `npm run build:azure`
- Copies all files from `dist/` to `$DEPLOYMENT_TARGET/`
- Installs API dependencies

#### 4. Verify File Structure
After deployment, the Azure Web App root should contain:
```
/wwwroot/
  ├── index.html
  ├── web.config
  ├── assets/
  │   ├── index-[hash].js
  │   └── index-[hash].css
  └── api/
      └── (API files)
```

### Issue: API Base URL Returns 404

**Symptoms:**
- `https://your-function-app.azurewebsites.net/api` returns 404
- Base API URL doesn't respond

**Explanation:**
This is normal Azure Functions behavior. Azure Functions only respond to specific function endpoints, not the base `/api` path.

**Solutions:**
1. **Use the specific function endpoint:**
   - Instead of: `https://russian-tutor-api.azurewebsites.net/api`
   - Use: `https://russian-tutor-api.azurewebsites.net/api/llm`

2. **Test the correct endpoint:**
   ```bash
   # This will return 404 (expected)
   curl https://russian-tutor-api.azurewebsites.net/api
   
   # This will return 405 Method Not Allowed (correct - function exists)
   curl https://russian-tutor-api.azurewebsites.net/api/llm
   
   # This will work (POST request)
   curl -X POST https://russian-tutor-api.azurewebsites.net/api/llm \
     -H "Content-Type: application/json" \
     -d '{"prompt": "Hello", "modelName": "gpt-4o"}'
   ```

3. **Verify Function App Structure:**
   Your Function App should have this structure:
   ```
   /
   ├── host.json
   ├── package.json
   └── llm/
       ├── index.js (main function code)
       └── function.json (function configuration)
   ```

### Issue: Function App Deployment Structure

**Problem:**
The api folder structure doesn't match Azure Functions requirements.

**Solution:**
Use the deployment script or manually restructure:

```bash
# Create proper structure
mkdir -p functions-deploy/llm
cp api/llm.js functions-deploy/llm/index.js  
cp api/function.json functions-deploy/llm/function.json
cp host.json functions-deploy/
cp api/package.json functions-deploy/

# Deploy from functions-deploy directory
cd functions-deploy
func azure functionapp publish russian-tutor-api --javascript
```

### Issue: API Returns 500 Error

**Symptoms:**
- LLM API endpoint returns 500 Internal Server Error
- Error message: "Internal server error"

**Most Common Cause:**
Missing Azure OpenAI environment variables in Function App configuration.

**Solution:**
1. **Set Required Environment Variables in Azure Function App:**
   - Go to Azure Portal → Your Function App → Configuration → Application settings
   - Add these variables:
     ```
     AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
     AZURE_OPENAI_API_KEY=[your-32-character-key]
     AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o
     AZURE_OPENAI_API_VERSION=2024-02-15-preview
     ```

2. **Restart Function App** after adding environment variables

3. **Test the API** with proper error handling:
   ```bash
   curl -X POST https://russian-tutor-api.azurewebsites.net/api/llm \
     -H "Content-Type: application/json" \
     -d '{"prompt": "test"}'
   ```

4. **Check Function App logs** for specific error messages

### Issue: API Endpoints Not Working

**Solution:**
- Ensure API functions are in the `/api` folder
- Verify `host.json` configuration
- Check that `local.settings.json` contains required environment variables

### Issue: Environment Variables Not Loading

**Solution:**
- Set environment variables in Azure Web App Configuration
- For OpenAI: Set `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_DEPLOYMENT_NAME`
- Restart the Web App after setting variables

### Debugging Steps

1. **Check Application Logs:**
   - Go to Azure Portal > Your Web App > Monitoring > App Service logs
   - Enable Application logging and Detailed error messages

2. **Test Local Build:**
   ```bash
   npm run build:azure
   npm run preview
   ```

3. **Verify Static Files:**
   - Navigate to your Azure Web App URL + `/assets/index-[hash].js`
   - Should return the JavaScript bundle

4. **Check API Endpoints:**
   - Test API endpoints directly: `https://your-app.azurewebsites.net/api/generate`

### Performance Optimization

1. **Enable Compression:**
   - Already configured in web.config
   - Reduces bundle sizes

2. **Cache Static Assets:**
   - Static assets cached for 1 year
   - Configured in web.config

3. **CDN Integration:**
   - Consider Azure CDN for global distribution
   - Configure custom domain if needed

### Security Headers

The web.config includes security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`

### Issue: Function App Storage Account Requirements

**Problem:**
Function Apps typically require an Azure Storage Account for state management, but your deployment scenario doesn't allow storage account access with storage keys.

**Solution:**
The Function App is configured to run without requiring Azure Storage Account access:

1. **Configuration Changes Made:**
   - `host.json`: Updated to use extension bundle version 4.x which supports storage-less deployment
   - `local.settings.json`: Uses `AzureWebJobsStorage__accountName=""` instead of connection string
   - Function App created without `--storage-account` parameter

2. **Environment Variable Setup:**
   ```bash
   az functionapp config appsettings set \
     --name russian-tutor-api \
     --resource-group russian-tutor-rg \
     --settings \
     AzureWebJobsStorage__accountName=""
   ```

3. **Limitations:**
   - Function app will have limited state persistence capabilities
   - Some advanced Azure Functions features that depend on storage may not be available
   - For this LLM API use case, these limitations don't affect functionality

**Manual Deployment Steps**

If automatic deployment fails:

1. Build locally:
   ```bash
   npm run build:azure
   ```

2. Upload `dist/` contents to Azure Web App via:
   - FTP
   - Azure CLI
   - VS Code Azure extension
   - GitHub Actions

3. Ensure `web.config` is in the root directory of the Web App.