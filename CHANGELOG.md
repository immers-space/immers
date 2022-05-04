## 2.2.1 (2022-05-04)

### Fixed

* Fix incorrect package lock breaking signature verification on incoming messages

## 2.2.0 (2022-05-03) - [YANKED]

### Added
* Support for `hub` configuration option to be a comma separated list of CORS domains

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