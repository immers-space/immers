# Controlled Accounts

If you have an existing user account system, you may not want to bother users with having
another account for immers features. In this case, you can setup a service account
with total authority to create users, login as them, and act on their behalf.
This way, the immers accounts can be totally transparent to users who will interact
only with your account system. This is accomplished with a "2-legged OAuth" approach,
using a service account that can exchange a JWT for an access token for any user.

## Activate feature

First you must activate the feature by setting `canControlUserAccounts: true` and installing
a `jwtPublicKeyPem` on a `client` record. We provide a script that does this for the
system client and outputs the private key that you need to save.

```bash
./bin/install-admin-key.mjs > immersAdminPrivateKey.pem
# or, if using an immers-app docker config
docker-compose exec immer /usr/src/immers/bin/install-admin-key.mjs > immersAdminPrivateKey.pem
```

## (server-side only) Create user accounts

User accounts can be created programatically without passwords (disabling direct login), and you'll probably want to disable user
self-registration on your Immers server so that all sign-ups go
through your primary account system.

In your `.env` add:

```
enablePublicRegistration=false
```

From your application server, make an authenticated POST
to the user endpoint to register accounts.
Your admin private key must be kept private on your server and never sent to the client.

```js
const { readFileSync } = require('fs')
const jwt = require('jsonwebtoken')
const axios = require('axios') // any request library will do
const immersAdminPrivateKey = readFileSync('immersAdminPrivateKey.pem')
const auth = jwt.sign({}, immersAdminPrivateKey, {
  algorithm: "RS256",
  issuer: `https://yourDomain.com/o/immer`,
  audience: `https://yourDomain.com/o/immer`,
  expiresIn: "1h"
})
axios.post(
  `https://${immerDomain}/auth/user`,
  {
    username,
    email
  },
  { headers: { Authorization: `Bearer ${auth}` } }
)
```

## (server-side only) Exchange service JWT for user access token

Your admin private key must be kept private on your server and never sent to the client.
Sign a JWT and send it as a OAuth2 token exchange to retrieve a user access token.

```js
const { readFileSync } = require('fs')
const jwt = require('jsonwebtoken')
const axios = require('axios') // any request library will do
const immersAdminPrivateKey = readFileSync('immersAdminPrivateKey.pem')
const oAuthJwt = jwt.sign(
  {
    scope: "*",
    origin: "https://hub.yourDomain.com" // make this match the origin where the tokens will be used
  },
  immersAdminPrivateKey,
  {
    algorithm: "RS256",
    issuer: `https://yourDomain.com/o/immer`,
    audience: `https://yourDomain.com/o/immer`,
    expiresIn: "1h",
    subject: "user[yourdomain.dom]" // the user that you will login as
  }
);
axios.post(
  `https://yourDomain.com/auth/exchange`,
  new url.URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: oAuthJwt
  }).toString()
).then(response => {
  const { access_token, scope } = response.data
  // send token to front-end
});
```

The response from the exchange request will be

```
application/json { access_token, scope }
```

Send the token and scope back your client, and then use it to login to the Immers Client

```js
const success = await immersClient.loginWithToken(access_token, "yourDomain.com", scope)
```
