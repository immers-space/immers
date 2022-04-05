import React, { useState } from 'react'
import ProfileIcon from './ProfileIcon'
import './AvatarPreview.css'
import { Emoji } from 'emoji-mart'
import SanitizedHTML from './SanitizedHTML'

const iframeAllowXr = {
  allow: 'xr-spatial-tracking',
  allowFullScreen: true,
  allowvr: 'yes'
}

export function AvatarPreview ({ icon, avatar, size = 'large' }) {
  const [is3D, setIs3D] = useState(false)
  const aviModelURL = typeof avatar?.url === 'string'
    ? avatar.url
    : avatar?.url?.href
  return (
    <div className='avatarPreview'>
      <ProfileIcon size={size} icon={icon} />
      <div className='coverAvatar showOnHover activate3d' title='Load 3D avatar preview' onClick={() => setIs3D(!is3D)}>
        <Emoji emoji='globe_with_meridians' size={64} />
      </div>
      {is3D && <iframe className='coverAvatar' src={`/static/avatar.html?avatar=${encodeURIComponent(aviModelURL)}`} {...iframeAllowXr} />}
      {avatar.name && <SanitizedHTML className='insetAvatar' html={avatar.name} />}
    </div>
  )
}
