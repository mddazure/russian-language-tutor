import { useState, useEffect, useCallback } from 'react'



  useEffect(() => {
      try {

  // Load initial value
  useEffect(() => {
    const loadValue = async () => {
      try {
        let stored: T | undefined

        if (isAzureEnvironment()) {
        }
        console.error(`Failed to load ${key}:`, error
        setIsLoaded(true)
    }
  }, [key])
  // Set value f
    setState(prevState => {
      
      if (isAzureEnvironment()) {
        try
        }
        
        // Use Spark KV store
          (window as any).
        }
      }
      return newValue
  }, [key])
        setIsLoaded(true)
    set
    }
      try {
  }, [key])

      // Use Spark KV s
        (window as any).spark.kv.delete(key).catch((error: any) =
    setState(prevState => {
    }
      
}
      if (isAzureEnvironment()) {





        }

        // Use Spark KV store



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