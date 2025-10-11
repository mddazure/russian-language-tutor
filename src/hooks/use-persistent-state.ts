import { useState, useEffect, useCallback } from 'react'
import { isAzureEnvironment } from '@/config'

// Unified hook that works in both Spark and Azure environments
export function usePersistentState<T>(key: string, defaultValue: T): [T, (value: T | ((prev: T) => T)) => void, () => void] {
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
          stored = item ? JSON.parse(item) : undefined
        } else {
          // Use Spark KV for Spark environment
          const spark = (window as any).spark
          if (spark?.kv) {
            stored = await spark.kv.get(key)
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
          console.error(`Failed to store ${key} in localStorage:`, error)
        }
      } else {
        // Use Spark KV for Spark environment
        const spark = (window as any).spark
        if (spark?.kv) {
          spark.kv.set(key, newValue).catch((error: any) => {
            console.error(`Failed to store ${key} in Spark KV:`, error)
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
      localStorage.removeItem(key)
    } else {
      // Use Spark KV for Spark environment
      const spark = (window as any).spark
      if (spark?.kv) {
        spark.kv.delete(key).catch((error: any) => {
          console.error(`Failed to delete ${key} from Spark KV:`, error)
        })
      }
    }
  }, [key, defaultValue])

  // Return default value until loaded
  return isLoaded ? [state, setValue, deleteValue] : [defaultValue, setValue, deleteValue]
}