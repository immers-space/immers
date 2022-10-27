import React from 'react'

export default function EmailInput () {
  return (
    <label>
      E-mail address:
      <input
        type='email' name='email'
        required
      />
    </label>
  )
}
