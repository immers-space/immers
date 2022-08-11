# Setting up OpenID Connect Providers

This describes setup for OpenID identity providers - services that
can verify user identity to provide a means of logging in other than
entering a password on your immer. These users will still get accounts
on your immer and their immers handle will be on your domain.

For providers that support
[Dyanmic Client Registration](https://openid.net/specs/openid-connect-registration-1_0.html),
no action is needed.
This providers will be configured automatically the first time a user enters
their domain in the login screen. For providers requiring manual client
registration, follow these steps.

### 1. Manual sign up with the provider

Follow providers instructions to create a client.

**For your redirect_uri**, register `https://yourdomain.com/auth/return`

Record the following for later entry: `client_id`, `client_secret`,
and the provider domain (or discovery document url)



### 2. Create admin user in Immers

If you haven't already made an admin user, update your .env file to include
`adminEmail=youremail@domain.com` and restart the server (`docker-compose up -d`).
The user account registered with that email will be update to administrator if it exists
or will be an administrator upon registration if it does not yet exist.

### 3. Enter client info in Immers admin interface

1. Login to your Immers Server as the admin user.
2. From your profile, click the 👸 icon in the system tray or naviate to
`/admin` on your domain to view the admin interface.
3. Click "Add OpenID Connect Client"
4. Enter a name to recognize this client
5. Enter provider domain, client id, and client secret from above
6. (optional) Fill out "Optional Login Button" section to add button to login screen

For providers that support
[OpenID Provider Issuer Discovery](https://openid.net/specs/openid-connect-discovery-1_0.html#IssuerDiscovery),
the login button is optional as the provider can be discovered from the users handle.
For other providers, complete this section to give them their own login button.
Icons uploaded to your static folder
(`~/immers` when using [Immers App](https://github.com/immers-space/immers-app))
can be referenced as `/static/filename.png`.

### Finished

User can now use their OpenID Connect provider to login to your immer!
After their first login, they'll be prompted to choose a username and
an immerser account will be created for them on your immer.
