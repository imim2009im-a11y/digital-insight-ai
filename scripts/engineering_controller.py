#!/usr/bin/env python3
"""Bounded local repository metadata inventory; never executes repository code."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import stat

MANIFESTS = {'package.json', 'package-lock.json', 'pyproject.toml',
             'requirements.txt', 'Cargo.toml', 'go.mod', 'Gemfile'}
POLICIES = ('SECURITY.md', 'CONTRIBUTING.md', 'LICENSE')
EXCLUDE = {'.git', 'node_modules', '.venv', 'venv', '__pycache__', 'vendor', 'dist', 'build'}


def inspect_repository(root, *, max_entries=4000, max_files=128,
                       max_file_bytes=262144, max_total_bytes=4194304, max_depth=5):
    """Read allowlisted regular files via no-follow descriptors on POSIX systems."""
    limits = (max_entries, max_files, max_file_bytes, max_total_bytes, max_depth)
    ceilings = (4000, 128, 262144, 4194304, 5)
    if any(not isinstance(value, int) or not 1 <= value <= ceiling
           for value, ceiling in zip(limits, ceilings)):
        raise ValueError('invalid scan limit')
    report = {
        'schema_version': 1, 'controller': 'Digital Insight AI — GitHub Engineering Controller',
        'status': 'VERIFIED', 'scope': 'bounded local metadata inventory only',
        'manifests': [], 'workflows': [], 'policies': dict.fromkeys(POLICIES, 'MISSING'),
        'account_checks': dict.fromkeys(('2fa', 'branch_protection', 'billing', 'apps',
                                        'dependency_alerts', 'secret_scanning'), 'NOT ACCESSIBLE'),
        'entries_examined': 0, 'symlinks_skipped': 0, 'truncated': False,
        'read_errors': 0,
        'limits': dict(zip(('entries', 'files', 'file_bytes', 'total_bytes', 'depth'), limits)),
    }
    remaining = {'bytes': max_total_bytes, 'files': max_files}
    dir_flags = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW

    def inventory_file(directory, name, parts, kind):
        path = '/'.join(parts)
        entry = {'path': path, 'status': 'VERIFIED'}
        try:
            descriptor = os.open(name, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK,
                                 dir_fd=directory)
            with os.fdopen(descriptor, 'rb') as source:
                before = os.fstat(source.fileno())
                if not stat.S_ISREG(before.st_mode):
                    raise OSError('unsupported file')
                if before.st_size > max_file_bytes or before.st_size > remaining['bytes']:
                    entry['status'] = 'TOO_LARGE'
                else:
                    data = source.read(min(max_file_bytes, remaining['bytes']) + 1)
                    remaining['bytes'] -= len(data)
                    after = os.fstat(source.fileno())
                    if len(data) > max_file_bytes or remaining['bytes'] < 0:
                        entry['status'] = 'TOO_LARGE'
                    elif (before.st_size, before.st_mtime_ns) != (after.st_size, after.st_mtime_ns):
                        entry['status'] = 'CHANGED_DURING_READ'
                    else:
                        entry.update(size_bytes=len(data), sha256=hashlib.sha256(data).hexdigest())
                        if name == 'package.json':
                            try:
                                package = json.loads(data)
                                if not isinstance(package, dict):
                                    raise ValueError('invalid package')
                                groups = [package.get(key, {}) for key in
                                          ('dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies')]
                                if any(not isinstance(group, dict) for group in groups):
                                    raise ValueError('invalid dependency map')
                                entry['dependency_count'] = len(set().union(*(group.keys() for group in groups)))
                            except (ValueError, UnicodeError, RecursionError):
                                entry['status'] = 'MALFORMED'
        except OSError:
            entry['status'] = 'NOT ACCESSIBLE'
            report['read_errors'] += 1
        if entry['status'] != 'VERIFIED':
            report['status'] = 'PENDING'
        report[kind].append(entry)

    def walk(directory, prefix=()):
        try:
            with os.scandir(directory) as entries:
                for entry in entries:
                    if report['entries_examined'] >= max_entries:
                        report['truncated'] = True
                        return
                    report['entries_examined'] += 1
                    name, parts = entry.name, prefix + (entry.name,)
                    try:
                        mode = entry.stat(follow_symlinks=False).st_mode
                        if stat.S_ISLNK(mode):
                            report['symlinks_skipped'] += 1
                            if not prefix and name in POLICIES:
                                report['policies'][name] = 'NOT ACCESSIBLE'
                            continue
                        if stat.S_ISDIR(mode):
                            if name in EXCLUDE:
                                continue
                            if len(parts) >= max_depth:
                                report['truncated'] = True
                                continue
                            child = os.open(name, dir_flags, dir_fd=directory)
                            try:
                                walk(child, parts)
                            finally:
                                os.close(child)
                        elif stat.S_ISREG(mode):
                            if not prefix and name in POLICIES:
                                report['policies'][name] = 'PRESENT'
                            kind = 'manifests' if name in MANIFESTS else None
                            if prefix == ('.github', 'workflows') and name.endswith(('.yml', '.yaml')):
                                kind = 'workflows'
                            if kind:
                                if remaining['files'] <= 0:
                                    report['truncated'] = True
                                else:
                                    remaining['files'] -= 1
                                    inventory_file(directory, name, parts, kind)
                        elif name in MANIFESTS or (prefix == ('.github', 'workflows')
                                                  and name.endswith(('.yml', '.yaml'))):
                            kind = 'manifests' if name in MANIFESTS else 'workflows'
                            if remaining['files'] > 0:
                                remaining['files'] -= 1
                                report[kind].append({'path': '/'.join(parts), 'status': 'NOT ACCESSIBLE'})
                            else:
                                report['truncated'] = True
                            report['read_errors'] += 1
                    except OSError:
                        report['read_errors'] += 1
        except OSError:
            report['read_errors'] += 1

    root_descriptor = os.open(Path(root), dir_flags)
    try:
        # A capped directory inventory must not assert an unobserved policy is absent.
        for name in POLICIES:
            try:
                mode = os.stat(name, dir_fd=root_descriptor, follow_symlinks=False).st_mode
                report['policies'][name] = 'PRESENT' if stat.S_ISREG(mode) else 'NOT ACCESSIBLE'
                if not stat.S_ISREG(mode):
                    report['read_errors'] += 1
            except FileNotFoundError:
                report['policies'][name] = 'MISSING'
            except OSError:
                report['policies'][name] = 'NOT ACCESSIBLE'
                report['read_errors'] += 1
        walk(root_descriptor)
    finally:
        os.close(root_descriptor)
    for kind in ('manifests', 'workflows'):
        report[kind].sort(key=lambda item: item['path'])
    if report['truncated'] or report['read_errors'] or report['symlinks_skipped']:
        report['status'] = 'PENDING'
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path('.'))
    args = parser.parse_args()
    try:
        report = inspect_repository(args.root)
    except (OSError, ValueError):
        report = {'schema_version': 1, 'status': 'NOT ACCESSIBLE', 'reason': 'repository_unavailable'}
    print(json.dumps(report, sort_keys=True, ensure_ascii=True))
    return 0 if report['status'] == 'VERIFIED' else 2


if __name__ == '__main__':
    raise SystemExit(main())
