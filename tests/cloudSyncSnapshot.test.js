import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveCloudSnapshot } from '../src/utils/cloudSyncSnapshot.js';

test('uses the cloud snapshot when this device has no pending marker', () => {
  assert.deepEqual(resolveCloudSnapshot({
    marker: null,
    localPayload: [{ id: 'local' }],
    cloudPayload: [{ id: 'cloud' }],
    cloudVersion: 3
  }), { action: 'use-cloud' });
});

test('clears an identical pending write instead of creating a false conflict', () => {
  assert.deepEqual(resolveCloudSnapshot({
    marker: { baseVersion: 2 },
    localPayload: [{ id: 'same' }],
    cloudPayload: [{ id: 'same' }],
    cloudVersion: 3
  }), { action: 'use-cloud' });
});

test('restores a local write when its recorded cloud base still matches', () => {
  assert.deepEqual(resolveCloudSnapshot({
    marker: { baseVersion: 3 },
    localPayload: [{ id: 'local edit' }],
    cloudPayload: [{ id: 'cloud base' }],
    cloudVersion: 3
  }), { action: 'restore-local' });
});

test('surfaces a conflict when the cloud changed after the local write was queued', () => {
  assert.deepEqual(resolveCloudSnapshot({
    marker: { baseVersion: 2 },
    localPayload: [{ id: 'local edit' }],
    cloudPayload: [{ id: 'new cloud edit' }],
    cloudVersion: 3
  }), { action: 'conflict' });
});
