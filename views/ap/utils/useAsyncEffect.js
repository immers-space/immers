import { useEffect } from 'react'

// wrap async functions so they don't return a promise to useEffect
export function useAsyncEffect (fn, ...rest) {
  useEffect(() => { fn() }, ...rest)
}
