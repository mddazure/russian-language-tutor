# API Testing Guide for Russian Language Tutor

This document provides comprehensive instructions for testing the Russian Language Tutor API using Postman.

## Overview

The Russian Language Tutor application uses Azure OpenAI API for generating Russian stories and practice questions. The main API endpoint handles LLM (Large Language Model) requests for story generation and question creation.

## API Endpoints

### Base URLs
- **Local Development**: `http://localhost:7071/api` (Azure Functions local)
- **Azure Function App**: `https://russian-tutor-api.azurewebsites.net/api`

**Important**: The base URL `/api` will return 404. This is normal for Azure Functions. Only specific function endpoints respond.

### Available Endpoints

#### 1. LLM Generation Endpoint

**Endpoint**: `POST /llm`

**Full URLs**:
- Local: `http://localhost:7071/api/llm`
- Azure: `https://russian-tutor-api.azurewebsites.net/api/llm`

**Description**: Generates Russian stories and practice questions using Azure OpenAI

**Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{
  "prompt": "Your prompt text here",
  "modelName": "gpt-4o",
  "jsonMode": false
}
```

**Response**:
```json
{
  "content": "Generated response content"
}
```

## Postman Collection Setup

### Environment Variables

Create a new environment in Postman with the following variables:

| Variable | Initial Value | Current Value |
|----------|---------------|---------------|
| `baseUrl` | `http://localhost:7071/api` | `https://russian-tutor-api.azurewebsites.net/api` |
| `modelName` | `gpt-4o` | `gpt-4o` |

**Note**: Change `baseUrl` to match your deployment:
- For local testing: `http://localhost:7071/api`
- For Azure testing: `https://russian-tutor-api.azurewebsites.net/api`

### Test Cases

#### Test Case 1: Generate Russian Story

**Request Setup**:
- **Method**: POST
- **URL**: `{{baseUrl}}/llm`
- **Headers**:
  ```
  Content-Type: application/json
  ```

**Body** (raw JSON):
```json
{
  "prompt": "Generate a Russian short story with the following specifications:\n- Theme: Daily Life\n- CEFR Level: B1\n- Length: medium\n\nRequirements:\n- Write entirely in Russian with Cyrillic script\n- Match the vocabulary and grammar complexity to B1 level\n- Include cultural references appropriate for Russian language learners\n- Create an engaging narrative with clear characters and plot\n- Use grammar structures typical for B1 level\n\nReturn the response as JSON with this structure:\n{\n  \"title\": \"Story title in Russian\",\n  \"content\": \"Full story content in Russian\"\n}",
  "modelName": "{{modelName}}",
  "jsonMode": true
}
```

**Expected Response**:
```json
{
  "content": "{\"title\":\"Обычный день в Москве\",\"content\":\"Анна проснулась рано утром...\"}"
}
```

**Tests to Add** (in Postman Tests tab):
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has content field", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('content');
});

pm.test("Content can be parsed as JSON", function () {
    const jsonData = pm.response.json();
    const content = JSON.parse(jsonData.content);
    pm.expect(content).to.have.property('title');
    pm.expect(content).to.have.property('content');
});

pm.test("Response time is less than 30 seconds", function () {
    pm.expect(pm.response.responseTime).to.be.below(30000);
});
```

#### Test Case 2: Generate Comprehension Questions

**Request Setup**:
- **Method**: POST
- **URL**: `{{baseUrl}}/llm`
- **Headers**:
  ```
  Content-Type: application/json
  ```

**Body** (raw JSON):
```json
{
  "prompt": "Based on this Russian story, generate exactly 5 comprehension questions.\n\nStory: Анна проснулась рано утром. Она работает в банке и должна быть там к девяти часам. После завтрака она поехала на работу на автобусе. В банке у неё было много работы - она помогала клиентам с их счетами. Вечером она встретилась с друзьями в кафе, где они обсуждали планы на выходные.\nLevel: B1\n\nGenerate comprehension questions about the story content, characters, plot, and meaning. Questions should test understanding of what happened in the story.\n\nIMPORTANT: Return a JSON object with a single property called \"questions\" that contains an array of exactly 5 question objects. Each question object must have these exact fields:\n\n{\n  \"questions\": [\n    {\n      \"id\": \"unique string like q1, q2, etc\",\n      \"question\": \"the question text in English\", \n      \"options\": [\"option A\", \"option B\", \"option C\", \"option D\"],\n      \"correctAnswer\": \"exact text that matches one of the options above\",\n      \"explanation\": \"detailed explanation of the correct answer\"\n    }\n  ]\n}\n\nReturn ONLY the JSON object, no other text:",
  "modelName": "{{modelName}}",
  "jsonMode": true
}
```

**Tests to Add**:
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response contains questions array", function () {
    const jsonData = pm.response.json();
    const content = JSON.parse(jsonData.content);
    pm.expect(content).to.have.property('questions');
    pm.expect(content.questions).to.be.an('array');
    pm.expect(content.questions).to.have.lengthOf(5);
});

pm.test("Each question has required fields", function () {
    const jsonData = pm.response.json();
    const content = JSON.parse(jsonData.content);
    
    content.questions.forEach((question, index) => {
        pm.expect(question, `Question ${index + 1}`).to.have.property('id');
        pm.expect(question, `Question ${index + 1}`).to.have.property('question');
        pm.expect(question, `Question ${index + 1}`).to.have.property('options');
        pm.expect(question, `Question ${index + 1}`).to.have.property('correctAnswer');
        pm.expect(question, `Question ${index + 1}`).to.have.property('explanation');
        pm.expect(question.options, `Question ${index + 1} options`).to.be.an('array');
        pm.expect(question.options, `Question ${index + 1} options`).to.have.lengthOf(4);
    });
});
```

