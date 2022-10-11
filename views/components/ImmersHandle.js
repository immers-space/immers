import React from 'react'
import './ImmersHandle.css'

export default function ImmersHandle ({ homeImmer, username, displayName, handle, /* backwards compat: */ id, preferredUsername, name, showName }) {
  const immer = homeImmer ?? new URL(id).hostname
  return (
    <span className='immers-handle-wrapper' title={handle}>
      <span className='name'>{showName ? (displayName || name) : (username || preferredUsername)}</span>
      <span className='immer'>[{immer}]</span>
    </span>
  )
}
