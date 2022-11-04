import React from 'react'
import c from 'classnames'

export default function Tab (props) {
  const cls = c('tab', 'contrast', { outline: props.active, 'is-active': props.active })
  return (
    <button type='button' className={cls} onClick={props.onClick}>
      {props.children}
    </button>
  )
}
