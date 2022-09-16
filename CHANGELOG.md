## Unreleased

**Urgent update**: Your SSL certificates may not be able to renew
until you apply this update

### Added

* Support custom Activity vocabulary extensions via `additionalContext` config option

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