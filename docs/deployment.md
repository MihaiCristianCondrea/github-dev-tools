# Deployment

The app is deployed as a GitHub Pages repository site at the `/github-dev-tools/` base path.

## Build settings

- `vite.config.js` sets `base: "/github-dev-tools/"` so built asset URLs resolve under the repository path.
- `package.json` builds with `npm run build`, which runs TypeScript before `vite build`.
- `.github/workflows/deploy.yml` runs on pushes to `master` and on manual workflow dispatch.

## GitHub Pages workflow

The deployment workflow:

1. Checks out the repository.
2. Sets up Node.js 22 with npm caching.
3. Installs dependencies with `npm ci`.
4. Builds the site with `npm run build`.
5. Uploads `dist` as the Pages artifact.
6. Deploys the uploaded artifact with `actions/deploy-pages`.

This is the expected static-site shape for a Vite app deployed to GitHub Pages.

## Troubleshooting 404s

A generic browser 404 is not enough to identify the problem. Always capture the exact missing URL from DevTools Network first.

Common causes:

- **Stale HTML with deleted hashed assets**: a cached `index.html` may reference an older file such as `assets/index-abc123.js` after a newer deployment replaced it.
- **Secondary runtime requests**: app code may fetch external JSON, images, GitHub API URLs, or other resources after the main bundle loads.
- **Deployment/source mismatch**: the live Pages artifact may not correspond to the repository snapshot currently being inspected.
- **Wrong base path**: less likely here because Vite is configured for `/github-dev-tools/`, but still verify built URLs if the repo name changes.

## When the live site and repo disagree

If console behavior does not match the source currently visible in GitHub:

1. Open the latest successful Pages workflow run and record its commit SHA.
2. Compare that SHA with the branch head you are inspecting locally.
3. Hard-refresh the page or test in a private window to bypass cached HTML.
4. In DevTools Network, disable cache and reload.
5. Check the loaded JavaScript bundle name and source map, if available, to confirm which artifact is running.

## Material Web deployment note

Material Web is a build-time dependency. The deployed app should not depend on live CDN module transforms for core UI startup. If Material dependency installation fails in CI, the build should fail before deployment instead of producing a page that can crash at runtime.
