import React from 'react'
import c from 'classnames'
import './ProfileIcon.css'

export default function ProfileIcon ({ icon, size, className }) {
  const iconSrc = typeof icon === 'string' ? icon : icon && icon.url
  if (!iconSrc) {
    return null
  }
  return (
    <div className={c({ iconWrapper: size === 'large', tinyIconWrapper: size === 'tiny' }, className)}>
      <img className={c({ icon: size === 'large', tinyIcon: size === 'tiny' })} src={iconSrc} />
    </div>
  )
}
