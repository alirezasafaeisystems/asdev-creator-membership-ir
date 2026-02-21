import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeCreatorSlug,
  normalizeEmail,
  normalizeIranMobile,
  normalizeReturnUrl,
} from '../dist/normalize.js';

test('normalizeEmail trims and lowercases', () => {
  assert.equal(normalizeEmail('  USER@Example.COM  '), 'user@example.com');
});

test('normalizeCreatorSlug basic latin', () => {
  const out = normalizeCreatorSlug('Hello World');
  assert.equal(out.slug, 'hello-world');
  assert.deepEqual(out.warnings, []);
});

test('normalizeCreatorSlug removes unsafe chars', () => {
  const out = normalizeCreatorSlug('<script>alert(1)</script>');
  assert.equal(out.slug, 'scriptalert1script');
});

test('normalizeCreatorSlug collapses separators', () => {
  const out = normalizeCreatorSlug('a___b    c');
  assert.equal(out.slug, 'a-b-c');
});

test('normalizeCreatorSlug fallback on very short input', () => {
  const out = normalizeCreatorSlug('$$');
  assert.match(out.slug, /^c-[a-f0-9]{8}$/);
  assert.ok(out.warnings.includes('SLUG_TOO_SHORT_FALLBACK'));
});

test('normalizeCreatorSlug truncates long slug to <=32', () => {
  const out = normalizeCreatorSlug('this-is-a-very-long-creator-slug-value-that-must-be-truncated');
  assert.ok(out.slug.length <= 32);
  assert.ok(out.warnings.includes('SLUG_TRUNCATED'));
});

test('normalizeCreatorSlug deterministic fallback', () => {
  const a = normalizeCreatorSlug('##');
  const b = normalizeCreatorSlug('##');
  assert.equal(a.slug, b.slug);
});

test('normalizeIranMobile accepts local format', () => {
  assert.equal(normalizeIranMobile('09121234567'), '09121234567');
});

test('normalizeIranMobile accepts +98 format', () => {
  assert.equal(normalizeIranMobile('+989121234567'), '09121234567');
});

test('normalizeIranMobile accepts 98 prefix format', () => {
  assert.equal(normalizeIranMobile('989121234567'), '09121234567');
});

test('normalizeIranMobile supports persian digits', () => {
  assert.equal(normalizeIranMobile('۰۹۱۲۱۲۳۴۵۶۷'), '09121234567');
});

test('normalizeIranMobile supports arabic digits', () => {
  assert.equal(normalizeIranMobile('٠٩١٢١٢٣٤٥٦٧'), '09121234567');
});

test('normalizeIranMobile strips separators', () => {
  assert.equal(normalizeIranMobile('09(12) 123-45-67'), '09121234567');
});

test('normalizeIranMobile rejects invalid prefix', () => {
  assert.equal(normalizeIranMobile('08121234567'), null);
});

test('normalizeIranMobile rejects short number', () => {
  assert.equal(normalizeIranMobile('0912123'), null);
});

test('normalizeIranMobile rejects long number', () => {
  assert.equal(normalizeIranMobile('0912123456789'), null);
});

test('normalizeReturnUrl allows normal relative path', () => {
  assert.equal(normalizeReturnUrl('/dashboard'), '/dashboard');
});

test('normalizeReturnUrl allows nested path and query', () => {
  assert.equal(normalizeReturnUrl('/creator/me?tab=plans'), '/creator/me?tab=plans');
});

test('normalizeReturnUrl rejects absolute http URL', () => {
  assert.equal(normalizeReturnUrl('https://evil.test/x'), '/');
});

test('normalizeReturnUrl rejects protocol-relative URL', () => {
  assert.equal(normalizeReturnUrl('//evil.test/x'), '/');
});

test('normalizeReturnUrl rejects api path', () => {
  assert.equal(normalizeReturnUrl('/api/v1/admin/ops/summary'), '/');
});

test('normalizeReturnUrl trims spaces', () => {
  assert.equal(normalizeReturnUrl('   /safe   '), '/safe');
});

test('normalizeReturnUrl rejects javascript pseudo-url', () => {
  assert.equal(normalizeReturnUrl('javascript:alert(1)'), '/');
});
