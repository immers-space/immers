import React from 'react'
import './ProviderLogin.css'
export default function ProviderLogin ({ providerDomain, buttonIcon, buttonLabel, ...rest }) {
  return (
    <button
      className='marginLeft loginButton'
      data-provider={providerDomain}
      {...rest}
    >
      <img src={buttonIcon} />{buttonLabel}
    </button>
  )
}
