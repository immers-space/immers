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

## Create user accounts

User accounts can be created programatically without passwords (disabling direct login)

```
Post  https://yourDomain.com/auth/user` application/json { username, email }
```

## (server-side only) Exchange service JWT for user access token

Your admin private key must be kept private on your server and never sent to the client.
Sign a JWT and send it as a OAuth2 token exchange to retrieve a user access token.

```js
jwt.sign(
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

```
POST https://yourDomain.com/auth/exchange application/x-www-form-urlencoded
{
  grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
  assertion: jwt
}
```

The response from the exchange request will be

```
application/json { access_token, scope }
```

Send the token and scope back your client, and then use it to login to the Immers Client

```js
const success = await immersClient.loginWithToken(access_token, "yourDomain.com", scope)
```
