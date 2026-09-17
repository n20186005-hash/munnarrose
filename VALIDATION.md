# Validation status

The project source is structurally complete, but this execution environment cannot resolve `registry.npmjs.org`, so dependency installation and generation of a genuine `pnpm-lock.yaml` could not be performed here. A fabricated lockfile is intentionally not included because it would violate `--frozen-lockfile` reproducibility.

Run in a networked environment:

```bash
corepack prepare pnpm@12.4.2 --activate
pnpm install
rm -rf node_modules
CI=1 pnpm install --frozen-lockfile
pnpm check
pnpm build
grep -RIE "example\\.com|localhost|chrome-extension://" dist && exit 1 || true
```

When `SITE_URL` is empty, sitemap integration is disabled by design. After setting a real domain in `astro.config.mjs`, rebuild and inspect generated sitemap URLs.
