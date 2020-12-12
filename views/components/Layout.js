import React from 'react'
import '../assets/immers.css'

export default function Layout (props) {
  const data = window._serverData || {}
  const title = props.title || data.name
  const attributionUrl = props.attributionUrl || data.imageAttributionUrl
  const attribution = props.attribution || data.imageAttributionText
  return (
    <div>
      <div className='aesthetic-effect-crt bg' />
      <div className='content'>
        <h1 className='aesthetic-50-transparent-color'>{title}</h1>
        <div className='aesthetic-windows-95-modal main-content'>
          <div className='aesthetic-windows-95-modal-title-bar'>
            <div className='aesthetic-windows-95-modal-title-bar-text'>
              {props.contentTitle}
            </div>
          </div>
          <div className='aesthetic-windows-95-modal-content'>
            <hr />
            {props.children}
          </div>
        </div>
        {/* balances layout with title */}
        <h1>&nbsp;</h1>
      </div>

      <div className='attribution'>
        {attribution &&
          <a className='aesthetic-green-color' href={attributionUrl}>
            Background: {attribution}
          </a>}
      </div>
    </div>
  )
}
