# Publishing SecureBlue Chat

Two independent listings are prepared here. They can coexist, but a phone can
only have one of them installed at a time, because each is signed with a
different key.

| Route | Review | Signing key | Where users find it |
|---|---|---|---|
| **Own repository** (ready to go) | none | yours | they add your URL |
| **Official F-Droid** (optional) | 1-4 weeks | F-Droid's | built into every client |

---

## Part 1 - your own F-Droid repository

### What is already prepared

| File | Purpose |
|---|---|
| `LICENSE` | GPL-3.0, required for any F-Droid listing |
| `.gitignore` | keeps build output and **signing keys** out of git |
| `fastlane/metadata/android/en-US/` | app title, descriptions, changelog, screenshot |
| `.github/workflows/fdroid-repo.yml` | builds a signed APK and publishes the repo to GitHub Pages |
| `release-signing/` | **local only, never commit** - two keystores + passwords |
| `f-droid/com.bca.securebluechat.yml` | metadata for the official submission |
| `README.md` | public-facing project page |
| `keystore.properties` | lets `assembleRelease` sign locally |

The release APK is already built and verified:
`app/build/outputs/apk/release/app-release.apk`
Certificate SHA-256: `28:7F:36:94:9B:68:FD:6C:EE:E7:E7:24:51:45:57:DD:79:5E:82:66:F5:F2:3C:9D:3A:35:63:CF:51:FA:65:0A`

### Step 1 - create the public repository

Create an empty **public** repo named `securebluechat` on GitHub, then:

```powershell
cd C:\Users\Neel\Projects\SecureBlueChat
git remote add origin https://github.com/sakurabun/securebluechat.git
git push -u origin main
git push origin v1.0
```

### Step 2 - add four repository secrets

*Settings -> Secrets and variables -> Actions -> New repository secret*

| Secret | Value comes from |
|---|---|
| `APP_KEYSTORE_BASE64` | `release-signing/secret-android-keystore-base64.txt` |
| `REPO_KEYSTORE_BASE64` | `release-signing/secret-fdroid-keystore-base64.txt` |
| `APP_KEYSTORE_PASSWORD` | `release-signing/credentials.txt` |
| `REPO_KEYSTORE_PASSWORD` | `release-signing/credentials.txt` |

Copy the whole single-line contents of the `*-base64.txt` files. Never commit
those files - `.gitignore` already blocks them.

### Step 3 - enable Pages

*Settings -> Pages -> Source: Deploy from a branch -> Branch: `gh-pages` / root.*

The branch is created by the first workflow run. If the option is greyed out,
run the workflow once (Actions tab -> *Publish F-Droid repository* -> Run
workflow), then set it.

### Step 4 - publish

Pushing a tag runs the workflow. Pushing a new tag is also how you ship an
update:

```powershell
# bump versionCode/versionName in app/build.gradle.kts first
git tag v1.1
git push origin v1.1
```

### Step 5 - install from your repo

1. Open F-Droid, *Settings -> Repositories -> +*.
2. Add `https://sakurabun.github.io/securebluechat/repo`.
3. Pull to refresh, search **SecureBlue Chat**, install.

The repository fingerprint shown by F-Droid can be compared against the repo key
in `release-signing/credentials.txt` if you ever need to prove it is yours.

---

## Part 2 - official F-Droid (optional)

1. Fork <https://gitlab.com/fdroid/fdroiddata>.
2. Copy `f-droid/com.bca.securebluechat.yml` to
   `metadata/com.bca.securebluechat.yml`.
3. Commit, push to your fork, open a merge request titled
   "New app: SecureBlue Chat".
4. Answer the reviewers. They build from the `v1.0` tag; the build must work with
   no `keystore.properties` and no `local.properties`, which is why signing is
   optional in `app/build.gradle.kts`.

Things reviewers commonly ask for:

* a tag that matches the version code in the APK;
* confirmation that the app has no tracking and needs no network permission;
* a note on why Bluetooth permissions are required.

Nothing in the project needs changing for this - the APK produced from a clean
checkout is unsigned, and F-Droid signs it with their own key.

---

## Key management

`release-signing/` holds two keys:

* `securebluechat-release.jks` - signs the app. Lose it and existing installs can
  never be updated, only uninstalled and replaced.
* `fdroid-repo.jks` - signs the repository index. Lose it and every user gets a
  "repository signature changed" error.

Copy the whole folder to two offline places (USB stick, password manager
attachment). `credentials.txt` contains the passwords.

If a key does leak, the only remedy is a new applicationId - you cannot reissue
the same package.
