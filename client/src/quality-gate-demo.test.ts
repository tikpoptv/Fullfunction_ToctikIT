import { expect, test } from 'vitest';

// Deliberate failure for the teaching demo. Never merge this branch.
test('the required CI check blocks a failing pull request', () => {
  expect(2 + 2).toBe(5);
});
