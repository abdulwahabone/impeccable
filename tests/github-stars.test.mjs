import assert from 'node:assert/strict';
import test from 'node:test';

import { formatStars, STAR_COUNT_FLOOR, starsLabelForCount } from '../site/data/github-stars.mjs';

test('GitHub stars use the established compact display format', () => {
  assert.equal(formatStars(999), '999');
  assert.equal(formatStars(1_500), '1.5k');
  assert.equal(formatStars(64_389), '64k');
});

test('GitHub stars never fall below the last verified milestone', () => {
  assert.equal(STAR_COUNT_FLOOR, 64_000);
  assert.equal(starsLabelForCount(), '64k');
  assert.equal(starsLabelForCount(57_000), '64k');
  assert.equal(starsLabelForCount(65_500), '66k');
});
