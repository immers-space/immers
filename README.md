# immers

ActivityPub server for immers.space - a decentralized virtual reality metaverse platform powered by Mozilla Hubs and activitypub-express.


## Installation & setup

### Domains

For the best user experience, install your hubs-cloud on a subdomain (e.g. hub.yourdomain.com) when
running the hubs-cloud setup and then use the main domain (e.g. yourdomain.com) for your immer.
This way users only need to use the main domain in the immers handle (user@yourdomain.com).
Attempts to navigate to the main domain will be redirected to the hub homepage automatically.

### Immers server deploy

Setup a web server with MongoDB (v4.x), NodeJS (v12.x), pm2, authbind, and Let's Encrypt certbot. [See detailed instructions for these steps if needed](./server-setup.md).

* Install immers from github

```
git clone https://github.com/wmurphyrd/immers.git
cd immers
npm ci
```

* Copy SSL certificates (replace domain name, username)

```
sudo cp -RL /etc/letsencrypt/live/example.com/. certs/
sudo chown -R myuser certs/.
```

* Edit `config.json` to configure immers server

Key | Value
--- | ---
port | Port number for immers sever (usually 443)
domain | Immers server [host](https://developer.mozilla.org/en-US/docs/Web/API/Location/host)
hub | Hubs cloud [host](https://developer.mozilla.org/en-US/docs/Web/API/Location/host)
homepage | Optonal, redirect root html requests to this url (defaults to `hub`)
name | Name of your immer
dbName | Database name to use with MongoDb
smtpHost | Mail service domain
smtpPort | Mail delivery port
smtpFrom | From address for emails (match mail domain configured in hubs)
keyPath | Relative path to SSL private key (`privkey.pem`)
certPath | Relative path to SSL certificate (`cert.pem`)
caPath | Relative path to SSL certificate authority (`chain.pem`)

* Create `secrets.json`

Key | Value
--- | ---
sessionSecret | Secret key for session cookie encryption
easySecret | Secret key for login token encryption
smtpUser | Username for mail service
smtpPassword | Password for mail service

* Start server with pm2 & authbind

```
authbind --deep pm2 start npm --name="redirector" -- run https-redirect
authbind --deep pm2 start npm --name="immer" -- run start:prod
# one-time setup for autorestart
pm2 startup
pm2 save
```

### Hubs cloud setup

1. [Deply custom hubs client](https://hubs.mozilla.com/docs/hubs-cloud-custom-clients.html) from wmurphyrd/hubs#immers-integration
1. Add config in hubs cloud admin -> setup -> sever settings -> advanced
  * Extra room Header HTML: `<meta name="env:immers_server" content="https://your.immers.server">`
  (replace value in content with your immers server url)
  * Extra Content Security Policy connect-src Rules: `https: wss:`
  (allows API and streaming connections to remote users home instances)
  * Allowed CORS origins: `*`
  (temporary measure cross-hub for avatar sharing)

## Local dev

Default immers server is `https://localhost:8081`, override with entry `IMMERS_SERVER` in hubs repo root folder `.env` file.
