import React from 'react'
export default function ProviderLogin ({ providerDomain, buttonIcon, buttonLabel, ...rest }) {
  return (
    <button
      className='secondary'
      data-provider={providerDomain}
      {...rest}
    >
      {buttonIcon && <img class='immers-icon' src={buttonIcon} />}
      {buttonLabel}
    </button>
  )
}
