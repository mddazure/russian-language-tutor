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

## Manual Deployment Steps

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