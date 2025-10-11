# Russian Language Tutor

An intelligent Russian language learning application that generates personalized stories and interactive exercises using AI.

## Features

- **AI-Generated Stories**: Creates Russian stories tailored to your CEFR level (A1-C2)
- **Comprehension Questions**: Tests your understanding of story content
- **Grammar Practice**: Interactive exercises focusing on grammar constructs from the stories
- **Progress Tracking**: Detailed quiz results with explanations
- **Dual Deployment**: Works both as a GitHub Spark and Azure Web App

## Deployment Options

### Option 1: GitHub Spark (Recommended for Development)

This application works out-of-the-box in the GitHub Spark environment with built-in LLM capabilities.

1. The app automatically uses GitHub Spark's LLM service
2. Data is persisted using Spark's key-value storage
3. No additional configuration required

### Option 2: Azure Web App with Azure OpenAI

For production deployment, you can deploy this as an Azure Web App with Azure OpenAI integration.

#### Quick Setup

1. **Prerequisites**:
   - Azure subscription
   - Azure OpenAI resource with GPT-4o deployment
   - Azure CLI installed

2. **Environment Setup**:
   Create a `.env` file with your Azure OpenAI credentials:
   ```env
   VITE_AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
   VITE_AZURE_OPENAI_API_KEY=your-api-key-here
   VITE_AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o
   VITE_AZURE_OPENAI_API_VERSION=2024-02-15-preview
   VITE_API_BASE_URL=/api
   ```

3. **Deploy**:
   ```bash
   npm run build:azure
   ```

For detailed Azure deployment instructions, see [AZURE_DEPLOYMENT_SIMPLIFIED.md](./AZURE_DEPLOYMENT_SIMPLIFIED.md).

#### Quick Deploy to Azure

```bash
# Automated deployment
./deploy-azure-simplified.sh

# Or manual steps
npm run build
./verify-build.sh          # Verify build is correct
./troubleshoot-deployment.sh # Diagnose issues if needed
```

### Troubleshooting Azure Deployment

If your Azure Web App shows the default App Service page instead of your application:

1. **Verify Build**: Run `./verify-build.sh` to ensure build is correct
2. **Check Deployment**: Run `./troubleshoot-deployment.sh` for detailed diagnostics
3. **Manual Verification**: Check Azure Portal > Web App > Advanced Tools > Kudu Console
   - Navigate to `/home/site/wwwroot`
   - Ensure `index.html`, `assets/`, and `web.config` exist

Common issues:
- Missing `web.config` file
- Environment variables not set during build
- Files not deployed to correct directory
- CORS not configured for Azure OpenAI

## Development

### Local Development (Spark Environment)

```bash
npm install
npm run dev
```

The application will automatically detect the Spark environment and use the built-in LLM services.

### Local Development (Azure Mode)

To test Azure OpenAI integration locally:

1. Set up Azure Function Core Tools
2. Configure environment variables
3. Start the API:
   ```bash
   cd api
   func start
   ```
4. Start the frontend:
   ```bash
   npm run dev
   ```

## Architecture

### Spark Mode
- Uses `window.spark.llm()` for AI generation
- Uses `useKV()` hook for data persistence
- No backend API required

### Azure Mode
- Uses Azure OpenAI API via Azure Functions
- Uses localStorage for data persistence
- Requires separate API deployment

The application automatically detects the environment and switches between modes seamlessly.

## Technology Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui
- **Icons**: Phosphor Icons
- **Notifications**: Sonner
- **Backend (Azure)**: Azure Functions, Azure OpenAI
- **Storage**: GitHub Spark KV / localStorage

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test in both Spark and Azure environments
5. Submit a pull request

## License

MIT License - see LICENSE file for details.