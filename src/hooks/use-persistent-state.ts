import { useState, useEffect, useCallback } from 'react'

// Check if we're in Azure environment (no spark global)
function isAzureEnvironment(): boolean {
  return typeof window !== 'undefined' && !(window as any).spark
}

export function usePersistentState<T>(key: string, defaultValue: T) {
  const [state, setState] = useState<T>(defaultValue)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load initial value
  useEffect(() => {
    const loadValue = async () => {
      try {
        let stored: T | undefined

        if (isAzureEnvironment()) {
          // Use localStorage for Azure
          const item = localStorage.getItem(key)
          if (item !== null) {
            stored = JSON.parse(item)
          }
        } else {
          // Use Spark KV store
          if ((window as any).spark?.kv) {
            stored = await (window as any).spark.kv.get(key) as T | undefined
          }
        }

        if (stored !== undefined) {
          setState(stored)
        }
      } catch (error) {
        console.error(`Failed to load ${key}:`, error)
      }
      setIsLoaded(true)
    }

    loadValue()
  }, [key])

  // Set value function
  const setValue = useCallback((newValue: T | ((prevValue: T) => T)) => {
    setState(prevState => {
      const valueToSet = typeof newValue === 'function' 
        ? (newValue as (prevValue: T) => T)(prevState)
        : newValue
      
      if (isAzureEnvironment()) {
        // Use localStorage for Azure
        try {
          localStorage.setItem(key, JSON.stringify(valueToSet))
        } catch (error) {
          console.error(`Failed to save ${key} to localStorage:`, error)
        }
      } else {
        // Use Spark KV store
        if ((window as any).spark?.kv) {
          (window as any).spark.kv.set(key, valueToSet).catch((error: any) => {
            console.error(`Failed to save ${key} to Spark KV:`, error)
          })
        }
      }
      
      return valueToSet
    })
  }, [key])

  // Delete value function
  const deleteValue = useCallback(() => {
    setState(defaultValue)
    
    if (isAzureEnvironment()) {
      // Use localStorage for Azure
      try {
        localStorage.removeItem(key)
      } catch (error) {
        console.error(`Failed to delete ${key} from localStorage:`, error)
      }
    } else {
      // Use Spark KV store
      if ((window as any).spark?.kv) {
        (window as any).spark.kv.delete(key).catch((error: any) => {
          console.error(`Failed to delete ${key} from Spark KV:`, error)
        })
      }
    }
  }, [key, defaultValue])

  return [state, setValue, deleteValue, isLoaded] as const
}