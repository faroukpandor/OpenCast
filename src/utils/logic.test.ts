import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyProofOfWork, mineProofOfWorkSync } from './crypto_pow.ts';
import { hashDailyIp, classifyDeviceType } from './analytics_salt.ts';
import { extractKeywords, findRelatedIssues, IssueRecord } from './related_search.ts';
import { hashPassword, verifyPassword, generateToken } from './auth_tokens.ts';

test('Proof of Work: mines valid nonce and validates hash prefix', () => {
  const comment = 'Test comment on FireOS 8 sideloading patch';
  const mined = mineProofOfWorkSync(comment, '000', 50000);
  assert.ok(mined.nonce.length > 0, 'Nonce should be non-empty');
  assert.ok(mined.hash.startsWith('000'), `Hash should start with 000, got ${mined.hash}`);

  // Test verification helper
  const verifyResult = verifyProofOfWork(comment, mined.nonce, '000');
  assert.equal(verifyResult.valid, true);

  // Test rejection with invalid nonce
  const invalidResult = verifyProofOfWork(comment, 'completely_bogus_nonce_123', '000');
  // It shouldn't accidentally start with 000
  if (!invalidResult.hash.startsWith('000')) {
    assert.equal(invalidResult.valid, false);
  }
});

test('Privacy Analytics: daily salted hash removes PII and varies by date', () => {
  const ip = '198.51.100.42';
  const day1Hash = hashDailyIp(ip, '2026-11-07');
  const day1HashRepeat = hashDailyIp(ip, '2026-11-07');
  const day2Hash = hashDailyIp(ip, '2026-11-08');

  // Should be 16-char hex
  assert.equal(day1Hash.length, 16);
  // IP must not appear in hash
  assert.ok(!day1Hash.includes(ip));
  // Deterministic on same day
  assert.equal(day1Hash, day1HashRepeat);
  // Rotates across different days to prevent cross-day tracking
  assert.notEqual(day1Hash, day2Hash);
});

test('Device Classifier: detects streaming devices accurately', () => {
  assert.equal(
    classifyDeviceType('Mozilla/5.0 (Linux; Android 11; AFTMM Build/RS8102) AppleWebKit/537.36 (KHTML, like Gecko) Silk/120.0'),
    'Streaming Device'
  );
  assert.equal(
    classifyDeviceType('Roku/DVP-9.10 (049.10E04111A)'),
    'Streaming Device'
  );
  assert.equal(
    classifyDeviceType('Mozilla/5.0 (Linux; Android 12; Chromecast Build/STTE.220621.019) AppleWebKit/537.36'),
    'Streaming Device'
  );
  assert.equal(
    classifyDeviceType('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'),
    'Mobile'
  );
  assert.equal(
    classifyDeviceType('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0'),
    'Desktop'
  );
});

test('Related Issues: extracts keywords and ranks top 5 matches', () => {
  const sampleIssues: IssueRecord[] = [
    {
      id: 1,
      device_id: 101,
      title: 'FireOS 8 blocks ADB package installer for third-party APKs',
      description: 'Amazon firmware update RS8104 enforces strict verification when installing via adb install.',
      severity: 'high',
      ecosystem: 'Amazon'
    },
    {
      id: 2,
      device_id: 101,
      title: 'Custom launcher disabled by Fire TV home update',
      description: 'Wolf Launcher and Projectivy disabled after background OTA update.',
      severity: 'high',
      ecosystem: 'Amazon'
    },
    {
      id: 3,
      device_id: 101,
      title: 'ADB debugging authorization prompt not displaying on screen',
      description: 'Cannot approve adb install due to missing RSA key dialog popup on Fire Stick.',
      severity: 'medium',
      ecosystem: 'Amazon'
    },
    {
      id: 4,
      device_id: 202,
      title: 'Google TV 4K sideload APK permission denied in file manager',
      description: 'Files by Google or Downloader cannot toggle install unknown apps toggle.',
      severity: 'medium',
      ecosystem: 'Google'
    },
    {
      id: 5,
      device_id: 303,
      title: 'Roku Developer Mode Secret Screen button sequence',
      description: 'Home 3x, Up 2x, Right, Left, Right, Left, Right to enable dev mode and installer.',
      severity: 'low',
      ecosystem: 'Roku'
    },
    {
      id: 6,
      device_id: 101,
      title: 'Remote control unpairing and battery drain on Fire Stick 4K Max',
      description: 'Bluetooth voice remote disconnects every 20 minutes.',
      severity: 'medium',
      ecosystem: 'Amazon'
    }
  ];

  const target = sampleIssues[0]; // FireOS 8 blocks ADB package installer
  const related = findRelatedIssues(target, sampleIssues, 5);

  assert.ok(related.length > 0 && related.length <= 5);
  // Issue 3 (ADB debugging) or Issue 4 (sideload APK) should rank higher than Remote control
  const topIds = related.map(r => r.id);
  assert.ok(topIds.includes(3), 'Issue 3 with ADB match should be in related list');
  assert.ok(topIds.includes(4), 'Issue 4 with sideload APK match should be in related list');
  assert.ok(!topIds.includes(target.id), 'Target issue itself should not be in related list');
});

