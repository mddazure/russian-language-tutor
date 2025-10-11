import { useState, useEffect, useCallback } from 'react'
import { isAzureEnvironment } from '@/config'

// Unified hook that works in both Spark and Azure environments
export function usePersistentState<T>(key: string, defaultValue: T): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [state, setState] = useState<T>(defaultValue)
        let stored: T | undefined

          const item = 
        } else {
          const spark = (window as 
           
        let stored: T | undefined
        
        }
        console.error(`Failed to load $
        setIsLoaded(true)
    }
        } else {
  // Set value function
    setState(prevState => {
      
      if (isAzureEnvironment()) {
        try
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





































