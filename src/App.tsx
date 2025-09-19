import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { BookOpen, Question, Translate, ArrowClockwise, CheckCircle, XCircle, Trophy, ChartBar } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useKV } from '@github/spark/hooks'

declare global {
  interface Window {
    spark: {
      llmPrompt: (strings: TemplateStringsArray, ...values: any[]) => string
      llm: (prompt: string, modelName?: string, jsonMode?: boolean) => Promise<string>
    }
  }
}

const spark = window.spark

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
  const [quizScore, setQuizScore] = useState<{correct: number, total: number}>({correct: 0, total: 0})
  const [showResults, setShowResults] = useState(false)
  const [quizResults, setQuizResults] = useKV<Array<{question: string, userAnswer: string, correctAnswer: string, isCorrect: boolean, explanation: string}>>('quiz-results', [])

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
    // Reset scoring and results when starting new quiz
    setQuizScore({correct: 0, total: 0})
    setQuizResults([])
    setShowResults(false)
    
    try {
      const prompt = spark.llmPrompt`Based on this Russian story, generate exactly 5 ${type} questions.

Story: ${currentStory.content}
Level: ${currentStory.level}

${type === 'comprehension' 
  ? 'Generate comprehension questions about the story content, characters, plot, and meaning. Questions should test understanding of what happened in the story.'
  : 'Generate grammar questions focusing on specific grammar constructs used in this story. Identify grammar patterns, verb forms, case usage, etc. that appear in the text and create questions about them.'
}

IMPORTANT: Return a JSON object with a single property called "questions" that contains an array of exactly 5 question objects. Each question object must have these exact fields:

{
  "questions": [
    {
      "id": "unique string like q1, q2, etc",
      "question": "the question text in English", 
      "options": ["option A", "option B", "option C", "option D"],
      "correctAnswer": "exact text that matches one of the options above",
      "explanation": "detailed explanation of the correct answer"
    }
  ]
}

Example format:
{
  "questions": [
    {
      "id": "q1",
      "question": "What is the main character's name?",
      "options": ["Ivan", "Peter", "Alexei", "Dmitri"],
      "correctAnswer": "Ivan",
      "explanation": "The story mentions Ivan as the protagonist in the first paragraph."
    }
  ]
}

Return ONLY the JSON object, no other text:`

      const response = await spark.llm(prompt, 'gpt-4o', true)
      console.log('Raw LLM Response:', response)
      
      // Parse the response directly since it's JSON mode
      const parsedResponse = JSON.parse(response)
      console.log('Parsed response:', parsedResponse)
      
      // The response might be an object with a property containing the array
      // or it might be a direct array
      let questionsData
      if (Array.isArray(parsedResponse)) {
        questionsData = parsedResponse
      } else if (parsedResponse.questions && Array.isArray(parsedResponse.questions)) {
        questionsData = parsedResponse.questions
      } else {
        // Look for any property that contains an array
        const arrayProperty = Object.values(parsedResponse).find(value => Array.isArray(value))
        if (arrayProperty) {
          questionsData = arrayProperty
        } else {
          throw new Error('No array found in response')
        }
      }
      
      console.log('Questions data:', questionsData)
      
      // Validate we have an array
      if (!Array.isArray(questionsData)) {
        throw new Error('Questions data is not an array')
      }
      
      // Convert to our format - use exact field names as specified
      const processedQuestions = questionsData.map((q: any, index: number) => {
        console.log(`Processing question ${index}:`, q)
        console.log('Raw question object:', JSON.stringify(q, null, 2))
        
        // Extract fields - ensure we have fallbacks
        const questionText = q.question || q.Question || 'Question not available'
        const options = q.options || q.Options || ['Option A', 'Option B', 'Option C', 'Option D']
        const correctAnswer = q.correctAnswer || q.CorrectAnswer || q.correct_answer || options[0]
        const explanation = q.explanation || q.Explanation || 'No explanation available'
        
        console.log('Extracted fields:', {
          question: questionText,
          options: options,
          correctAnswer: correctAnswer,
          explanation: explanation
        })
        
        const processed = {
          id: q.id || `q${index + 1}`,
          type: type,
          question: questionText,
          options: options,
          correctAnswer: correctAnswer,
          explanation: explanation
        }
        
        console.log('Final processed question:', processed)
        return processed
      })
      
      console.log('Processed questions:', processedQuestions)
      
      // Enhanced debug output
      setDebugOutput(`Raw LLM Response:\n${response}\n\nParsed Response:\n${JSON.stringify(parsedResponse, null, 2)}\n\nQuestions Data:\n${JSON.stringify(questionsData, null, 2)}\n\nProcessed Questions:\n${JSON.stringify(processedQuestions, null, 2)}\n\nPrompt used:\n${prompt}`)
      
      console.log('About to set questions state:', processedQuestions)
      console.log('Setting question type to:', type)
      
      setQuestions(processedQuestions)
      setQuestionType(type)
      setCurrentQuestionIndex(0)
      setSelectedAnswer('')
      setShowFeedback(false)
      
      // Add a timeout to check state after it's been set
      setTimeout(() => {
        console.log('Questions state after setting:', processedQuestions.length)
      }, 100)
      
      toast.success(`Generated ${processedQuestions.length} ${type} questions`)
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
    
    // Update quiz results
    setQuizResults(prev => {
      const currentResults = prev || []
      return [...currentResults, {
        question: currentQuestion.question,
        userAnswer: selectedAnswer,
        correctAnswer: currentQuestion.correctAnswer,
        isCorrect: isCorrect,
        explanation: currentQuestion.explanation
      }]
    })
    
    // Update score
    setQuizScore(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1
    }))
    
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
      // Quiz completed - show results
      setShowResults(true)
      toast.success('Quiz completed!')
    }
  }

  const resetQuiz = () => {
    setCurrentQuestionIndex(0)
    setSelectedAnswer('')
    setShowFeedback(false)
    setQuestions([])
    setQuestionType(null)
    setShowResults(false)
    setQuizScore({correct: 0, total: 0})
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground flex items-center justify-center gap-2">
            <Translate className="w-8 h-8 text-primary" />
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
                  <ArrowClockwise className="w-4 h-4 mr-2 animate-spin" />
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
                  <Question className="w-4 h-4 mr-2" />
                  Test Comprehension
                </Button>
                <Button 
                  onClick={() => generateQuestions('grammar')}
                  disabled={isGenerating}
                  variant="outline"
                >
                  <Translate className="w-4 h-4 mr-2" />
                  Practice Grammar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Questions */}
        {questions.length > 0 && !showResults && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {questionType === 'comprehension' ? (
                    <Question className="w-5 h-5" />
                  ) : (
                    <Translate className="w-5 h-5" />
                  )}
                  {questionType === 'comprehension' ? 'Comprehension Questions' : 'Grammar Practice'}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={resetQuiz}>
                  <ArrowClockwise className="w-4 h-4" />
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
              {questions[currentQuestionIndex] && questions[currentQuestionIndex].question && (
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
                        disabled={false}
                      >
                        {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Complete Quiz'}
                      </Button>
                    )}
                  </div>
                </div>
              )}
              {questions[currentQuestionIndex] && !questions[currentQuestionIndex].question && (
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p>Question data is missing or corrupted. Please regenerate the questions.</p>
                  <pre className="mt-2 text-xs">{JSON.stringify(questions[currentQuestionIndex], null, 2)}</pre>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quiz Results */}
        {showResults && quizResults && quizResults.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-accent" />
                  Quiz Results
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={quizScore.correct / quizScore.total >= 0.8 ? "default" : quizScore.correct / quizScore.total >= 0.6 ? "secondary" : "destructive"}>
                    {quizScore.correct}/{quizScore.total} ({Math.round((quizScore.correct / quizScore.total) * 100)}%)
                  </Badge>
                  <Button variant="outline" size="sm" onClick={resetQuiz}>
                    <ArrowClockwise className="w-4 h-4 mr-2" />
                    New Quiz
                  </Button>
                </div>
              </div>
              <CardDescription>
                {quizScore.correct / quizScore.total >= 0.8 
                  ? "Excellent work! You have a strong understanding of the material."
                  : quizScore.correct / quizScore.total >= 0.6
                  ? "Good job! You're making progress. Review the explanations below."
                  : "Keep practicing! Review the explanations to improve your understanding."
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <ChartBar className="w-5 h-5 text-primary" />
                  <span className="font-medium">Performance Breakdown</span>
                </div>
                <div className="flex gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    {quizScore.correct} Correct
                  </span>
                  <span className="flex items-center gap-1">
                    <XCircle className="w-4 h-4 text-red-600" />
                    {quizScore.total - quizScore.correct} Incorrect
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Question Review:</h4>
                {(quizResults || []).map((result, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-start gap-2">
                      {result.isCorrect ? (
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1 space-y-2">
                        <p className="font-medium">{result.question}</p>
                        <div className="text-sm space-y-1">
                          <p>
                            <span className="text-muted-foreground">Your answer:</span>{' '}
                            <span className={result.isCorrect ? 'text-green-600' : 'text-red-600'}>
                              {result.userAnswer}
                            </span>
                          </p>
                          {!result.isCorrect && (
                            <p>
                              <span className="text-muted-foreground">Correct answer:</span>{' '}
                              <span className="text-green-600">{result.correctAnswer}</span>
                            </p>
                          )}
                          <p className="text-muted-foreground text-xs">
                            {result.explanation}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={() => generateQuestions(questionType!)}>
                  Try Again
                </Button>
                <Button variant="outline" onClick={() => setShowResults(false)}>
                  Review Questions
                </Button>
              </div>
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