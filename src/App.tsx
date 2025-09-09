import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { BookOpen, HelpCircle, Languages, RefreshCw, CheckCircle, XCircle } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useKV } from '@github/spark/hooks'

interface Story {
  title: string
  content: string
  level: string
  theme: string
  length: string
}

interface Question {
  id: string
  type: 'comprehension' | 'grammar'
  question: string
  options?: string[]
  correctAnswer: string
  explanation: string
}

const LEVELS = [
  { value: 'A1', label: 'A1 - Beginner' },
  { value: 'A2', label: 'A2 - Elementary' },
  { value: 'B1', label: 'B1 - Intermediate' },
  { value: 'B2', label: 'B2 - Upper Intermediate' },
  { value: 'C1', label: 'C1 - Advanced' },
  { value: 'C2', label: 'C2 - Proficient' }
]

const THEMES = [
  'Daily Life', 'Travel', 'Food', 'Family', 'Work', 'Hobbies', 'Nature', 
  'History', 'Culture', 'Technology', 'Sports', 'Art', 'Science'
]

const LENGTHS = [
  { value: 'short', label: 'Short (150-200 words)' },
  { value: 'medium', label: 'Medium (300-400 words)' },
  { value: 'long', label: 'Long (500-600 words)' }
]

function App() {
  const [currentStory, setCurrentStory] = useKV<Story | null>('current-story', null)
  const [selectedLevel, setSelectedLevel] = useState('B1')
  const [selectedTheme, setSelectedTheme] = useState('')
  const [selectedLength, setSelectedLength] = useState('medium')
  const [isGenerating, setIsGenerating] = useState(false)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState('')
  const [showFeedback, setShowFeedback] = useState(false)
  const [questionType, setQuestionType] = useState<'comprehension' | 'grammar' | null>(null)
  const [userAnswers, setUserAnswers] = useKV<Record<string, string>>('user-answers', {})
  const [debugOutput, setDebugOutput] = useState<string>('')

  const generateStory = async () => {
    if (!selectedTheme) {
      toast.error('Please select a theme')
      return
    }

    setIsGenerating(true)
    try {
      const prompt = spark.llmPrompt`Generate a Russian short story with the following specifications:
      - Theme: ${selectedTheme}
      - CEFR Level: ${selectedLevel}
      - Length: ${selectedLength}
      
      Requirements:
      - Write entirely in Russian with Cyrillic script
      - Match the vocabulary and grammar complexity to ${selectedLevel} level
      - Include cultural references appropriate for Russian language learners
      - Create an engaging narrative with clear characters and plot
      - Use grammar structures typical for ${selectedLevel} level
      
      Return the response as JSON with this structure:
      {
        "title": "Story title in Russian",
        "content": "Full story content in Russian"
      }`

      const response = await spark.llm(prompt, 'gpt-4o', true)
      const storyData = JSON.parse(response)
      
      const newStory: Story = {
        title: storyData.title,
        content: storyData.content,
        level: selectedLevel,
        theme: selectedTheme,
        length: selectedLength
      }
      
      setCurrentStory(newStory)
      setQuestions([])
      setQuestionType(null)
      setCurrentQuestionIndex(0)
      toast.success('Story generated successfully!')
    } catch (error) {
      toast.error('Failed to generate story. Please try again.')
      console.error(error)
    } finally {
      setIsGenerating(false)
    }
  }

  const generateQuestions = async (type: 'comprehension' | 'grammar') => {
    if (!currentStory) return

    setIsGenerating(true)
    try {
      const prompt = spark.llmPrompt`Based on this Russian story, generate exactly 5 ${type} questions.

Story: ${currentStory.content}
Level: ${currentStory.level}

${type === 'comprehension' 
  ? 'Generate comprehension questions about the story content, characters, plot, and meaning. Questions should test understanding of what happened in the story.'
  : 'Generate grammar questions focusing on specific grammar constructs used in this story. Identify grammar patterns, verb forms, case usage, etc. that appear in the text and create questions about them.'
}

IMPORTANT: Return only a valid JSON array with exactly 5 question objects. Each question object must have these exact fields:

{
  "id": "unique string like q1, q2, etc",
  "question": "the question text in English", 
  "options": ["option A", "option B", "option C", "option D"],
  "correctAnswer": "exact text that matches one of the options above",
  "explanation": "detailed explanation of the correct answer"
}

Example format:
[
  {
    "id": "q1",
    "question": "What is the main character's name?",
    "options": ["Ivan", "Peter", "Alexei", "Dmitri"],
    "correctAnswer": "Ivan",
    "explanation": "The story mentions Ivan as the protagonist in the first paragraph."
  }
]

Return ONLY the JSON array, no other text:`

      const response = await spark.llm(prompt, 'gpt-4o', true)
      console.log('Raw LLM Response:', response)
      setDebugOutput(`Raw LLM Response:\n${response}\n\nPrompt used:\n${prompt}`)
      
      let questionsData
      
      try {
        // First, try to parse the response directly as JSON
        questionsData = JSON.parse(response)
      } catch (firstParseError) {
        console.log('Direct parse failed, trying to clean response...')
        
        // Clean the response by removing potential markdown or extra text
        let cleanResponse = response.trim()
        
        // Remove markdown code blocks
        cleanResponse = cleanResponse.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
        
        // Find JSON array boundaries
        const arrayStart = cleanResponse.indexOf('[')
        const arrayEnd = cleanResponse.lastIndexOf(']')
        
        if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
          cleanResponse = cleanResponse.substring(arrayStart, arrayEnd + 1)
        }
        
        try {
          questionsData = JSON.parse(cleanResponse)
        } catch (secondParseError) {
          console.error('Both parse attempts failed')
          console.error('Original response:', response)
          console.error('Cleaned response:', cleanResponse)
          console.error('First error:', firstParseError)
          console.error('Second error:', secondParseError)
          throw new Error('Unable to parse LLM response as JSON')
        }
      }
      
      console.log('Parsed questions data:', questionsData)
      
      // Validate the response structure
      if (!questionsData) {
        throw new Error('No data received from LLM')
      }
      
      if (!Array.isArray(questionsData)) {
        console.error('Response is not an array:', questionsData)
        throw new Error('LLM response is not an array')
      }
      
      if (questionsData.length === 0) {
        throw new Error('LLM returned empty array')
      }
      
      // Validate and process each question
      const validQuestions = questionsData
        .map((q, index) => {
          // Detailed validation logging
          console.log(`Validating question ${index + 1}:`, q)
          
          // More lenient validation - let's see what we get
          if (!q || typeof q !== 'object') {
            console.warn(`Question ${index + 1}: Not an object`, q)
            return null
          }
          
          if (!q.question || typeof q.question !== 'string' || q.question.trim() === '') {
            console.warn(`Question ${index + 1}: Invalid question text`, q.question)
            return null
          }
          
          if (!Array.isArray(q.options) || q.options.length < 2) {
            console.warn(`Question ${index + 1}: Invalid options`, q.options)
            return null
          }
          
          if (!q.correctAnswer || typeof q.correctAnswer !== 'string' || q.correctAnswer.trim() === '') {
            console.warn(`Question ${index + 1}: Invalid correct answer`, q.correctAnswer)
            return null
          }
          
          if (!q.explanation || typeof q.explanation !== 'string' || q.explanation.trim() === '') {
            console.warn(`Question ${index + 1}: Invalid explanation`, q.explanation)
            return null
          }
          
          // More lenient answer matching - check if correct answer is similar to any option
          const normalizedCorrectAnswer = q.correctAnswer.toString().trim().toLowerCase()
          const normalizedOptions = q.options.map(opt => opt.toString().trim().toLowerCase())
          const answerFound = normalizedOptions.some(opt => 
            opt === normalizedCorrectAnswer || 
            opt.includes(normalizedCorrectAnswer) || 
            normalizedCorrectAnswer.includes(opt)
          )
          
          if (!answerFound) {
            console.warn(`Question ${index + 1}: Correct answer not found in options`)
            console.warn('Correct answer:', normalizedCorrectAnswer)
            console.warn('Options:', normalizedOptions)
            // Don't reject - let's try to match it anyway
          }
          
          console.log(`Question ${index + 1}: VALID`, {
            question: q.question.substring(0, 50) + '...',
            optionsCount: q.options.length,
            hasCorrectAnswer: !!q.correctAnswer,
            hasExplanation: !!q.explanation
          })
          
          return q
        })
        .filter(q => q !== null)
        .map((q, index) => ({
          id: (q.id || `q${index + 1}`).toString(),
          type: type,
          question: q.question.trim(),
          options: q.options.map((opt: any) => opt.toString().trim()),
          correctAnswer: q.correctAnswer.toString().trim(),
          explanation: q.explanation.trim()
        }))
      
      if (validQuestions.length === 0) {
        throw new Error('No valid questions found in LLM response')
      }
      
      console.log('Valid questions:', validQuestions)
      
      // Enhanced debug output
      setDebugOutput(`Raw LLM Response:\n${response}\n\nParsed Data:\n${JSON.stringify(questionsData, null, 2)}\n\nValid Questions Found: ${validQuestions.length}\n\nProcessed Questions:\n${JSON.stringify(validQuestions, null, 2)}\n\nPrompt used:\n${prompt}`)
      
      console.log('About to set questions state:', validQuestions)
      console.log('Setting question type to:', type)
      
      setQuestions(validQuestions)
      setQuestionType(type)
      setCurrentQuestionIndex(0)
      setSelectedAnswer('')
      setShowFeedback(false)
      
      // Add a timeout to check state after it's been set
      setTimeout(() => {
        console.log('Questions state after setting:', validQuestions.length)
      }, 100)
      
      toast.success(`Generated ${validQuestions.length} ${type} questions`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      console.error('Full error details:', error)
      toast.error(`Failed to generate ${type} questions: ${errorMessage}`)
    } finally {
      setIsGenerating(false)
    }
  }

  const submitAnswer = () => {
    if (!selectedAnswer || !questions[currentQuestionIndex]) return

    const currentQuestion = questions[currentQuestionIndex]
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer
    
    setUserAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: selectedAnswer
    }))
    
    setShowFeedback(true)
    
    if (isCorrect) {
      toast.success('Correct!')
    } else {
      toast.error('Incorrect. Check the explanation.')
    }
  }

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
      setSelectedAnswer('')
      setShowFeedback(false)
    } else {
      toast.success('Quiz completed!')
    }
  }

  const resetQuiz = () => {
    setCurrentQuestionIndex(0)
    setSelectedAnswer('')
    setShowFeedback(false)
    setQuestions([])
    setQuestionType(null)
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground flex items-center justify-center gap-2">
            <Languages className="w-8 h-8 text-primary" />
            Russian Language Tutor
          </h1>
          <p className="text-muted-foreground">
            Generate personalized Russian stories and practice with interactive questions
          </p>
        </div>

        {/* Story Generation Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Generate Story
            </CardTitle>
            <CardDescription>
              Choose your preferences to generate a Russian story tailored to your level
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Proficiency Level</Label>
                <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEVELS.map(level => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Theme</Label>
                <Select value={selectedTheme} onValueChange={setSelectedTheme}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a theme" />
                  </SelectTrigger>
                  <SelectContent>
                    {THEMES.map(theme => (
                      <SelectItem key={theme} value={theme}>
                        {theme}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Story Length</Label>
                <Select value={selectedLength} onValueChange={setSelectedLength}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LENGTHS.map(length => (
                      <SelectItem key={length.value} value={length.value}>
                        {length.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <Button 
              onClick={generateStory} 
              disabled={isGenerating || !selectedTheme}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Generating Story...
                </>
              ) : (
                <>
                  <BookOpen className="w-4 h-4 mr-2" />
                  Generate Story
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Story Display */}
        {currentStory && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{currentStory.title}</CardTitle>
                <div className="flex gap-2">
                  <Badge variant="secondary">{currentStory.level}</Badge>
                  <Badge variant="outline">{currentStory.theme}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea 
                value={currentStory.content}
                readOnly
                className="min-h-[300px] text-base leading-relaxed resize-none"
              />
              
              <div className="flex gap-2 mt-4">
                <Button 
                  onClick={() => generateQuestions('comprehension')}
                  disabled={isGenerating}
                  variant="default"
                >
                  <HelpCircle className="w-4 h-4 mr-2" />
                  Test Comprehension
                </Button>
                <Button 
                  onClick={() => generateQuestions('grammar')}
                  disabled={isGenerating}
                  variant="outline"
                >
                  <Languages className="w-4 h-4 mr-2" />
                  Practice Grammar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Questions */}
        {questions.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {questionType === 'comprehension' ? (
                    <HelpCircle className="w-5 h-5" />
                  ) : (
                    <Languages className="w-5 h-5" />
                  )}
                  {questionType === 'comprehension' ? 'Comprehension Questions' : 'Grammar Practice'}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={resetQuiz}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
              <Progress 
                value={(currentQuestionIndex + 1) / questions.length * 100} 
                className="w-full"
              />
              <CardDescription>
                Question {currentQuestionIndex + 1} of {questions.length}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {questions[currentQuestionIndex] && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">
                    {questions[currentQuestionIndex].question}
                  </h3>
                  
                  <RadioGroup 
                    value={selectedAnswer} 
                    onValueChange={setSelectedAnswer}
                    disabled={showFeedback}
                  >
                    {questions[currentQuestionIndex].options?.map((option, index) => {
                      console.log(`Rendering option ${index}:`, option)
                      return (
                        <div key={index} className="flex items-center space-x-2">
                          <RadioGroupItem value={option} id={`option-${index}`} />
                          <Label htmlFor={`option-${index}`} className="flex-1">
                            {option}
                          </Label>
                          {showFeedback && option === questions[currentQuestionIndex].correctAnswer && (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          )}
                          {showFeedback && option === selectedAnswer && option !== questions[currentQuestionIndex].correctAnswer && (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                        </div>
                      )
                    })}
                  </RadioGroup>
                  
                  {showFeedback && (
                    <div className="p-4 bg-muted rounded-lg">
                      <h4 className="font-medium mb-2">Explanation:</h4>
                      <p className="text-sm text-muted-foreground">
                        {questions[currentQuestionIndex].explanation}
                      </p>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    {!showFeedback ? (
                      <Button 
                        onClick={submitAnswer}
                        disabled={!selectedAnswer}
                      >
                        Submit Answer
                      </Button>
                    ) : (
                      <Button 
                        onClick={nextQuestion}
                        disabled={currentQuestionIndex >= questions.length - 1}
                      >
                        {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Complete Quiz'}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Debug Output */}
        {debugOutput && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Debug Output</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setDebugOutput('')}
                >
                  Clear
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg overflow-auto max-h-96">
                {debugOutput}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default App