// Azure Functions API for LLM requests
const { AzureOpenAI } = require('openai')

module.exports = async function (context, req) {
  // CORS headers
  context.res.headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  }

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    context.res.status = 200
    return
  }

  if (req.method !== 'POST') {
    context.res.status = 405
    context.res.body = { error: 'Method not allowed' }
    return
  }

  try {
    const { prompt, modelName = 'gpt-4o', jsonMode = false } = req.body

    if (!prompt) {
      context.res.status = 400
      context.res.body = { error: 'Prompt is required' }
      return
    }

    // Log environment variables for debugging (without exposing sensitive data)
    context.log('Environment check:', {
      hasEndpoint: !!process.env.AZURE_OPENAI_ENDPOINT,
      hasApiKey: !!process.env.AZURE_OPENAI_API_KEY,
      hasDeploymentName: !!process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
      apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview',
      endpoint: process.env.AZURE_OPENAI_ENDPOINT ? `${process.env.AZURE_OPENAI_ENDPOINT.substring(0, 20)}...` : 'undefined'
    })

    // Check required environment variables
    if (!process.env.AZURE_OPENAI_ENDPOINT) {
      context.res.status = 500
      context.res.body = { error: 'AZURE_OPENAI_ENDPOINT environment variable is not set' }
      return
    }

    if (!process.env.AZURE_OPENAI_API_KEY) {
      context.res.status = 500
      context.res.body = { error: 'AZURE_OPENAI_API_KEY environment variable is not set' }
      return
    }

    if (!process.env.AZURE_OPENAI_DEPLOYMENT_NAME) {
      context.res.status = 500
      context.res.body = { error: 'AZURE_OPENAI_DEPLOYMENT_NAME environment variable is not set' }
      return
    }

    // Initialize Azure OpenAI client
    const client = new AzureOpenAI({
      endpoint: process.env.AZURE_OPENAI_ENDPOINT,
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview'
    })

    const messages = [
      {
        role: 'user',
        content: prompt
      }
    ]

    const requestOptions = {
      model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || modelName,
      messages: messages,
      max_tokens: 4000,
      temperature: 0.7
    }

    // Add JSON mode if requested
    if (jsonMode) {
      requestOptions.response_format = { type: 'json_object' }
    }

    const completion = await client.chat.completions.create(requestOptions)

    const content = completion.choices[0]?.message?.content || ''

    context.res.status = 200
    context.res.body = { content }

  } catch (error) {
    context.log.error('Azure OpenAI API error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      status: error.status,
      code: error.code
    })
    
    // Provide more specific error messages
    let errorMessage = 'Internal server error'
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      errorMessage = 'Authentication failed - check API key'
    } else if (error.message.includes('404') || error.message.includes('Not Found')) {
      errorMessage = 'Azure OpenAI resource or deployment not found'
    } else if (error.message.includes('429') || error.message.includes('rate limit')) {
      errorMessage = 'Rate limit exceeded - please try again later'
    } else if (error.message.includes('quota')) {
      errorMessage = 'API quota exceeded'
    }
    
    context.res.status = 500
    context.res.body = { 
      error: errorMessage,
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }
  }
}