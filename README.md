# immers

ActivityPub server for immers.space - a decentralized virtual reality metaverse platform powered by Mozilla Hubs and activitypub-express.


## Installation

We provide a [Docker Hub image](https://hub.docker.com/repository/docker/immersspace/immers) for immers,
and the [immers-app repo](https://github.com/immers-space/immers-app) contains
docker-compose configuration, configuration script, and deploy instructions.
If you prefer to run immers without docker, it can be deployed just like
any other NodeJS & MongoDB app.

## Configuration

Immers looks for the following configuration values as environment variables
or in a `.env` file in the project root.

## Required configuration

Variable | Value | Example
--- | --- | ---
name | Name of your immer | Immers Space
domain | Domain name for your immers server | immers.space
hub | Domain name for your Mozilla Hubs Cloud or other connected immersive experience | hub.immers.space
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
dbName | Database name to use with MongoDb | mongodb
port | Port number for immers sever | 8081
smtpFrom | From address for emails | noreplay@mail.`domain`
emailOptInURL | Link to an opt-in form for email updates to show on registration page | None
emailOptInParam | Query parameter for `emailOptInURL` for the e-mail address | Use opt-in url without inserting e-mail
emailOptInNameParam | Query parameter for `emailOptInURL` for the name | Use opt-in url without inserting name
systemUserName | Username for a "Service" type actor representing the Immer, enables welcome messages and [Mastodon secure mode](https://docs.joinmastodon.org/spec/activitypub/#secure-mode) compatibility | none (does not create service actor)
systemDisplayName | Sets the display name for the service actor | none
welcome | HTML file for a message that will be delivered from the system user to new user's inboxes (requires `systemUserName`) | none (does not send message)
keyPath, certPath, caPath | Local development only. Relative paths to certificate files | None

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
