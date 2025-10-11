// Configuration for different deployment environments
export const config = {
  // Detect if we're running in Azure Web App or Spark environment
  // In Spark, the global spark object is available; in Azure it's not
  isAzureDeployment: typeof window !== 'undefined' && !(window as any).spark,
  
  // Azure OpenAI configuration (will be set via environment variables)
  azure: {
    endpoint: import.meta.env.VITE_AZURE_OPENAI_ENDPOINT || '',
    apiKey: import.meta.env.VITE_AZURE_OPENAI_API_KEY || '',
    deploymentName: import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o',
    apiVersion: import.meta.env.VITE_AZURE_OPENAI_API_VERSION || '2024-02-15-preview'
  }
}

export const isAzureEnvironment = () => {
  // Check at runtime since window might not be available during SSR
  if (typeof window === 'undefined') return false
  return !(window as any).spark
}