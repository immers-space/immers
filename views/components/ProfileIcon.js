import React from 'react'

export default function ProfileIcon ({ icon, className }) {
  const iconSrc = typeof icon === 'string' ? icon : icon && icon.url
  return iconSrc ? <img className={className} src={iconSrc} /> : null
}
