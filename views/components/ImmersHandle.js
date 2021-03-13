import React from 'react'
import c from 'classnames'
import './ImmersHandle.css'

export default function ImmersHandle ({ id, preferredUsername, className }) {
  const immer = new URL(id).hostname
  return (
    <span className={className}>
      <span className='name'>{preferredUsername}</span>
      <span className='immer'>[{immer}]</span>
    </span>
  )
}
