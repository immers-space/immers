import React from 'react'

export default function EmailInput ({ invalid }) {
  return (
    <label>
      E-mail address:
      <input
        type='email' name='email'
        aria-invalid={invalid ? 'true' : ''}
        required
      />
    </label>
  )
}
