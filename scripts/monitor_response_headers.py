#!/usr/bin/env python3
"""Read-only observation of real public response headers; no credentials or payloads.

The repository's site/_headers file is not enforced by GitHub Pages. Report
actual HTTP response observations without claiming that absent headers exist.
"""
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

ROOT = 'https://digitalinsightai.com'
PATHS = ('/', '/guides/', '/tools/', '/contact/')


def audit_headers(final_url, headers):
    """Return (security errors, advisory warnings) based on observed HTTP headers."""
    final = urlsplit(final_url)
    errors = []
    warnings = []
    if final.scheme != 'https':
        errors.append('final response is not HTTPS')
    if final.hostname != 'digitalinsightai.com' or final.port not in (None, 443):
        errors.append('unexpected destination origin')

    observed = {str(k).lower(): str(v) for k, v in headers.items()}
    if 'content-security-policy' not in observed:
        warnings.append('Content-Security-Policy is not observed')
    if observed.get('x-content-type-options', '').lower() != 'nosniff':
        warnings.append('X-Content-Type-Options: nosniff is not observed')
    if not observed.get('referrer-policy'):
        warnings.append('Referrer-Policy is not observed')
    if not observed.get('permissions-policy'):
        warnings.append('Permissions-Policy is not observed')
    if not observed.get('strict-transport-security'):
        warnings.append('Strict-Transport-Security is not observed')
    csp = observed.get('content-security-policy', '').lower()
    xfo = observed.get('x-frame-options', '').strip().lower()
    if 'frame-ancestors' not in csp and xfo not in ('deny', 'sameorigin'):
        warnings.append('frame embedding protection is not observed')
    return errors, warnings


def main():
    errors = []
    for path in PATHS:
        url = ROOT + path
        try:
            req = Request(url, headers={'User-Agent': 'DigitalInsightAI-HeaderMonitor/1.0'})
            with urlopen(req, timeout=14) as response:
                response.read(1)
                found_errors, warnings = audit_headers(response.geturl(), response.headers)
                if response.status != 200:
                    found_errors.append('unexpected HTTP status: ' + str(response.status))
        except Exception as exc:
            errors.append(path + ': public header read failed: ' + type(exc).__name__)
            print('ERROR', path, 'public response unavailable', flush=True)
            continue
        print('CHECK', path, 'HTTPS and destination origin', flush=True)
        for issue in found_errors:
            errors.append(path + ': ' + issue)
            print('ERROR', path, issue, flush=True)
        for advisory in warnings:
            print('WARN', path, advisory, '(hosting policy check needed)', flush=True)
    if errors:
        raise SystemExit('Response security monitor detected ' + str(len(errors)) + ' transport/origin errors.')
    print('PASS: HTTPS/origin checks on public routes. Missing security headers remain advisory, not claimed enforced.')


if __name__ == '__main__':
    main()
