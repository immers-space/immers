# The Immers Server

[![Docker Image Version (latest semver)](https://img.shields.io/docker/v/immersspace/immers?label=Docker%20version)](https://hub.docker.com/r/immersspace/immers)
[![Docker Pulls](https://img.shields.io/docker/pulls/immersspace/immers?label=Docker%20pulls)](https://hub.docker.com/r/immersspace/immers)
[![Matrix](https://img.shields.io/matrix/immers-space:matrix.org?label=Matrix%20chat)](https://matrix.to/#/#immers-space:matrix.org)
[![Open Collective](https://opencollective.com/immers-space/tiers/badge.svg)](https://opencollective.com/immers-space)

Connect your WebXR project to the metaverse. A microsvervice that adds federated social features to any Immersive Web Project.

<dl>
  <dt>🔐 Secure user account registration</dt>
  <dd>Provides sign up, password resets, and profile pages. Password saved with bcrypt, emails saved only as SHA-256 hashes</dd>
  <dt>♻️ Reciproal OAuth2 authorization</dt>
  <dd>Users can login to your site with an account from any immer, and your users can use their accounts to login at any other immer</dd>
  <dt>🧑‍🤝‍🧑 Standards-based federated social features</dt>
  <dd>Friends lists, messaging, and blocklists - not just between users of your site but across all immers and even other sites using ActivityPub like Mastodon</dd>
  <dt>🥬 Organic discovery</dt>
  <dd>Spread your project without any centralized indexer or algorithms. When an immerser visits your site, they share the link with all of their friends</dd>
</dl>

## See a Demo

Check out [Virtual Reign Immersive Chess](https://vreign.space/auth/login) - this Immers Server is connected to a chess
game built on top of Mozilla Hubs. 


## Get Started

1. Spin up your Immers Server using an [immers-app template](https://github.com/immers-space/immers-app)
2. Add the [immers-client](https://github.com/immers-space/immers-client) to your WebXR project to connect to it
3. [Join our community on Matrix](https://matrix.to/#/#immers-space:matrix.org) for help & discussion
4. [Join our Platform Cooperative](https://opencollective.com/immers-space/contribute/creator-member-33683) to guide the future of the project

We provide a [Docker Hub image](https://hub.docker.com/repository/docker/immersspace/immers) for immers,
and the [immers-app repo](https://github.com/immers-space/immers-app) contains
docker-compose configuration, configuration script, and deploy instructions for various setups.
If you prefer to run immers without docker, it can be deployed just like
any other NodeJS & MongoDB app.

If using with Hubs Cloud, but not using our docker config & Hubs deployer,
[see Manual Hubs Cloud Config](#manual-hubs-cloud-config) section below.

## Configuration

Immers looks for the following configuration values as environment variables
or in a `.env` file in the project root.

## Required configuration

Variable | Value | Example
--- | --- | ---
name | Name of your immer | Immers Space
domain | Domain name for your immers server | immers.space
hub | Domain name for your Mozilla Hubs Cloud or other connected immersive experience. Can either be a single domain or comma separated list. Each domain listed will be enabled for CORS & trusted OAuth client requests. Users will be redirected to the first domain listed. | hub.immers.space
dbString | Full MongoDB connection string, with credentials and database name, e.g. `mongodb://localhost:27017/immers`
smtpHost | Mail service domain (for password resets) | smtp.sendgrid.net
smtpPort | Mail service port | 587
smtpUser | Mail service username | apikey
smtpPassword | Mail service password |
sessionSecret | Secret key for session cookie encryption | *Automatically generated when [using setup script](https://github.com/immers-space/immers-app#step-1---setup)*
easySecret | Secret key for email token encryption | *Automatically generated when [using setup script](https://github.com/immers-space/immers-app#step-1---setup)*

## Optional configuration

Variable | Value | Default
--- | --- | ---
homepage | Redirect root html requests to this url | Use `hub` url
googleFont | Font family name from to fetch from Google Fonts for immer name header | Monoton
backgroundColor | CSS color | #a6549d
backgroundImage | Image file | vapor.png
customCSS | Additional CSS file to load | None
icon | Image file | vaporwave-icon.png
imageAttributionText | Attribution for backgroundImage, if needed | Vectors by Vecteezy
imageAttributionUrl | Attribution for backgroundImage, if needed | https://www.vecteezy.com/free-vector/vector
monetizationPointer | [Payment pointer](https://webmonetization.org/docs/ilp-wallets/#payment-pointers) for Web Monetization on login & profile pages | Immers Space organization wallet
port | Port number for immers sever | 8081
smtpFrom | From address for emails | noreplay@mail.`domain`
emailOptInURL | Link to an opt-in form for email updates to show on registration page | None
emailOptInParam | Query parameter for `emailOptInURL` for the e-mail address | Use opt-in url without inserting e-mail
emailOptInNameParam | Query parameter for `emailOptInURL` for the name | Use opt-in url without inserting name
systemUserName | Username for a "Service" type actor representing the Immer, enables welcome messages and [Mastodon secure mode](https://docs.joinmastodon.org/spec/activitypub/#secure-mode) compatibility | none (does not create service actor)
systemDisplayName | Sets the display name for the service actor | none
welcome | HTML file for a message that will be delivered from the system user to new user's inboxes (requires `systemUserName`) | none (does not send message)
keyPath, certPath, caPath | Local development only. Relative paths to certificate files | None
proxyMode | Enable use behind an SSL-terminating proxy or load balancer, serves over http instead of https and sets Express `trust proxy` setting to the value of `proxyMode` (e.g. `1`, [other options](https://expressjs.com/en/guide/behind-proxies.html)) | none (serves over https with AutoEncrypt)
enablePublicRegistration | Allow new user self-registration | true
enableClientRegistration | Allow new remote immers servers to register - if this is `false`, users will not be able to login with their accounts from other servers unless that server is already registered | true

**Notes on use with a reverse proxy**: When setting `proxyMode`, you must ensure your reverse proxy sets the following headers: X-Forwarded-For, X-Forwarded-Host, and X-Forwarded-Proto (example for nginx below). If you are load balancing multiple immers server instances, you will also need to setup sticky sessions in order for streaming updates to work. 

```
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Host $host;
proxy_set_header X-Forwarded-Proto $scheme;
```

## API access

Most API access will be done with the [immers-client](https://github.com/immers-space/immers-client)
library on your immersive website, but the immers server also attempts to
parse your `domain` option to set the login
session cookie on the apex domain so that it can be used in CORS requests.
As long as your immers server and immersive website are on the same apex domain,
e.g. immers.space and hub.immers.space, then you can make authenticated requests
with the `credentials: 'include'` fetch option.

Restore session for previously logged in user:

```js
let user
const token = await fetch('https://your.immer/auth/token', { method: 'POST', credentials: 'include' })
    .then(res => {
        if (!res.ok) {
            // 401 if not logged in
            return undefined
        }
        return res.text()
    })
if (token) {
    user = await window.fetch(`https://your.immer/auth/me`, {
    headers: {
      Accept: 'application/activity+json',
      Authorization: `Bearer ${token}`
    }
  }).then(res => res.json());
}
```

Log out of session without having to navigate to immers profile page:

```js
fetch('https://your.immer/auth/logout', { method: 'POST', credentials: 'include' })
```

## Controlled Accounts

If you have an existing user account system, you may not want to bother users with having
another account for immers features. In this case, you can setup a service account
with total authority to create users, login as them, and act on their behalf.

[Controlled accounts docs](./ControlledAccounts.md)


## Manual Hubs Cloud Config

These steps are not necessary if you're using our docker Hubs deployer.
If you aren't, you'll need to add the following in Hubs Cloud admin -> setup -> sever settings -> advanced


* Extra room Header HTML: `<meta name="env:immers_server" content="https://your.immers.server">`
(replace value in content with your immers server url)
* Extra Content Security Policy connect-src Rules: `https: wss:`
(allows API and streaming connections to remote users home instances)
* Allowed CORS origins: `*`
(temporary measure cross-hub for avatar sharing)

## Local dev

immers

* Clone and install immers
```
git clone https://github.com/immers-space/immers.git
cd immers
npm ci
```
* Install a self-signed certificate
```
mkdir certs
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout certs/server.key -out certs/server.cert
```
* Install [mongodb](https://docs.mongodb.com/manual/installation/)
* Run immer with `npm run dev` 

hubs

* Clone and install our fork
```
git clone https://github.com/immers-space/hubs.git
cd hubs
git checkout immers-integration
npm ci
npm run build:client
```
* Run hub with either `npm run dev` (use Hubs dev networking servers) or `npm run start` (to connect to your hubs cloud networking server).
* Visit you immer at `https://localhost:8081`, approve the certificate exception, get automatically forwarded to your hub at `https://localhost:8080`, approve another certificate exception, create a room, and you will be redirected to login or register with your immer.

Default immers server is `https://localhost:8081`, override with entry `IMMERS_SERVER` in hubs repo root folder `.env` file.

If working on immers server web client, run both `npm run dev:client` and `npm run dev` at the same time.

### Creating a new release

1. Update `CHANGELOG.md` - Update top section header from "Unreleased" to "vx.x.x (yyyy-mm-dd)" with the version and date of the new release
2. Update package version: `npm version [patch|minor|major]`
3. Build new docker image: `npm run build:image`
4. Login to docker hub: `docker login -u your_user_name` (if needed)
5. Publish new docker image: `npm run publish:image`

## Creator Members

[![Creator members](https://opencollective.com/immers-space/tiers/creator-member.svg?avatarHeight=36&width=600)](https://opencollective.com/immers-space)


## Immerser Members

[![Immerser members](https://opencollective.com/immers-space/tiers/immerser-member.svg?avatarHeight=36&width=600)](https://opencollective.com/immers-space)
