# KargoPilot project instructions

- The user explicitly requires every subsequent fix to be uploaded to GitHub as a new version, with the latest APK GitHub link in the final response.
- After a fix to a published version, run `node scripts/bump-version.cjs <next-semver>`, update CHANGELOG.md and RELEASE_NOTES.md, run meaningful checks, commit, push and push the corresponding `v<version>` tag. Initial unreleased implementation iterations remain 1.0.0. Confirm the release workflow has succeeded and the APK asset exists before claiming delivery.
- Keep Android versionCode increasing and preserve the release signing key so users can update installed APKs.
- Never commit .signing, keystores, passwords, credentials, local.properties or shipment data. Signing material is held locally in ignored .signing and in GitHub Actions secrets.
- Do not describe saved, manually marked records or synthetic fixtures as carrier-reported live tracking data. Connected tracking uses the user's personal 17TRACK API key. Do not claim a successful real shipment query without an authenticated response for that shipment.
- API keys must remain in Android Keystore-backed encrypted storage, excluded from backup files and source code. Shared production credentials require a server; never bundle a key in an APK. Never commit the user's real shipment number or private responses.
- Maps show provider-supplied event coordinates only. Do not invent coordinates or present the event map as live courier GPS.
- Verify changes with `npm test`, `:app:testReleaseUnitTest`, Android release compilation and relevant lint checks. Report device testing, native notification delivery and actual carrier API testing separately from Chromium-based tests with mocked bridges.
- No subagents unless the user explicitly asks for delegation.
