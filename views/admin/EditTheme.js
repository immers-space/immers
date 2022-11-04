import React, { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ServerDataContext from '../ap/ServerDataContext'
import EmojiButton from '../components/EmojiButton'
import Layout from '../components/Layout'

export default function EditTheme ({ taskbarButtons }) {
  const ctx = useContext(ServerDataContext)
  const navigate = useNavigate()
  const [baseTheme, setBaseTheme] = useState(ctx.baseTheme || 'auto')
  const [customTheme, setCustomTheme] = useState(ctx.customTheme || '')
  const [saving, setSaving] = useState(false)
  const baseThemeOpts = ['Auto', 'Light', 'Dark', 'Web95']
  const buttons = <EmojiButton emoji='back' title='Admin Home' tipSide='left' to='..' />
  /* apply settings to page for insant preview */
  useEffect(() => {
    if (baseTheme === 'auto') {
      document.documentElement.removeAttribute('data-theme')
    } else {
      document.documentElement.setAttribute('data-theme', baseTheme)
    }
  }, [baseTheme])
  useEffect(() => {
    document.querySelector('style#custom-theme')
      .innerHTML = `:is(:root, #root) {\n${customTheme}\n}`
  }, [customTheme])
  const handleCancel = () => {
    // force reload to restore settings
    window.location = '/admin'
  }
  const handleSave = async () => {
    setSaving(true)
    await window.fetch('/a/settings/theme', {
      method: 'PUT',
      body: JSON.stringify({
        baseTheme: baseTheme === 'auto' ? undefined : baseTheme,
        customTheme
      }),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ctx.token}`
      }
    })
    setSaving(false)
    ctx.baseTheme = baseTheme
    ctx.customTheme = customTheme
    navigate('..')
  }
  const handleBaseChange = evt => setBaseTheme(evt.target.value)
  const handleCustomChange = evt => setCustomTheme(evt.target.value)
  return (
    <Layout contentTitle='Immers Admin' taskbar buttons={buttons} taskbarButtons={taskbarButtons}>
      <h3>Theme Editor</h3>
      <fieldset>
        <legend>Base theme</legend>
        {baseThemeOpts.map(themeName => (
          <label key={themeName}>
            <input
              type='radio'
              name='baseTheme'
              value={themeName.toLowerCase()}
              checked={baseTheme === themeName.toLowerCase()}
              onChange={handleBaseChange}
            />
            {themeName}
          </label>
        ))}
      </fieldset>
      <label>
        Custom theme settings
        <textarea
          name='customTheme'
          rows='5' placeholder='--primary: red;'
          value={customTheme} onChange={handleCustomChange}
        />
      </label>
      <p>
        Customize the theme by changing CSS custom property values.
        Changes will be previewed instantly on this page.{' '}
        <a href='/static/reference-theme.css' target='_blank'>
          View the complete list of customizable properties
        </a>.
      </p>
      <footer>
        <div className='grid'>
          <button onClick={handleSave} disabled={saving} aria-busy={saving}>Save</button>
          <button onClick={handleCancel} disabled={saving} aria-busy={saving} className='secondary'>Cancel</button>
        </div>
      </footer>
    </Layout>
  )
}
