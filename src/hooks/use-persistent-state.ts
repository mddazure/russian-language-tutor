import { useState, useEffect, useCallback } from 'react'
import { isAzureEnvironment } from '@/config'

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
          const localData = localStorage.getItem(key)
          if (localData) {
            stored = JSON.parse(localData)
          }
        } else {
          // Use Spark KV store
          if ((window as any).spark?.kv) {
            stored = await (window as any).spark.kv.get(key)
          }
        }
        
        if (stored !== undefined) {
          setState(stored)
        }
      } catch (error) {
        console.error(`Failed to load ${key}:`, error)
      } finally {
        setIsLoaded(true)
      }
    }
    loadValue()
  }, [key])

  // Set value function
  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setState(prevState => {
      const newValue = typeof value === 'function' ? (value as (prev: T) => T)(prevState) : value
      
      // Store asynchronously
      if (isAzureEnvironment()) {
        // Use localStorage for Azure
        try {
          localStorage.setItem(key, JSON.stringify(newValue))
        } catch (error) {
          console.error(`Failed to save ${key} to localStorage:`, error)
        }
      } else {
        // Use Spark KV store
        if ((window as any).spark?.kv) {
          (window as any).spark.kv.set(key, newValue).catch((error: any) => {
            console.error(`Failed to save ${key} to Spark KV:`, error)
          })
        }
      }
      
      return newValue
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