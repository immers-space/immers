import React from 'react'
import './ImmersHandle.css'

export default function ImmersHandle ({ id, preferredUsername, name, showName, className }) {
  const immer = new URL(id).hostname
  return (
    <span className={className}>
      <span className='name'>{showName ? name : preferredUsername}</span>
      <span className='immer'>[{immer}]</span>
    </span>
  )
}
