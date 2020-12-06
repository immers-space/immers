import React from 'react'
import c from 'classnames'

export default function PasswordInput (props) {
  return (
    <div className={c({ 'form-item': true, hidden: !!props.hide })}>
      <label>Password:</label>
      <div>
        <input
          id='password' className='aesthetic-windows-95-text-input'
          type='password' name='password'
          required pattern='.{3,32}'
          title='Between 3 and 32 characters'
        />
      </div>
    </div>
  )
}