test('Auth Tokens: password hashing, verification, and token generator', () => {
  const password = 'SuperSecretStreamingAdmin#2026';
  const { salt, hash } = hashPassword(password);
  assert.ok(salt.length > 0);
  assert.ok(hash.length > 0);

  // Correct verification
  assert.equal(verifyPassword(password, salt, hash), true);
  // Incorrect verification
  assert.equal(verifyPassword('WrongPassword', salt, hash), false);

  // Random token generator
  const t1 = generateToken();
  const t2 = generateToken();
  assert.equal(t1.length, 64);
  assert.notEqual(t1, t2);
});

import { ShortcodeEngine } from './shortcode_resolver.ts';
import { analyzeApkSignature, computeSha256 } from './apk_inspector.ts';

test('Shortcode Engine: resolves 5-digit code and generates new codes', () => {
  const engine = new ShortcodeEngine();
  const resolved = engine.resolve('10001');
  assert.ok(resolved, 'Should resolve standard Elephant code 10001');
  assert.equal(resolved?.appName, 'Elephant TV Streaming Client');

  const generated = engine.generate('Test Custom App', 'https://example.org/test.apk', 'abc123sha');
  assert.equal(generated.code.length, 5);
  assert.ok(/^\d{5}$/.test(generated.code), 'Code must be exactly 5 digits');

  const reResolved = engine.resolve(generated.code);
  assert.equal(reResolved?.appName, 'Test Custom App');
});

test('APK Inspector: verifies SHA-256 integrity and flags high privilege permissions', () => {
  const testHash = 'a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0';
  const report = analyzeApkSignature('smarttube.apk', 25 * 1024 * 1024, testHash, [
    'android.permission.INTERNET',
    'android.permission.SYSTEM_ALERT_WINDOW',
    'android.permission.REQUEST_INSTALL_PACKAGES'
  ]);

  assert.equal(report.isOfficialMatch, true);
  assert.equal(report.officialMatchName, 'SmartTube Beta v22.84 (Yuliskov Official)');
  assert.equal(report.permissions.filter(p => p.isHighPrivilege).length, 2);
  assert.equal(report.suspiciousFlags.length, 0);

  // Test suspicious APK with SMS
  const badReport = analyzeApkSignature('trojan_tv.apk', 160 * 1024 * 1024, '0000000000000000000000000000000000000000000000000000000000000000', [
    'android.permission.SEND_SMS'
  ]);
  assert.equal(badReport.isOfficialMatch, false);
  assert.ok(badReport.suspiciousFlags.some(f => f.includes('SMS')));
});

import { buildRagContext, generateLocalRagAnswer } from '../server/rag_chat_service.ts';

test('RAG Chat Service: builds grounded context and answers device troubleshooting queries', () => {
  const context = buildRagContext();
  assert.ok(context.includes('OPENCAST HARDWARE SPECIFICATION MATRIX'));
  assert.ok(context.includes('verifier_verify_adb_installs 0'));
  assert.ok(context.includes('Amazon Fire TV Stick 4K Max'));

  // Test FireOS 8 query
  const res1 = generateLocalRagAnswer('How to bypass FireOS 8 verification error?');
  assert.ok(res1.answer.includes('verifier_verify_adb_installs 0'));
  assert.ok(res1.sources.length > 0);

  // Test Launcher query
  const res2 = generateLocalRagAnswer('How to fix Projectivy launcher being killed?');
  assert.ok(res2.answer.includes('com.amazon.device.sale.service'));
  assert.ok(res2.sources.length > 0);
});

import { resolveFailProofAnswer } from './failproof_rag.ts';

test('Fail-Proof Fallback Plan: leverages 100% free offline resources without external network', () => {
  // Test storage bootloop resolution
  const res1 = resolveFailProofAnswer('Chromecast 4K storage full bootloop');
  assert.ok(res1.answer.includes('pm trim-caches 1000M'));
  assert.equal(res1.tier, 'offline-fallback');

  // Test lossless audio passthrough
  const res2 = resolveFailProofAnswer('Dolby TrueHD Atmos audio passthrough in Kodi');
  assert.ok(res2.answer.includes('org.xbmc.kodi MANAGE_EXTERNAL_STORAGE allow'));
  assert.equal(res2.tier, 'offline-fallback');

  // Test 5-digit shortcode lookup
  const res3 = resolveFailProofAnswer('what is shortcode 10001');
  assert.ok(res3.answer.includes('Elephant TV'));
  assert.ok(res3.answer.includes('10001'));
  assert.equal(res3.tier, 'free-tier');

  // Test Roku secret menu
  const res4 = resolveFailProofAnswer('How to open Roku secret developer sideload menu?');
  assert.ok(res4.answer.includes('Home 3x, Up 2x'));
  assert.equal(res4.tier, 'free-tier');
});

