// Storage service that works with both Spark KV and localStorage
import { useState, useEffect, useCallback } from 'react'
import { isAzureEnvironment } from '../config'

export interface StorageService {
  get: <T>(key: string) => Promise<T | undefined>
  set: <T>(key: string, value: T) => Promise<void>
  delete: (key: string) => Promise<void>
  keys: () => Promise<string[]>
}

// Spark KV storage service
const sparkStorageService: StorageService = {
  get: async <T>(key: string): Promise<T | undefined> => {
    // Use the global spark object which has kv property
    const sparkKV = (window as any).spark?.kv
    return sparkKV ? await sparkKV.get(key) : undefined
  },
  set: async <T>(key: string, value: T): Promise<void> => {
    const sparkKV = (window as any).spark?.kv
    if (sparkKV) {
      await sparkKV.set(key, value)
    }
  },
  delete: async (key: string): Promise<void> => {
    const sparkKV = (window as any).spark?.kv
    if (sparkKV) {
      await sparkKV.delete(key)
    }
  },
  keys: async (): Promise<string[]> => {
    const sparkKV = (window as any).spark?.kv
    return sparkKV ? await sparkKV.keys() : []
  }
}

// localStorage-based storage service for Azure deployment
const localStorageService: StorageService = {
  get: async <T>(key: string): Promise<T | undefined> => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : undefined
    } catch {
      return undefined
    }
  },
  set: async <T>(key: string, value: T): Promise<void> => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error('Failed to store item:', error)
    }
  },
  delete: async (key: string): Promise<void> => {
    localStorage.removeItem(key)
  },
  keys: async (): Promise<string[]> => {
    return Object.keys(localStorage)
  }
}

// Export the appropriate service based on environment
export const storageService: StorageService = isAzureEnvironment() ? localStorageService : sparkStorageService

// Custom hook that works like useKV but with fallback to localStorage
export function useStorage<T>(key: string, defaultValue: T): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [state, setState] = useState<T>(defaultValue)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load initial value
  useEffect(() => {
    const loadValue = async () => {
      try {
        const stored = await storageService.get<T>(key)
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
  const setValue = useCallback(async (value: T | ((prev: T) => T)) => {
    const newValue = typeof value === 'function' ? (value as (prev: T) => T)(state) : value
    setState(newValue)
    try {
      await storageService.set(key, newValue)
    } catch (error) {
      console.error(`Failed to store ${key}:`, error)
    }
  }, [key, state])

  // Delete value function
  const deleteValue = useCallback(async () => {
    setState(defaultValue)
    try {
      await storageService.delete(key)
    } catch (error) {
      console.error(`Failed to delete ${key}:`, error)
    }
  }, [key, defaultValue])

  // Return default value until loaded
  return isLoaded ? [state, setValue, deleteValue] : [defaultValue, setValue, deleteValue]
}