#### Test Case 3: Generate Grammar Questions

**Request Setup**:
- **Method**: POST
- **URL**: `{{baseUrl}}/llm`

**Body** (raw JSON):
```json
{
  "prompt": "Based on this Russian story, generate exactly 5 grammar questions.\n\nStory: Анна проснулась рано утром. Она работает в банке и должна быть там к девяти часам. После завтрака она поехала на работу на автобусе. В банке у неё было много работы - она помогала клиентам с их счетами. Вечером она встретилась с друзьями в кафе, где они обсуждали планы на выходные.\nLevel: B1\n\nGenerate grammar questions focusing on specific grammar constructs used in this story. Identify grammar patterns, verb forms, case usage, etc. that appear in the text and create questions about them.\n\nIMPORTANT: Return a JSON object with a single property called \"questions\" that contains an array of exactly 5 question objects. Each question object must have these exact fields:\n\n{\n  \"questions\": [\n    {\n      \"id\": \"unique string like q1, q2, etc\",\n      \"question\": \"the question text in English\", \n      \"options\": [\"option A\", \"option B\", \"option C\", \"option D\"],\n      \"correctAnswer\": \"exact text that matches one of the options above\",\n      \"explanation\": \"detailed explanation of the correct answer\"\n    }\n  ]\n}\n\nReturn ONLY the JSON object, no other text:",
  "modelName": "{{modelName}}",
  "jsonMode": true
}
```

#### Test Case 4: Error Handling - Invalid Request

**Request Setup**:
- **Method**: POST
- **URL**: `{{baseUrl}}/llm`

**Body** (raw JSON):
```json
{
  "invalidField": "test"
}
```

**Tests to Add**:
```javascript
pm.test("Status code indicates error", function () {
    pm.expect(pm.response.code).to.be.oneOf([400, 422, 500]);
});

pm.test("Error response has appropriate structure", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('error');
});
```

#### Test Case 5: Different Language Levels

**Request Setup**:
- **Method**: POST
- **URL**: `{{baseUrl}}/llm`

**Body** (raw JSON):
```json
{
  "prompt": "Generate a Russian short story with the following specifications:\n- Theme: Food\n- CEFR Level: A1\n- Length: short\n\nRequirements:\n- Write entirely in Russian with Cyrillic script\n- Match the vocabulary and grammar complexity to A1 level\n- Include cultural references appropriate for Russian language learners\n- Create an engaging narrative with clear characters and plot\n- Use grammar structures typical for A1 level\n\nReturn the response as JSON with this structure:\n{\n  \"title\": \"Story title in Russian\",\n  \"content\": \"Full story content in Russian\"\n}",
  "modelName": "{{modelName}}",
  "jsonMode": true
}
```

## Pre-request Scripts

For authentication or dynamic data generation, you can add these pre-request scripts:

```javascript
// Set timestamp for request tracking
pm.environment.set("timestamp", new Date().toISOString());

// Generate unique request ID
pm.environment.set("requestId", pm.variables.replaceIn('{{$randomUUID}}'));
```

## Common Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid request format",
  "message": "Missing required fields: prompt"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "Failed to process LLM request"
}
```

### 503 Service Unavailable
```json
{
  "error": "Service unavailable",
  "message": "Azure OpenAI service is temporarily unavailable"
}
```

## Performance Testing

### Load Testing Setup

1. Use Postman Collection Runner
2. Set iterations to 10-50 depending on your needs
3. Add delays between requests (1-2 seconds recommended)
4. Monitor response times and error rates

### Key Metrics to Monitor

- **Response Time**: Should be under 30 seconds for story generation
- **Success Rate**: Should be >95% under normal load
- **Content Quality**: Verify generated content meets requirements

## Troubleshooting

### Common Issues

1. **Timeout Errors**: LLM requests can take 10-30 seconds
2. **Invalid JSON**: Check jsonMode parameter and response parsing
3. **Authentication Errors**: Verify Azure OpenAI credentials
4. **Rate Limiting**: Azure OpenAI has request limits

### Debug Tips

1. Enable Postman Console to see detailed request/response logs
2. Check Azure OpenAI service status if requests fail
3. Verify environment variables are set correctly
4. Test with simpler prompts first before complex story generation

## Collection Export

You can export this collection from Postman and share it with your team. The collection includes:

- All test cases described above
- Environment variables
- Pre-request scripts
- Test assertions
- Error handling examples

## Security Considerations

- Never commit API keys to version control
- Use environment variables for sensitive data
- Rotate API keys regularly
- Monitor API usage for unexpected patterns
- Implement rate limiting in production

---

*Note: This documentation assumes the API backend is properly configured with Azure OpenAI. Make sure your environment variables and API endpoints are correctly set up before testing.*