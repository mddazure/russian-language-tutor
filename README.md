# Russian Language Tutor

An intelligent Russian language learning application that generates personalized stories and interactive exercises using AI.

## Features

- **AI-Generated Stories**: Creates Russian stories tailored to your CEFR level (A1-C2)
- **Comprehension Questions**: Tests your understanding of story content
- **Grammar Practice**: Interactive exercises focusing on grammar constructs from the stories
- **Progress Tracking**: Detailed quiz results with explanations
- **Dual Deployment**: Works both as a GitHub Spark and self-contained Azure Web App

## Deployment Options

### Option 1: GitHub Spark (Recommended for Development)

This application works out-of-the-box in the GitHub Spark environment with built-in LLM capabilities.

1. The app automatically uses GitHub Spark's LLM service
2. Data is persisted using Spark's key-value storage
3. No additional configuration required

### Option 2: Self-Contained Azure Web App

**New Simplified Architecture**: Deploy as a single Azure Web App that directly calls Azure OpenAI (no Function App required).

#### Quick Setup

1. **Prerequisites**:
   - Azure subscription
   - Azure OpenAI resource with GPT-4o deployment
   - Azure CLI installed

2. **One-Command Deployment**:
   ```bash
   # Make script executable and deploy
   chmod +x deploy-azure-simplified.sh
   ./deploy-azure-simplified.sh
   ```

3. **Manual Environment Setup** (alternative):
   Create a `.env` file with your Azure OpenAI credentials:
   ```env
   VITE_AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
   VITE_AZURE_OPENAI_API_KEY=your-api-key-here
   VITE_AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o
   VITE_AZURE_OPENAI_API_VERSION=2024-02-15-preview
   ```

For detailed Azure deployment instructions, see [AZURE_DEPLOYMENT_SIMPLIFIED.md](./AZURE_DEPLOYMENT_SIMPLIFIED.md).

**Migration from Function App**: If you're migrating from the old Function App architecture, see [MIGRATION_TO_SIMPLIFIED.md](./MIGRATION_TO_SIMPLIFIED.md).

## Development

### Local Development (Spark Environment)

```bash
npm install
npm run dev
```

The application will automatically detect the Spark environment and use the built-in LLM services.

### Local Development (Azure Mode)

To test Azure OpenAI integration locally:

1. Configure environment variables in `.env`
2. Start the development server:
   ```bash
   npm run dev
   ```
3. The app will make direct calls to Azure OpenAI from the browser

## Architecture

## Architecture

### Spark Mode
- Uses `window.spark.llm()` for AI generation
- Uses `useKV()` hook for data persistence
- No backend API required

### Azure Mode (Simplified)
- **Direct Azure OpenAI Integration**: Frontend calls Azure OpenAI REST API directly
- **Browser localStorage**: Local data persistence without external storage
- **Single Azure Web App**: No Function App or Storage Account required
- **Simplified Deployment**: One-command deployment script

The application automatically detects the environment and switches between modes seamlessly.

## Technology Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui
- **Icons**: Phosphor Icons
- **Notifications**: Sonner
- **Backend (Azure)**: Direct Azure OpenAI API calls
- **Storage**: GitHub Spark KV / Browser localStorage

## Benefits of Simplified Architecture

### Cost Savings
- **Eliminated**: Azure Function App (~$13-50/month)
- **Eliminated**: Azure Storage Account (~$1-5/month)  
- **Remaining**: Single Azure Web App (~$13/month) + Azure OpenAI usage

### Operational Benefits
- Simpler deployment and maintenance
- Fewer moving parts and potential failure points
- Direct browser-to-Azure OpenAI communication
- Single deployment instead of coordinating multiple services

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test in both Spark and Azure environments
5. Submit a pull request

## License

MIT License - see LICENSE file for details.