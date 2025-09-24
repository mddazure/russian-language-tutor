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
    context.log.error('Azure OpenAI API error:', error)
    
    context.res.status = 500
    context.res.body = { 
      error: 'Internal server error',
      message: error.message 
    }
  }
}