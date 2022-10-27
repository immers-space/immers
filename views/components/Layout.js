import React from 'react'
import c from 'classnames'
import '../assets/immers.scss'
import immersIcon from '../assets/immers_logo.png'

export default function Layout (props) {
  const data = window._serverData || {}
  const title = props.title || data.name
  const attributionUrl = props.attributionUrl || data.imageAttributionUrl
  const attribution = props.attribution || data.imageAttributionText
  return (
    <>
      <div className='background-image' />
      <header className='container'>
        <h1>{title}</h1>
      </header>
      <main className='container'>
        <article>
          <header>
            <nav>
              <ul>
                <li>
                  <h2>
                    {props.contentTitle}
                  </h2>
                </li>
              </ul>
              <ul>
                {Array.isArray(props.buttons) ? props.buttons.map((btn, i) => (<li key={i}>{btn}</li>)) : <li>{props.buttons}</li>}
              </ul>
            </nav>
          </header>
          <div>
            {props.children}
          </div>
        </article>
      </main>

      <div className={c('attribution', { 'with-taskbar': props.taskbar })}>
        {attribution &&
          <a className='aesthetic-green-color' href={attributionUrl}>
            Background: {attribution}
          </a>}
      </div>
      {props.taskbar && (
        <nav className='container-fluid'>
          <ul>
            <li>
              <a role='button' href={`//${data.hub}`}>
                <img src={data.icon ?? immersIcon} className='immers-icon' /> Enter {data.name}
              </a>
            </li>
          </ul>
          {props.taskbarButtons?.length && (
            <ul>
              {props.taskbarButtons.map((btn, i) => <li key={i}>{btn}</li>)}
            </ul>
          )}
        </nav>
      )}
    </>
  )
}
