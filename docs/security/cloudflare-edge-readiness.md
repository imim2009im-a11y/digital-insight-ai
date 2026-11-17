# Cloudflare edge security — evidence, release gates and safe rollback

**As of:** 2026-10-31. **Status: NOT DEPLOYED.** This guide covers `digitalinsightai.com`, which has a canonical GitHub Pages static source in `site/`.

## Verified vs unverified

**Verified in repository:**
- [Issue #56](https://github.com/imim2009im-a11y/digital-insight-ai/issues/56) records missing HTTP security headers despite `site/_headers`.
- `site/DEPLOY.md` correctly documents that GitHub Pages does **not** interpret `_headers` and `_redirects` as routing/header rules.
- `site/_headers` declares HSTS, CSP, frame, MIME, referrer and permissions policy **for compatible hosting only**; that file does not prove any live response behavior.
- Issue [#104](https://github.com/imim2009im-a11y/digital-insight-ai/issues/104) still requires independent DNS, TLS, origin and deployed artifact provenance.
- `scripts/edge_headers_audit.py` observes public response **headers** without using accounts/secrets. Offline tests are deterministic. No output displays raw response header values.

**Not verified (do not infer from source or historical evidence):**
- Whether the domain currently uses Cloudflare authoritative nameservers or proxy, any Cloudflare account's zones/rulesets, WAF/Access settings, DNSSEC, origin TLS or Cloudflare plan.
- Whether the **current** public HTTP response on the canonical domain has any of the required protections. A cached webpage rendering is not a live header observation.
- Whether any third-party routes, blog, forms, API or subdomain would break under a new CSP/HSTS rule.

## Evidence collection (no changes)

1. Confirm the parent-zone NS delegation and authoritative A/AAAA/CNAME/MX/TXT/CAA/DS record inventory through the registrar and at least one resolver. Do not move nameservers or alter MX/TXT/DNSSEC.
2. Verify `https://digitalinsightai.com/`, `/contact/`, `/privacy/`, `/404.html`, `https://www.digitalinsightai.com/` when applicable: status, TLS SAN/expiry, redirect chain, caching and relevant HTTP response headers.
3. Verify the actual production owner (GitHub Pages or another origin) with DNS + HTTP + deployed artifact evidence, not merely HTTP 200.
4. Inspect connected Cloudflare zone/account settings **only when the owner separately authorizes access**. Do not print tokens, WAF event PII or cookies.
5. Run `python3 scripts/edge_headers_audit.py --live`. This reports `PRESENT`, `WEAK`, `NOT_PRESENT` or `NOT_VERIFIED`. Running `--strict` is a deliberate release gate and can fail while #56 is open. A fixture report is labelled `LOCAL_FIXTURE_NOT_LIVE` and is not proof of production headers.

## Decision: is Cloudflare actually the edge?

- **Not onboarded / DNS-only:** No Cloudflare Transform/WAF enforcement exists for a hostname that is not proxied. Do not claim a `_headers` file activates it.
- **Existing active proxied zone:** After confirming account ownership and plan entitlement, evaluate Cloudflare **Response Header Transform Rules** on a staged host/route with independent HTTP-header verification.
- **New Cloudflare onboarding:** HIGH-risk production change. Obtain explicit per-action approval for nameservers/DNS/TLS; inventory mail and subdomains, CAA/DS records and DNSSEC, record a rollback path, then verify before/after. Do not automatically migrate hosting, add new paid resources, or trigger a redeploy.

Cloudflare documentation: [Transform Rules availability](https://developers.cloudflare.com/rules/transform/), [Response Header Transform Rules](https://developers.cloudflare.com/rules/transform/response-header-modification/), [DNS setup](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/).

## Header policy (design, not enabled)

- `X-Content-Type-Options: nosniff`: suitable for the static site after confirming correct MIME types.
- `Referrer-Policy: strict-origin-when-cross-origin`: test navigation to contact/affiliate links.
- `X-Frame-Options: DENY`: only if no intended embedding.
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`: only if the site does not need these browser features.
- `Content-Security-Policy`: derive from **observed** scripts/styles/images/forms/frames, including Formspree and any third-party destinations. Roll out via `Content-Security-Policy-Report-Only` if suitable, then enforce after confirming contact submissions, local assets and navigation. `frame-ancestors` **must** be in a response header; an HTML CSP meta tag cannot supply frame protections.
- `Strict-Transport-Security`: do **not** start with `includeSubDomains` or preload without validating every subdomain and certificate. Trial a short `max-age` only after HTTPS and origin connectivity are proven; increase after stable verification. HSTS mistakes can cause browser-side lockout.

Cloudflare Managed Transform “Add security headers” may use values that differ from the required policy and can affect behavior. Review the actual response before relying on it. Do not cache authenticated/admin/API responses publicly and do not assume a CSP/CORS header is authentication.

## Conditional Cloudflare rule scope and rollback

1. Prepare the precise host expression after confirming the zone and which hostnames are proxied; don't apply to unrelated domains/APIs.
2. Compare existing Transform/Managed rules and rule order before adding anything; conflicting later rules can overwrite earlier ones.
3. Test a non-critical path or staging host first. Confirm live HTTPS response headers, content/forms and mobile; inspect Cloudflare event logs for false positives.
4. Roll out one control family at a time under an approved change plan. For any adverse behavior, disable **the specific new rule only**, verify headers/site health, then investigate. DNS/NS migration rollback is a separate registrar-coordinated procedure, not a simple rule toggle.
5. Evidence required to close #56: the actual production origin and path, live headers after rollout, screenshots/logs with sensitive content removed, compatibility tests, timestamp and reviewed rollback steps. Do not close solely because CI passes.

## Other risks out of scope of edge controls

The Render publisher scheduler `401`, ephemeral job storage, and uncertain pending publications are **application/data-boundary** problems, not fixable by Cloudflare WAF, response header rules or DNS. Keep [incident #101](https://github.com/imim2009im-a11y/digital-insight-ai/issues/101) open until separate recovery gates pass. Do not proxy or change the `onrender.com` publisher origin as a substitute for fixing its authentication.

**Release decision:** NO-GO for Cloudflare configuration changes without a confirmed active zone, approved DNS ownership path, working origin TLS and a tested rollback. Draft source and tests are safe to review separately; no live security enforcement is claimed.
