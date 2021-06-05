import React from 'react'
import c from 'classnames'
import '../assets/immers.css'
import immersIcon from '../assets/immers_logo.png'

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
            <div className='aesthetic-windows-95-modal-title-bar-controls'>
              {props.buttons}
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

      <div className={c('attribution', { 'with-taskbar': props.taskbar })}>
        {attribution &&
          <a className='aesthetic-green-color' href={attributionUrl}>
            Background: {attribution}
          </a>}
      </div>
      {props.taskbar && (
        <div className='aesthetic-windows-95-taskbar'>
          <div className='aesthetic-windows-95-taskbar-start'>
            <a href={`//${data.hub}`}>
              <img src={data.icon ?? immersIcon} className='immers-icon' /> Enter {data.name}
            </a>
          </div>
          {props.taskbarButtons?.length && (
            <div className='aesthetic-windows-95-taskbar-services'>
              {props.taskbarButtons}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
