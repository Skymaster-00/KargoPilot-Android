# KargoPilot project instructions

- The user explicitly requires every subsequent fix to be uploaded to GitHub as a new version, with the latest APK GitHub link in the final response.
- After a fix to a published version, run `node scripts/bump-version.cjs <next-semver>`, update CHANGELOG.md and RELEASE_NOTES.md, run meaningful checks, commit, push and push the corresponding `v<version>` tag. Initial unreleased implementation iterations remain 1.0.0. Confirm the release workflow has succeeded and the APK asset exists before claiming delivery.
- Keep Android versionCode increasing and preserve the release signing key so users can update installed APKs.
- Never commit .signing, keystores, passwords, credentials, local.properties or shipment data. Signing material is held locally in ignored .signing and in GitHub Actions secrets.
- Do not describe saved or manually marked records as carrier-reported live tracking data. This version opens carrier portals; it does not poll carrier APIs.
- Verify changes with `npm test`, Android release compilation and relevant lint checks. Report device testing separately from Chromium-based interface tests.
- No subagents unless the user explicitly asks for delegation.
