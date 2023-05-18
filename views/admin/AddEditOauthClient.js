import React, { useContext, useState, useEffect } from 'react'
import ServerDataContext from '../ap/ServerDataContext'
import FormError from '../components/FormError'
import ProviderLogin from '../components/ProviderLogin'

export default function AddEditOauthClient ({ showClientList, editId }) {
  const [type, setType] = useState('oidc')
  const [name, setName] = useState('')
  const [domain, setDomain] = useState('')
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [metadataFormat, setMetadataFormat] = useState('url')
  const [metadata, setMetadata] = useState('')
  const [isAssertionEncrypted, setIsAssertionEncrypted] = useState(false)
  const [wantLogoutRequestSigned, setWantLogoutRequestSigned] = useState(false)
  const [messageSigningOrder, setMessageSigningOrder] = useState('sign-then-encrypt')
  const [usernameTemplate, setUsernameTemplate] = useState('')
  const [showButton, setShowButton] = useState(false)
  const [buttonIcon, setButtonIcon] = useState('')
  const [buttonLabel, setButtonLabel] = useState('')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState(false)
  const { token } = useContext(ServerDataContext)

  useEffect(() => {
    if (editId) {
      window.fetch(`/a/oauth-client/${editId}`, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }).then(res => res.json())
        .then(response => {
          setType(response.type)
          setDomain(response.domain)
          setName(response.name ?? '')
          setUsernameTemplate(response.usernameTemplate ?? '')
          setShowButton(response.showButton ?? false)
          setButtonIcon(response.buttonIcon ?? '')
          setButtonLabel(response.buttonLabel ?? '')
          setClientId(response.clientId ?? '')
          setClientSecret(response.clientSecret ?? '')
          setIsAssertionEncrypted(response.isAssertionEncrypted ?? false)
          setWantLogoutRequestSigned(response.wantLogoutRequestSigned ?? false)
          setMessageSigningOrder(response.messageSigningOrder ?? 'sign-then-encrypt')
        })
    } else {
      // clear out if component re-used
      setType('oidc')
      setName('')
      setDomain('')
      setUsernameTemplate('')
      setClientId('')
      setClientSecret('')
      setIsAssertionEncrypted(false)
      setWantLogoutRequestSigned(false)
      setMessageSigningOrder('sign-then-encrypt')
      setShowButton(false)
      setButtonIcon('')
      setButtonLabel('')
    }
  }, [editId])

  function handleInput (e) {
    switch (e.target.name) {
      case 'type':
        setType(e.target.value)
        break
      case 'name':
        setName(e.target.value)
        break
      case 'domain':
        setDomain(e.target.value)
        break
      case 'clientId':
        setClientId(e.target.value)
        break
      case 'clientSecret':
        setClientSecret(e.target.value)
        break
      case 'usernameTemplate':
        setUsernameTemplate(e.target.value)
        break
      case 'showButton':
        setShowButton(e.target.checked)
        break
      case 'buttonIcon':
        setButtonIcon(e.target.value)
        break
      case 'buttonLabel':
        setButtonLabel(e.target.value)
        break
      case 'metadataFormat':
        setMetadataFormat(e.target.value)
        break
      case 'isAssertionEncrypted':
        setIsAssertionEncrypted(e.target.checked)
        break
      case 'wantLogoutRequestSigned':
        setWantLogoutRequestSigned(e.target.checked)
        break
      case 'messageSigningOrder':
        setMessageSigningOrder(e.target.value)
        break
      case 'metadataText':
        setMetadata(e.target.value)
        break
      case 'metadataFile':
        if (e.target.files.length) {
          setProcessing(true)
          new Promise((resolve, reject) => {
            const reader = new window.FileReader()
            reader.onload = resolve
            reader.onerror = reject
            reader.readAsText(e.target.files[0])
          })
            .then(doneEvent => setMetadata(doneEvent.target.result))
            .catch(err => {
              setMetadata('')
              console.error(err)
              window.alert('Could not read the file. Please try again.')
            })
            .finally(() => setProcessing(false))
        } else {
          setMetadata('')
        }
        break
    }
  }

  function handleSubmit (e) {
    e.preventDefault()
    setError(false)
    if (!token) {
      return
    }
    const body = { type, name, domain, showButton, buttonIcon, buttonLabel, usernameTemplate }
    switch (type) {
      case 'oidc':
        Object.assign(body, { clientId, clientSecret })
        break
      case 'saml':
        Object.assign(body, { metadata, isAssertionEncrypted, wantLogoutRequestSigned, messageSigningOrder })
        break
    }

    setProcessing(true)
    if (editId) {
      window.fetch(`/a/oauth-client/${editId}`, {
        method: 'PUT',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }).then(res => res.json())
        .then(response => {
          if (response.success) {
            showClientList()
          }
        }).catch(err => {
          console.error(err)
          setError(true)
          setProcessing(false)
        })
    } else {
      window.fetch('/a/oauth-clients', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }).then(res => res.json())
        .then(response => {
          if (response.success) {
            showClientList()
          } else if (response.step === 'discovery') {
            setError('discovery')
            console.error(response.error)
          } else if (response.step === 'domain') {
            setError('domain')
            console.error(response.error)
          } else {
            throw new Error(response.error)
          }
        }).catch(err => {
          console.error(err)
          setError(true)
        }).finally(() => setProcessing(false))
    }
  }

  function login (e) {
    e.preventDefault()
    window.alert('This login button is only a preview.')
  }

  return (
    <div>
      <h3>
        {editId ? 'Edit' : 'Add'} Identity Provider Client
      </h3>
      <div>
        <div>
          <form onSubmit={handleSubmit}>
            <label>
              Provider Type:
              <select name='type' required value={type} onChange={handleInput} disabled={!!editId}>
                <option value='oidc'>OpenID Connect</option>
                <option value='saml'>SAML</option>
                {type === 'immers' && <option value='immers'>Immers</option>}
              </select>
            </label>
            <ClientTips type={type} />
            <label>
              Name:
              <input
                onChange={handleInput}
                id='name'
                type='text' inputMode='text' name='name'
                placeholder='Name'
                required pattern='^[A-Za-z0-9- ]{3,32}$'
                title='Letters, numbers, spaces, &amp; dashes only, between 3 and 32 characters'
                value={name}
              />
            </label>
            {type === 'oidc' && (
              <OidcInputs
                clientState={{ domain, clientId, clientSecret }}
                isEditing={!!editId}
                error={error}
                handleInput={handleInput}
              />
            )}
            {type === 'saml' && (
              <SamlInputs
                clientState={{ domain, metadata, metadataFormat, isAssertionEncrypted, wantLogoutRequestSigned, messageSigningOrder }}
                isEditing={!!editId}
                error={error}
                handleInput={handleInput}
              />
            )}
            {type === 'immers' && (
              <ImmersInputs
                clientState={{ domain }}
                isEditing={!!editId}
                error={error}
                handleInput={handleInput}
              />
            )}
            <UsernameTemplate
              type={type}
              usernameTemplate={usernameTemplate}
              handleInput={handleInput}
            />
            <fieldset className='outline'>
              <legend>Optional Login Button</legend>
              <label>
                <input
                  role='switch'
                  onChange={handleInput}
                  id='showButton'
                  type='checkbox' name='showButton'
                  checked={showButton}
                />
                Show
              </label>
              <label>
                Button Icon:
                <input
                  onChange={handleInput}
                  id='buttonIcon'
                  type='text' inputMode='text' name='buttonIcon'
                  placeholder='Image URL'
                  autoCapitalize='off' autoCorrect='off' spellCheck='false'
                  value={buttonIcon}
                />
              </label>
              <label>
                Button Label:
                <input
                  onChange={handleInput}
                  id='buttonLabel'
                  type='text' inputMode='text' name='buttonLabel'
                  placeholder='Button Label'
                  autoCapitalize='off' autoCorrect='off' spellCheck='false'
                  value={buttonLabel}
                />
              </label>
              {showButton &&
                <div className='form-item'>
                  Preview: <ProviderLogin onClick={login} providerDomain={domain} buttonIcon={buttonIcon} buttonLabel={buttonLabel} />
                </div>}
            </fieldset>
            {error === 'discovery' && (
              <>
                <FormError show>We couldn't process that OpenId Connect Provider</FormError>
                <p>Double check the domain or try putting the full discovery document url instead of the domain.</p>
              </>

            )}
            {error === 'domain' && (
              <>
                <FormError show>Another provider has already been registered for this domain</FormError>
              </>

            )}
            <FormError show={error === true}>Something when wrong. Please Try again</FormError>
            <div className='grid'>
              <button onClick={handleSubmit} disabled={processing}>{editId ? 'Update' : 'Save'} OpenID Connect Client</button>
              <button className='secondary' onClick={showClientList}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

function ClientTips ({ type }) {
  switch (type) {
    case 'oidc':
      return (
        <p>
          Register with your OpenID Connect provider to receive a Client ID and Client Secret.
          <br />
          Your <code>redirect_uri</code> is <code>{window.location.origin}/auth/return</code>
        </p>
      )
    case 'saml':
      return (
        <p>
          Register with your SAML Identity Provider using the following information.
          <br />
          Your single sign-on URL (ACS) is <code>{window.location.origin}/auth/acs</code>
          <br />
          Your Entity ID is <code>{window.location.origin}/auth/saml-metadata</code>
          <br />
          Your Service Provider Metadata is available at{' '}
          <a target='_blank' href={`${window.location.origin}/auth/saml-metadata`} rel='noreferrer'>
            {window.location.origin}/auth/saml-metadata
          </a>
        </p>
      )
    default:
      return null
  }
}

function OidcInputs ({ type, clientState, isEditing, error, handleInput }) {
  return (
    <>
      <label>
        Provider domain:
        <input
          disabled={isEditing}
          onChange={handleInput}
          id='domain'
          type='text' inputMode='text' name='domain'
          placeholder='accounts.domain.com'
          autoCapitalize='off' autoCorrect='off' spellCheck='false'
          value={clientState.domain}
          aria-invalid={error === 'discovery' ? 'true' : ''}
        />
      </label>
      <label>
        Client ID:
        <input
          onChange={handleInput}
          id='clientId'
          type='text' inputMode='text' name='clientId'
          placeholder='Provided Client Id'
          autoCapitalize='off' autoCorrect='off' spellCheck='false'
          value={clientState.clientId}
        />
      </label>
      <label>
        Client Secret:
        <input
          onChange={handleInput}
          id='clientSecret'
          type='text' inputMode='text' name='clientSecret'
          placeholder={isEditing ? '(not shown)' : 'Provided Client Secret'}
          autoCapitalize='off' autoCorrect='off' spellCheck='false'
          value={clientState.clientSecret}
        />
      </label>
    </>
  )
}

function SamlInputs ({ type, clientState, isEditing, error, handleInput }) {
  return (
    <>
      <fieldset>
        <legend>How have you received the Identity Provider metadata?</legend>
        <label>
          <input
            type='radio'
            name='metadataFormat'
            id='metadataUrl'
            value='url'
            checked={clientState.metadataFormat === 'url'}
            disabled={isEditing}
            onChange={handleInput}
          />
          URL Link
        </label>
        <label>
          <input
            type='radio'
            name='metadataFormat'
            id='metadataUrl'
            value='file'
            checked={clientState.metadataFormat === 'file'}
            disabled={isEditing}
            onChange={handleInput}
          />
          XML File
        </label>
        <label>
          <input
            type='radio'
            name='metadataFormat'
            id='metadataUrl'
            value='text'
            checked={clientState.metadataFormat === 'text'}
            disabled={isEditing}
            onChange={handleInput}
          />
          XML Metadata (copy & paste)
        </label>
      </fieldset>
      {clientState.metadataFormat === 'url' && (
        <label>
          {isEditing ? 'Provider domain' : 'Metadata document URL'}:
          <input
            disabled={isEditing}
            onChange={handleInput}
            id='domain'
            type='text' inputMode='text' name='domain'
            placeholder='https://domain.com/metadata'
            autoCapitalize='off' autoCorrect='off' spellCheck='false'
            value={clientState.domain}
            aria-invalid={error === 'discovery' ? 'true' : ''}
          />
        </label>
      )}
      {clientState.metadataFormat === 'file' && (
        <label>
          Upload metadata XML file:
          <input
            type='file'
            accept='.xml,application/samlmetadata+xml,application/xml'
            name='metadataFile'
            onChange={handleInput}
          />
        </label>
      )}
      {clientState.metadataFormat === 'text' && (
        <label>
          XML Metadata:
          <textarea
            name='metadataText'
            rows='10'
            value={clientState.metadata} onChange={handleInput}
          />
        </label>
      )}
      <fieldset>

        <label>
          <input
            role='switch'
            onChange={handleInput}
            id='isAssertionEncrypted'
            type='checkbox' name='isAssertionEncrypted'
            checked={clientState.isAssertionEncrypted}
          />
          This Identity Provider encrypts assertions
        </label>
        <label>
          <input
            role='switch'
            onChange={handleInput}
            id='wantLogoutRequestSigned'
            type='checkbox' name='wantLogoutRequestSigned'
            checked={clientState.wantLogoutRequestSigned}
          />
          This Identity Provider requires signed logout requests
        </label>
      </fieldset>
      <label>
        Message signing order:
        <select name='messageSigningOrder' required value={clientState.messageSigningOrder} onChange={handleInput}>
          <option value='sign-then-encrypt'>Sign, then encrypt</option>
          <option value='encrypt-then-sign'>Encrypt, then sign</option>
        </select>
      </label>
    </>
  )
}

function ImmersInputs ({ type, clientState, isEditing, error, handleInput }) {
  return (
    <>
      <label>
        Immer domain:
        <input
          disabled={isEditing}
          onChange={handleInput}
          id='domain'
          type='text' inputMode='text' name='domain'
          placeholder='accounts.domain.com'
          autoCapitalize='off' autoCorrect='off' spellCheck='false'
          value={clientState.domain}
          aria-invalid={error === 'discovery' ? 'true' : ''}
        />
      </label>
    </>
  )
}

function UsernameTemplate ({ usernameTemplate, handleInput, type }) {
  return (
    <>
      <label htmlFor="usernameTemplate">
        Optional Username Template:
      </label>
      <input
        onChange={handleInput}
        id='usernameTemplate'
        type='text' inputMode='text' name='usernameTemplate'
        placeholder='{firstName}-{lastName}'
        pattern='(?:[A-Za-z0-9-\{\}]{3,32})?'
        title='Letters, numbers, spaces, &amp; dashes only, between 3 and 32 characters'
        value={usernameTemplate}
      />
      <small>
        Automatically set Immers handle using data from SSO provider.
        If you don't provide this or the resulting username is not available, new users will be prompted to select their own username.
        Use <code>&#123;&#125;</code> to indicate variables to use from user info.{" "}
        {type === "oidc" && <>
          For the list of available variables, refer to
          the <a href="https://openid.net/specs/openid-connect-basic-1_0-28.html#StandardClaims" target="_blank" rel="noreferrer">
            standard OpenId Connect profile claims</a>.
        </>}
        {type === "saml" && <>
          For the list of available attributes, check with your SAML provider.
        </>}
      </small>
    </>

  )
}
