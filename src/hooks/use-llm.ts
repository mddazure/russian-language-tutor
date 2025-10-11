import { useCallback } from 'react'
import { isAzureEnvironment, config } from '@/config'

export function useLLM() {
  const generatePrompt = useCallback((strings: TemplateStringsArray, ...values: any[]): string => {
    if (!isAzureEnvironment() && (window as any).spark?.llmPrompt) {
      // Use Spark's llmPrompt if available
      return (window as any).spark.llmPrompt(strings, ...values)
    } else {
      // Simple template literal implementation for Azure
      return strings.reduce((result, string, i) => {
        return result + string + (values[i] || '')
      }, '')
    }
  }, [])

  const callLLM = useCallback(async (prompt: string, modelName?: string, jsonMode?: boolean): Promise<string> => {
    if (!isAzureEnvironment() && (window as any).spark?.llm) {
      // Use Spark's LLM service
      return await (window as any).spark.llm(prompt, modelName, jsonMode)
    } else {
      // Use Azure OpenAI directly
      if (!config.azure.endpoint || !config.azure.apiKey) {
        throw new Error('Azure OpenAI configuration is missing. Please check your environment variables.')
      }

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
    }
  }, [])

  return {
    generatePrompt,
    callLLM
  }
}