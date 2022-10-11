import { useEffect, useState } from 'react'

export function useCheckAdmin (token, redirectIfNotAdmin) {
  const [isAdmin, setIsAdmin] = useState(undefined)
  useEffect(() => {
    let adminTimeout
    if (!token) {
      adminTimeout = setTimeout(() => {
        if (redirectIfNotAdmin) {
          redirectToLogin()
        } else {
          setIsAdmin(false)
        }
      }, 4000)
      return () => window.clearTimeout(adminTimeout)
    }
    window.fetch('/a/is-admin', {
      headers: {
        Accept: 'application/activity+json',
        Authorization: `Bearer ${token}`
      }
    }).then(res => res.json())
      .then(res => {
        if (res.isAdmin) {
          setIsAdmin(true)
        }
      })
      .catch(() => {
        if (redirectIfNotAdmin) {
          redirectToProfile()
        } else {
          setIsAdmin(false)
        }
      })
  }, [token])
  return isAdmin
}

function redirectToProfile () {
  window.location = '/'
}

function redirectToLogin () {
  window.location = '/auth/login'
}
