/// <reference types="vite/client" />

declare module '@github/spark/hooks' {
  export function useKV<T = string>(
    key: string, 
    initialValue?: T
  ): readonly [T | undefined, (newValue: T | ((oldValue?: T) => T)) => void, () => void]
}

// Ensure React types are available globally
declare global {
  namespace React {
    interface ReactInstance {}
  }
  
  interface Window {
    spark: {
      llmPrompt: (strings: TemplateStringsArray, ...values: any[]) => string
      llm: (prompt: string, modelName?: string, jsonMode?: boolean) => Promise<string>
      user: () => Promise<{
        avatarUrl: string
        email: string
        id: string
        isOwner: boolean
        login: string
      }>
      kv: {
        keys: () => Promise<string[]>
        get: <T>(key: string) => Promise<T | undefined>
        set: <T>(key: string, value: T) => Promise<void>
        delete: (key: string) => Promise<void>
      }
    }
  }
}

export {}