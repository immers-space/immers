## v5.1.1 (2023-10-03)

### Fixed
* Update activitypub-express to address Mastodon and Hubzilla compatability issues
* Updated dependencies

## v5.1.0 (2023-05-18)

### Added

* SSO login username templates: streamline new user registration via SAML/OIDC by
automatically selecting username using user profile data from the identity provider.
Setting available in Admin UI for adding/editing identity provider clients, `/admin/oidc`
### Fixed

* Fix SAML SSO intermittently not redirecting properly in Chrome, leaving popup open after login and failing to return token to opener
* Add user feedback when an SSO client cannot be added due to duplicate domain conflict
* Fix URL Link option for SAML client metadata entry not working
* Fix duplicate local client registration handling

### Chore

* Updated dependencies
* Dependencies not able to be updated:
  * @small-tech/auto-encrypt@4 - requires node at >=18
  * migrate-monogo@9 - poorly documented changes; no clear benefit to update
  * mongodb@5 - multiple peer dependencies still requiring v4
  * oidc-provider@8 - not currently in use, skipped for now
  * parse-domain@6 - changed to ESM only, would require refactor for async import
  * request - no patch released yet for GHSA-p8p7-x288-28g6

## v5.0.3 (2023-03-29)

### Fixed

* When using SSO with passEmailToHub, email will now be passed whenever it is available
(i.e. when logging in again via SSO) instead of just on initial login. This can help with
recovery from bad SSO states - just force a logout from the immer
(with `POST /auth/logout` or with `logout(true)` from immers-client >=2.16.0)
and login again.

## v5.0.2 (2023-02-28)

### Fixed

* Update undici nested dependency for audit fix
* Additional logging for SSO requests to help debug

## v5.0.1 (2023-02-07)

### Fixed

* Fixed SSO logins through the account merge flow (with approval e-mail) failing to redirect properly and not completing the login

## v5.0.0 (2023-02-02)

**Includes migration**: It's reversible with failsafes to avoid data loss, but backup that database before applying just to be safe

### Added

* Added support for login via SAML. SAML clients can be added/edited alongside OIDC clients at `/admin/oidc`
* Added instructions and guidance for OIDC and SAML client setup in the add client screen at `/admin/oidc`
* Add OAuth2 clients from other immers to the listing at `/admin/oidc`

### Changed

* Remote clients / identity providers data restructured to all reside in same collection
* Admin api methods updated to new data structyre
* Local dev will now generate self-signed certs automatically, removed obsolete env vars for specifying cert location

### Security

* Package updates to resolve all npm audit findings. Includes breaking change to passtportjs with code migrations

## v4.2.0 (2022-12-21)

### Added

