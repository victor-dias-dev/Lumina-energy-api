# Security Policy

## Reporting a vulnerability

Please report security issues privately through [GitHub security advisories](https://github.com/victor-dias-dev/lumi-energy-bill-api/security/advisories/new). Include steps to reproduce, the impact, and the commit or version you tested.

Do not open a public issue for an exploitable bug, a leaked API key, or anything that would let someone spend the Gemini quota or read stored bills.

## Secrets

`GEMINI_API_KEY` and `API_KEY` stay in the environment. `.env` is gitignored. A public demo needs `API_KEY` set, otherwise `POST /bills/upload` is open.

`DATABASE_SSL` disables TLS only for a database you run yourself. Managed Postgres on Render keeps the default, which does not verify the certificate (`rejectUnauthorized: false`). That is a limitation of that provider's connection string, not the setting to copy onto other hosts.
