import React from 'react'
import c from 'classnames'

export default function Tab (props) {
  const cls = c({
    'aesthetic-windows-95-tabbed-container-tabs-button': true,
    'is-active': props.active
  })
  return (
    <div id='show-login' className={cls}>
      <button type='button'>
        {props.children}
      </button>
    </div>
  )
}
