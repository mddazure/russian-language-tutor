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

// Debug function to help troubleshoot configuration issues
export const debugConfig = () => {
  console.log('🔧 Configuration Debug Info:', {
    isAzureEnvironment: isAzureEnvironment(),
    hasSparkGlobal: typeof window !== 'undefined' && !!(window as any).spark,
    azureConfig: {
      hasEndpoint: !!config.azure.endpoint,
      hasApiKey: !!config.azure.apiKey,
      endpoint: config.azure.endpoint ? `${config.azure.endpoint.substring(0, 30)}...` : 'Not set',
      deploymentName: config.azure.deploymentName,
      apiVersion: config.azure.apiVersion
    },
    envVars: {
      VITE_AZURE_OPENAI_ENDPOINT: import.meta.env.VITE_AZURE_OPENAI_ENDPOINT ? 'Set' : 'Not set',
      VITE_AZURE_OPENAI_API_KEY: import.meta.env.VITE_AZURE_OPENAI_API_KEY ? 'Set' : 'Not set',
      VITE_AZURE_OPENAI_DEPLOYMENT_NAME: import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT_NAME || 'Using default',
      VITE_AZURE_OPENAI_API_VERSION: import.meta.env.VITE_AZURE_OPENAI_API_VERSION || 'Using default'
    }
  })
}