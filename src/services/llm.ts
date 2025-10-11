// LLM service that works with both Spark and Azure OpenAI
import { config, isAzureEnvironment } from '../config'

export interface LLMService {
  llmPrompt: (strings: TemplateStringsArray, ...values: any[]) => string
  llm: (prompt: string, modelName?: string, jsonMode?: boolean) => Promise<string>
}

// Spark LLM service (when running in Spark environment)
const sparkLLMService: LLMService = {
  llmPrompt: (strings: TemplateStringsArray, ...values: any[]): string => {
    return window.spark.llmPrompt(strings as any, ...values)
  },
  llm: async (prompt: string, modelName?: string, jsonMode?: boolean): Promise<string> => {
    return window.spark.llm(prompt, modelName, jsonMode)
  }
}

// Direct Azure OpenAI service (calls Azure OpenAI directly from browser)
const azureLLMService: LLMService = {
  llmPrompt: (strings: TemplateStringsArray, ...values: any[]): string => {
    // Simple template literal implementation
    return strings.reduce((result, string, i) => {
      return result + string + (values[i] || '')
    }, '')
  },
  llm: async (prompt: string, modelName?: string, jsonMode?: boolean): Promise<string> => {
    try {
      if (!config.azure.endpoint || !config.azure.apiKey) {
        throw new Error('Azure OpenAI configuration is missing. Please check your environment variables.')
      }

      // Prepare the request to Azure OpenAI directly
      const messages = [
        {
          role: 'user',
          content: prompt
        }
      ]

      const requestBody: any = {
        messages: messages,
        max_tokens: 4000,
        temperature: 0.7
      }

      // Add JSON mode if requested
      if (jsonMode) {
        requestBody.response_format = { type: 'json_object' }
      }

      const url = `${config.azure.endpoint}/openai/deployments/${config.azure.deploymentName || modelName || 'gpt-4o'}/chat/completions?api-version=${config.azure.apiVersion}`

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': config.azure.apiKey
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Azure OpenAI error response:', errorText)
        
        if (response.status === 401) {
          throw new Error('Authentication failed - please check your API key')
        } else if (response.status === 404) {
          throw new Error('Azure OpenAI resource or deployment not found')
        } else if (response.status === 429) {
          throw new Error('Rate limit exceeded - please try again later')
        } else {
          throw new Error(`Azure OpenAI API request failed: ${response.statusText}`)
        }
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content || ''
      
      if (!content) {
        throw new Error('No response content received from Azure OpenAI')
      }

      return content
    } catch (error) {
      console.error('Azure OpenAI API error:', error)
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Failed to generate response. Please try again.')
    }
  }
}

// Export the appropriate service based on environment
export const llmService: LLMService = (() => {
  const isAzure = isAzureEnvironment()
  console.log('Environment detection:', {
    isAzure,
    hasSparkGlobal: typeof window !== 'undefined' && !!(window as any).spark,
    azureConfig: isAzure ? config.azure : 'N/A'
  })
  return isAzure ? azureLLMService : sparkLLMService
})()