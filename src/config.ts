// Configuration for different deployment environments
export const config = {
  // Detect if we're running in Azure Web App or Spark environment
  isAzureDeployment: typeof window !== 'undefined' && !window.spark,
  
  // Azure OpenAI configuration (will be set via environment variables)
  azure: {
    endpoint: import.meta.env.VITE_AZURE_OPENAI_ENDPOINT || '',
    apiKey: import.meta.env.VITE_AZURE_OPENAI_API_KEY || '',
    deploymentName: import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o',
    apiVersion: import.meta.env.VITE_AZURE_OPENAI_API_VERSION || '2024-02-15-preview'
  }
}

export const isAzureEnvironment = () => config.isAzureDeployment