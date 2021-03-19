import React, { useState } from 'react'
import ProfileIcon from './ProfileIcon'
import './AvatarPreview.css'
import { Emoji } from 'emoji-mart'

const iframeAllowXr = {
  allow: 'xr-spatial-tracking',
  allowFullScreen: true,
  allowvr: 'yes'
}

export function AvatarPreview ({ icon, avatar }) {
  const [is3D, setIs3D] = useState(false)
  const aviModelURL = typeof avatar?.url === 'string'
    ? avatar.url
    : avatar?.url?.href
  return (
    <div className='avatarPreview aesthetic-black-bg-color'>
      <ProfileIcon size='large' icon={icon} />
      <div className='coverAvatar showOnHover activate3d' title='Load 3D avatar preview' onClick={() => setIs3D(!is3D)}>
        <Emoji emoji='globe_with_meridians' size={64} />
      </div>
      {is3D && <iframe className='coverAvatar' src={`/static/avatar.html?avatar=${encodeURIComponent(aviModelURL)}`} {...iframeAllowXr} />}
    </div>
  )
}
