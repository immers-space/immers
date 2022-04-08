import React from 'react'
import c from 'classnames'
import './AvatarPreview.css'
import SanitizedHTML from './SanitizedHTML'

export function AvatarPreview ({ icon, avatar, size = 'large' }) {
  const iconSrc = typeof icon === 'string' ? icon : icon && icon.url
  if (!iconSrc) {
    return null
  }
  const aviModelURL = typeof avatar?.url === 'string'
    ? avatar.url
    : avatar?.url?.href
  return (
    <div className={c('aesthetic-windows-95-container-indent', 'avatarPreview', size)}>
      <model-viewer
        alt={avatar.name}
        src={aviModelURL}
        ar ar-modes='webxr scene-viewer quick-look'
        poster={iconSrc}
        shadow-intensity='1' camera-controls enable-pan
      />
      {avatar.name && <SanitizedHTML className='insetAvatar' html={avatar.name} />}
    </div>
  )
}
