import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

MODULE = Path(__file__).with_name('engineering_controller.py')


class ControllerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / 'repo'
        self.root.mkdir()

    def write(self, path, content):
        target = self.root / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content)
        return target

    def inspect(self, **limits):
        self.assertTrue(MODULE.exists(), 'metadata controller is not implemented')
        spec = importlib.util.spec_from_file_location('engineering_controller', MODULE)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module.inspect_repository(self.root, **limits)

    def test_reports_counts_and_digests_without_source_values_or_execution(self):
        sentinel = 'TOKEN_VALUE_NEVER_ECHO_THIS'
        content = json.dumps({'scripts': {'postinstall': 'touch SHOULD_NOT_EXIST'},
                              'dependencies': {sentinel: 'secret'}})
        self.write('package.json', content)
        self.write('.github/workflows/check.yml', 'run: echo ' + sentinel)
        self.write('SECURITY.md', sentinel)
        report = self.inspect()
        self.assertEqual(report['status'], 'VERIFIED')
        self.assertEqual(report['manifests'][0]['dependency_count'], 1)
        self.assertEqual(report['manifests'][0]['sha256'], hashlib.sha256(content.encode()).hexdigest())
        self.assertEqual(len(report['workflows']), 1)
        self.assertEqual(report['policies']['SECURITY.md'], 'PRESENT')
        self.assertEqual(report['policies']['CONTRIBUTING.md'], 'MISSING')
        self.assertNotIn(sentinel, json.dumps(report))
        self.assertFalse((self.root / 'SHOULD_NOT_EXIST').exists())
        self.assertTrue(all(v == 'NOT ACCESSIBLE' for v in report['account_checks'].values()))

    def test_never_follows_file_or_directory_symlinks(self):
        external = Path(self.temp.name) / 'outside'
        external.mkdir()
        (external / 'package.json').write_text('{"dependencies":{"external":"secret"}}')
        (self.root / 'package.json').symlink_to(external / 'package.json')
        (self.root / 'escape').symlink_to(external, target_is_directory=True)
        report = self.inspect()
        self.assertEqual(report['manifests'], [])
        self.assertEqual(report['symlinks_skipped'], 2)
        self.assertNotIn('external', json.dumps(report))

    def test_reports_malformed_and_oversized_inputs_without_echoing_them(self):
        self.write('package.json', '{PRIVATE_VALUE')
        self.write('nested/package.json', 'a' * 200)
        report = self.inspect(max_file_bytes=100)
        self.assertEqual(report['status'], 'PENDING')
        statuses = {m['path']: m['status'] for m in report['manifests']}
        self.assertEqual(statuses['package.json'], 'MALFORMED')
        self.assertEqual(statuses['nested/package.json'], 'TOO_LARGE')
        self.assertNotIn('PRIVATE_VALUE', json.dumps(report))

    def test_bounds_directory_entries_and_reports_incomplete_coverage(self):
        for index in range(20):
            self.write(f'folder{index}/package.json', '{}')
        report = self.inspect(max_entries=3)
        self.assertEqual(report['status'], 'PENDING')
        self.assertTrue(report['truncated'])
        self.assertLessEqual(report['entries_examined'], 3)

    def test_skips_vendor_directories_and_never_reads_env_files(self):
        self.write('node_modules/untrusted/package.json', '{}')
        self.write('.git/untrusted/package.json', '{}')
        self.write('.env', 'TOKEN_PRIVATE')
        report = self.inspect()
        self.assertEqual(report['manifests'], [])
        self.assertNotIn('TOKEN_PRIVATE', json.dumps(report))

    def test_file_budget_and_total_byte_budget_return_pending(self):
        self.write('a/package.json', '{}')
        self.write('b/package.json', '{}')
        report = self.inspect(max_files=1)
        self.assertEqual(len(report['manifests']), 1)
        self.assertEqual(report['status'], 'PENDING')
        report = self.inspect(max_total_bytes=2)
        self.assertEqual(report['status'], 'PENDING')
        self.assertEqual(sum(item.get('size_bytes', 0) for item in report['manifests']), 2)

    def test_nonregular_candidate_is_never_opened(self):
        os.mkfifo(self.root / 'package.json')
        report = self.inspect()
        self.assertTrue(report['manifests'], 'special candidate status must be reported')
        self.assertEqual(report['manifests'][0]['status'], 'NOT ACCESSIBLE')
        self.assertEqual(report['status'], 'PENDING')

    def test_policy_presence_does_not_depend_on_inventory_entry_limit(self):
        for index in range(10):
            self.write(f'ordinary{index}', '')
        for name in ('SECURITY.md', 'CONTRIBUTING.md', 'LICENSE'):
            self.write(name, 'policy content')
        report = self.inspect(max_entries=1)
        self.assertTrue(report['truncated'])
        self.assertEqual(set(report['policies'].values()), {'PRESENT'})

    def test_root_symlink_is_rejected(self):
        self.assertTrue(MODULE.exists(), 'metadata controller is not implemented')
        alias = Path(self.temp.name) / 'alias'
        alias.symlink_to(self.root, target_is_directory=True)
        result = subprocess.run([sys.executable, str(MODULE), '--root', str(alias)],
                                capture_output=True, text=True, check=False)
        self.assertEqual(result.returncode, 2)
        self.assertEqual(json.loads(result.stdout)['status'], 'NOT ACCESSIBLE')

    def test_cli_bad_root_uses_generic_error_without_path_or_traceback(self):
        self.assertTrue(MODULE.exists(), 'metadata controller is not implemented')
        missing = self.root / 'PRIVATE_PATH'
        result = subprocess.run([sys.executable, str(MODULE), '--root', str(missing)],
                                capture_output=True, text=True, check=False)
        self.assertEqual(result.returncode, 2)
        self.assertEqual(json.loads(result.stdout)['status'], 'NOT ACCESSIBLE')
        self.assertNotIn('PRIVATE_PATH', result.stdout + result.stderr)
        self.assertNotIn('Traceback', result.stdout + result.stderr)


if __name__ == '__main__':
    unittest.main()
