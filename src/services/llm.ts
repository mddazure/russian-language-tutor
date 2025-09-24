// LLM service that works with both Spark and Azure OpenAI
import { config, isAzureEnvironment } from '../config'

export interface LLMService {
  llmPrompt: (strings: TemplateStringsArray, ...values: any[]) => string
  llm: (prompt: string, modelName?: string, jsonMode?: boolean) => Promise<string>
}

// Spark LLM service (when running in Spark environment)
const sparkLLMService: LLMService = {
  llmPrompt: (strings: TemplateStringsArray, ...values: any[]): string => {
    return window.spark.llmPrompt(strings, ...values)
  },
  llm: async (prompt: string, modelName?: string, jsonMode?: boolean): Promise<string> => {
    return window.spark.llm(prompt, modelName, jsonMode)
  }
}

// Azure OpenAI service (when running in Azure Web App)
const azureLLMService: LLMService = {
  llmPrompt: (strings: TemplateStringsArray, ...values: any[]): string => {
    // Simple template literal implementation
    return strings.reduce((result, string, i) => {
      return result + string + (values[i] || '')
    }, '')
  },
  llm: async (prompt: string, modelName?: string, jsonMode?: boolean): Promise<string> => {
    try {
      const response = await fetch(`${config.api.baseUrl}/llm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          modelName: modelName || config.azure.deploymentName,
          jsonMode: jsonMode || false
        })
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`)
      }

      const data = await response.json()
      return data.content
    } catch (error) {
      console.error('Azure OpenAI API error:', error)
      throw new Error('Failed to generate response. Please try again.')
    }
  }
}

// Export the appropriate service based on environment
export const llmService: LLMService = isAzureEnvironment() ? azureLLMService : sparkLLMService