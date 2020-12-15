import React from 'react'

export default function EmailInput () {
  return (
    <div className='form-item'>
      <label>E-mail address:</label>
      <input
        className='aesthetic-windows-95-text-input'
        type='email' name='email'
        required
      />
    </div>
  )
}
