# Deployment Guide

This guide covers different ways to deploy the Russian Language Tutor application for public access.

## 🚀 GitHub Pages (Recommended for Public Deployment)

GitHub Pages is the easiest way to make your app publicly accessible to all GitHub users.

### Automatic Deployment

The repository is already configured for automatic GitHub Pages deployment:

1. **Fork the Repository**
   - Go to the repository page
   - Click "Fork" to create your own copy

2. **Enable GitHub Pages**
   - Go to your fork's Settings
   - Navigate to "Pages" in the sidebar
   - Under "Source", select "Deploy from a branch"
   - Choose `gh-pages` branch
   - Click "Save"

3. **Wait for Deployment**
   - The GitHub Action will automatically build and deploy
   - Your app will be available at: `https://your-username.github.io/russian-language-tutor`

### Manual Deployment

If you want to deploy manually:

```bash
# Build the application
npm run build

# Deploy to gh-pages branch
npm install -g gh-pages
gh-pages -d dist
```

## 🔧 Custom Domain (Optional)

To use a custom domain with GitHub Pages:

1. **Add CNAME File**
   ```bash
   echo "your-domain.com" > dist/CNAME
   ```

2. **Configure DNS**
   - Add a CNAME record pointing to `your-username.github.io`

3. **Update Repository Settings**
   - Go to Settings > Pages
   - Add your custom domain
   - Enable "Enforce HTTPS"

## ☁️ Azure Web App with Azure OpenAI

For enterprise deployment with Azure OpenAI integration:

### Prerequisites

- Azure subscription
- Azure CLI installed
- Azure OpenAI resource with GPT-4o deployment

### Setup Steps

1. **Create Azure Resources**
   ```bash
   # Create resource group
   az group create --name rg-russian-tutor --location eastus

   # Create App Service plan
   az appservice plan create --name plan-russian-tutor --resource-group rg-russian-tutor --sku B1 --is-linux

   # Create web app
   az webapp create --name russian-language-tutor --resource-group rg-russian-tutor --plan plan-russian-tutor --runtime "NODE:18-lts"
   ```

2. **Configure Environment Variables**
   ```bash
   az webapp config appsettings set --name russian-language-tutor --resource-group rg-russian-tutor --settings \
     VITE_AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com/" \
     VITE_AZURE_OPENAI_DEPLOYMENT_NAME="gpt-4o" \
     VITE_AZURE_OPENAI_API_VERSION="2024-02-15-preview" \
     VITE_API_BASE_URL="/api"
   ```

3. **Deploy Application**
   ```bash
   # Build for Azure
   npm run build:azure

   # Deploy using Azure CLI
   az webapp deploy --name russian-language-tutor --resource-group rg-russian-tutor --src-path ./dist.zip --type zip
   ```

For detailed Azure setup, see [AZURE_DEPLOYMENT.md](./AZURE_DEPLOYMENT.md).

## 🐳 Docker Deployment

Deploy using Docker for any cloud provider:

### Create Dockerfile

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Build and Run

```bash
# Build image
docker build -t russian-language-tutor .

# Run container
docker run -p 80:80 russian-language-tutor
```

## 🌐 Netlify Deployment

Deploy to Netlify for global CDN distribution:

1. **Connect Repository**
   - Go to Netlify dashboard
   - Click "New site from Git"
   - Connect your GitHub repository

2. **Configure Build Settings**
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node version: `18`

3. **Deploy**
   - Netlify will automatically build and deploy
   - Get your site URL from the dashboard

## 📊 Vercel Deployment

Deploy to Vercel for serverless deployment:

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy**
   ```bash
   vercel --prod
   ```

3. **Configure**
   - Follow the prompts to connect your GitHub account
   - Vercel will automatically detect the build settings

## 🔐 Environment Configuration

### GitHub Spark Environment
- No configuration needed
- Uses built-in LLM services
- Persistent storage included

### Azure Environment
Required environment variables:
```env
VITE_AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
VITE_AZURE_OPENAI_API_KEY=your-api-key-here
VITE_AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o
VITE_AZURE_OPENAI_API_VERSION=2024-02-15-preview
VITE_API_BASE_URL=/api
```

## 📈 Monitoring and Analytics

### GitHub Pages Analytics
- Use Google Analytics by adding tracking code to `index.html`
- Monitor usage with GitHub repository insights

### Azure Application Insights
```bash
# Enable Application Insights
az webapp config appsettings set --name russian-language-tutor --resource-group rg-russian-tutor --settings \
  APPINSIGHTS_INSTRUMENTATIONKEY="your-instrumentation-key"
```

## 🚨 Troubleshooting

### Common Issues

1. **Build Failures**
   - Check Node.js version (requires 18+)
   - Verify all dependencies are installed
   - Check for TypeScript errors

2. **GitHub Pages 404 Errors**
   - Ensure `gh-pages` branch exists
   - Check if GitHub Pages is enabled in settings
   - Verify the base path configuration

3. **Azure Deployment Issues**
   - Check Azure OpenAI resource is properly configured
   - Verify environment variables are set
   - Check App Service logs for errors

### Getting Help

- Check the [Issues](https://github.com/your-username/russian-language-tutor/issues) page
- Create a new issue with deployment details
- Join the [Discussions](https://github.com/your-username/russian-language-tutor/discussions) for community help

## 🔄 Continuous Deployment

The repository includes GitHub Actions for automatic deployment:

- **GitHub Pages**: Deploys on every push to `main`
- **Azure**: Configure using the provided workflow
- **Multi-environment**: Set up staging and production branches

## 📝 Post-Deployment Checklist

After deployment, verify:

- [ ] Application loads correctly
- [ ] Story generation works
- [ ] Question generation functions properly
- [ ] Quiz scoring calculates correctly
- [ ] Data persistence works
- [ ] Mobile interface is responsive
- [ ] All links and navigation work

Your Russian Language Tutor app is now ready for users worldwide! 🎉