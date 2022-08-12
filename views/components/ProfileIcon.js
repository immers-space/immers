import React from 'react'
import c from 'classnames'
import './ProfileIcon.css'

export default function ProfileIcon ({ icon, size, className, ...props }) {
  const iconSrc = typeof icon === 'string' ? icon : icon && icon.url
  if (!iconSrc) {
    return null
  }
  return (
    <div className={c({ iconWrapper: size === 'large', medIconWrapper: size === 'medium', tinyIconWrapper: size === 'tiny' }, className)} {...props}>
      <img className={c({ icon: size === 'large', medIcon: size === 'medium', tinyIcon: size === 'tiny' })} src={iconSrc} />
    </div>
  )
}