* When new users register on your immer, some additional data is now returned in the authorization response to your site: `isNewUser`, `provider` (their login provider if using OIDC else `email`). With immers-client >=2.14.0, this will be available from `immersClient.sessionInfo` after login ([reference](https://immers-space.github.io/immers-client/ImmersClient.html#sessionInfo)).
* `passEmailToHub` environment config, when `true` the cleartext email is included with the above sessionInfo, and the email data safety message is omitted from the registration page.

### Fixed

* Fix Facebook OIDC by dropping request for currently unused `profile` scope from all OIDC authorization requests


## v4.1.1 (2022-12-07)

### Fixed

* Fix email unable to send when smtpPort is a string

## v4.1.0 (2022-12-01)

### Added

* OpenID Connect account merge: allow OIDC login when an account already exists with that email
  * Sends an email to the address to get user authorization for the new provider
  * Displays an interstitial page explaining the situation
  * User is logged in and proceeds to destination once the email link is clicked
* SMTP OAuth authentication
  * Support service acount login (2-legged OAuth) to mail service by specifying `smtpClient` and `smtpKey` evironment variables in place of `smtpPassword`

### Fixed

* Avatar changes made from profile page correctly reflected on other ActivityPub platforms (immers-client update)
* Update activitypub-express to eliminate unindexed activty.object.object query on Update

## v4.0.2 (2022-11-23)

### Fixed

* Enable CORS for hub domains for `GET /auth/oidc-providers`
* Rendering of profile for users with no avatar model
* Unable to click enter AR button on models with long names
* Error with controlled account authorization when multiple redirectUris are registered

## v4.0.1 (2022-11-16)

### Fixed

* Properly escape custom theme string in server data to prevent rendering issue with newlines

## v4.0.0 (2022-11-04)

### Added

* 🎨 Theme Editor (`/admin/theme`) - Choose from 4 base themes and then customize with css custom properties via our live editor
* ✏️ Profile editing: Users can now edit their Display name and Bio from the web interface.
* 🚮 Remove avatar: Users can now remove Avatar models from their Avatar collection from the web interface (Does not delete the Avatar).

### Changed

* Total refactor of the Web client views to use Pico.css instead of aesthetic.css
  * **Breaking**: Many class and hierarchy changes, any existing customCSS will likely need refactoring (or replace via new theme editor)
  * **Breaking**: Default theme is now simple and modern with automatic light and dark modes. If you liked the old theme, check out our new "Web95" theme in the theme editor
* **Breaking**: Package-lock updated to v2, recommend npm >=7/node 16 for reliable installs.
  * Migrated SPA routing to `react-router` to resolve the last peer-dependency conflict
  * Dockerfile updated to build from Node 16
* Admin routing changed: `/admin` now lists admin views, OIDC client list moved to `/admin/oidc`

### Fixed

* Fixed the timestamp post link not working for posts from other servers

## v3.6.0 (2022-10-11)

### Changed

* Improved OAuth flow: for an authorization request where the user's identity is already known and that user is from another server, skip the local login page and redirect straight to their home login page (still do provider discovery and dynamic client registration along the way).

### Fixed

* Remote logins now possible when using custom login page, as long as user's handle is included in the authorization request query parameters (`me=username[immer.com]`). Note this query param is set automatically when using the immers-client's `<immers-hud>` or when including handle in calls to `immersClient.login()`

## v3.5.1 (2022-10-05)

### Fixed

* fixed broken images in posts displayed in profile if the image url was a Link object
* fixed missing open graph image tag on image post pages

## v3.5.0 (2022-09-29)

### Added

* Proxy logins: Enable users with controlled accounts to still use their portable
identities throughout the metaverse.
  * Alternate version of `POST /auth/login` for controlled accounts that uses service account authentication instead of password
[More info](./doc/ControlledAccounts.md#logging-in-a-controlled-account)
  * Configuration option to redirect to a custom login page for controlled accounts [More info](./doc/ControlledAccounts.md#custom-login-redirect)
* Configuration option to alter session cookie id
* Support custom Activity vocabulary extensions via `additionalContext` config option

## v3.4.0 (2022-09-16)

**Urgent update**: Your SSL certificates may not be able to renew
until you apply this update

### Changed
* Updated auto-encrypt dependency to fix error generating certificates.

## v3.3.2 (2022-08-26)

**Includes migration**. Backup database before starting your server with this update.
If using [immers-app](https://github.com/immers-space/immers-app) update scripts,
a backup will be generated for you.

**Includes new index**. [Activitypub-Express udpate](https://github.com/immers-space/activitypub-express/blob/master/CHANGELOG.md#v330-2022-08-11) indlude a new
index added for nested object updates, expect a one-time longer
than usual restart time when applying this update
(server may not show any logs during this time)

### Added

#### Destination history
* Adds 2 new collections to users to get aggregated inbox/outbox
Arrive activities for recent, unique destinations from your history (/u/username/destinations)
or your friends' history (/u/username/friendsDestinations).
* New destinations tabs on user profile pages display destination history

#### File upload and sharing

* Support uploading files with Create activities.
* When discovering avatars from other immers,
the files can now be uploaded to and served from the users' home immer to ensure they
can CORS fetch it from anywhere they go and that it remains available even if the source
server does not.
* Uses MongoDB GridFS for file storage, so no additional configuration is required.
* [See `ImmersClient.createAvatar`](https://immers-space.github.io/immers-client/ImmersClient.html)
for a convenience wrapper or `/media` endpoint
(which follows [ActivityPub standard](https://www.w3.org/wiki/SocialCG/ActivityPub/MediaUpload))
for direct use.
* Stored files are automatically deleted when the related post is removed with a `"Delete"` activity
* New environment variable setting `maxUploadSize`, default 20 Mb

#### Social Shares

* OpenGraph tags added to profile and activity pages to provide previews when links are
shared on other social sites.
* `<Model-Viewer>` now used for avatar or other 3D model previews, including interactive
social previews on sites that support Twitter Player Cards (e.g. Mastodon)
* Sharing your profile page link, e.g. https://immers.space/u/datatitian, will show
a preview of your current avatar

### Changed

* Include the specified favicon in the `/o/immer` object that represents this immer
* Each user can now receive live streaming updates to multiple clients simultaneously when
logged into more than one immer at once

#### Web Client / Profile pages improvements

* New Avatars tab displays avatar collection and allows chanding current avatar
* New destinations tabs on user profile pages display destination history
* Friends list now updates in real time
* Can now display individual activities or objects when navigating to their IRI
* New expanded location post view with image previews for destination tabs and individual activity pages
* Long posts text will now wrap instead of stretching the interface
* Post media is scaled to fit on small displays
* Improve how handles are inserted when clicking immer links to prevent sharing links with your handle
* Immer links now include the destination immer's icon if available
* Deep links in user profiles will redirect if the tab isn't available intead of erroring
* Incrementally porting over to use ImmersClient

## ~~v3.3.1 (2022-08-26)~~ YANKED
## ~~v3.3.0 (2022-08-26)~~ YANKED

* Yanked due to error in migration script. If you deployed this, restore from backup or use `migrate-mongo down` to reverse the migration
## v3.2.0 (2022-07-15)

### Added

* OpenID Connect client. Users can now login to your immer using any OpenID Connect
identity provider instead of a password. OIDC providers can be automatically
discovered based on user's immer domain entered on the login screen or manually configured.
See [docs](doc/OpenIdConnectProviders.md).
* Initial admin interface. Set new `adminEmail` environment variable to designate
the account that can access `/admin`
* Admin interface: OpenID Connect Clients. Add, edit, and delete OIDC clients.
Choose which clients get their own special login button.

## v3.1.0 (2022-06-23)

### Added

* New `blocked-update` socket event fires whenever a user's blocklist chagnes (users added or removed)
### Changed

* Reorganized `auth.js` into `oauthClient.js`, `oauthServer.js`, and `resourceServer.js`. No api changes.
* `friends` endpoint now filters out any activity from users that have been blocked
* `friends-update` socket event now fires when blocklist changes
* Unblocking can be achieved by sending an Undo with the actor IRI as the object
if you don't have the original Block activity IRI handy (via updated activitypub-express)

## v3.0.0 (2022-05-18)

### Breaking Changes

* Include pending, outgoing friends requests in response from `/u/:actor/friends` endpoint. In these activities, the `object` field will be populated with the requestee actor object - this may break existing code that expects `actor` to be populated with an object as is the case with all other activities in this response

### Added

* Support for multiple `hub` domains, each will be enabled for CORS and OAuth client redirectURIs
* Added keyboard 'Enter' handling for Immers handle and password fields on login.
* Added ability for authorized service accounts to obtain tokens on behalf of users via 2-legged OAuth JWT exchange. [More info](./doc/ControlledAccounts.md)
* New socket event `outbox-update` fires with activities posted to the user's outbox

### Changed

* Skip waiting for user input and automatically redirect to home immer when opening the login view and the user's handle is already known and the user is from a different immer.
* When public registration is disabled, `/auth/user` can still be POSTed when a service account JWT is provided as a bearer token
* Password is no longer required for `/auth/user` POST (direct login will not be possible for the user account unless a password is set later)

## 2.2.1 (2022-05-04)

### Fixed

* Fix incorrect package lock breaking signature verification on incoming messages

## 2.2.0 (2022-05-03) - [YANKED]

### Added

* New configuration options `enablePublicRegistration` and `enableClientRegistration` that can be altered to limit access to your immer (default behavior remains unchanged)

## 2.1.2
* Fix an issue causing migrations to fail if a system user was in use
* Fix system users not have full immers actor config
* Dependency update to fix audit alert
* Support more database setups (Mongo Atlas, credentials) by changing db config to use full connection string via `dbString` env var (keep backwards compat for `dbHost`/`dbName`/`dbPort` config)

## 2.1.1
* Fix issue with federated delivery not resuming after migration

## 2.1.0 nodeinfo and proxy services
* Update stale dependencies and resolve most audit issues
* Finally on to Parcel v2 (had to change out the HTML sanitizer for it to work)
* New federation feature: nodeinfo standard is implemented to allow discovery of server and features from other servers/crawlers
* New features: proxy services. Both the ActivityPub standard POST proxy (for AP objects) and a more general GET proxy to help with CORS
* **Migration**: update actor's `endpoints` with `proxyURl` and `OAuthAuthorization`; `streams` with `blocklist`

See GitHub releases for previous versions release notes
