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

## Logging in a controlled account

For controlled accounts to be able to use their identities on other federated immers servers,
users will need to be able to create a logged-in session. A simple option is to allow
users to set a password after controlled account creation using the existing forgot password
flow - this will work automatically as long as your config inluduces SMTP mail settings.
For a more seamless experience, you can also log users in by using your service account credentials.

**Requirements:**
* Your application API server and your immers server must be on the same apex domain
* If your application API server is not on the same origin as your web application, it must
set CORS headers `Access-Control-Allow-Origin` (specific origin required, not just `*`), and
`Access-Control-Allow-Credentials: true`
* If your application API server is not on the same origin as your web application,
the client side fetch must specify `credentials: include`

### Server-side

```js
const { readFileSync } = require('fs')
const jwt = require('jsonwebtoken')
const cors = require("cors")
const axios = require('axios') // any request library will do
const immersAdminPrivateKey = readFileSync('immersAdminPrivateKey.pem')

const proxyLogin = [
  cors({
    origin: 'https://hub.yourdomain.com', // make this match the origin of your web application
    credentials: true
  }),
  yourUserAuthenticationMiddleware,
  (req, res, next) => {
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
        subject: "user[yourdomain.dom]" // the authenticated user that you will login as
      }
    )
    axios({
      method: "post",
      url: `https://yourDomain.com/auth/login`,
      headers: { Authorization: `Bearer ${oAuthJwt}` }
    }).then(response => {
      // forward the login session cookie
      res.set("Set-Cookie", response.headers["set-cookie"]);
      res.sendStatus(200);
    }).catch(next)
  }
]
```

### Client-side
```js
fetch('https://application-api-server.com/proxy-login', {
  method: 'POST',
  credentials: 'include',
  // also include credentials necessary to authenticate this user
})
```
