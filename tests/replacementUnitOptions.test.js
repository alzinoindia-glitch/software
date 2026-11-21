import test from 'node:test';
import assert from 'node:assert/strict';
import { getReplacementUnitOptions, hasTrackedReplacementUnits } from '../src/utils/replacementUnitOptions.js';

test('serial-number-only replacement stock requires a unit selection', () => {
  const product = { serialNumbers: ['SN-001', 'SN-002'] };
  assert.equal(hasTrackedReplacementUnits(product), true);
  assert.deepEqual(getReplacementUnitOptions(product), [
    { value: 'SN-001', label: 'Serial: SN-001' },
    { value: 'SN-002', label: 'Serial: SN-002' }
  ]);
});

test('unit selection uses the identifier that stock deduction will consume', () => {
  const product = { units: [{ id: 'UNIT-1', serialNumber: 'SN-1', color: 'Blue' }] };
  assert.deepEqual(getReplacementUnitOptions(product), [{ value: 'SN-1', label: 'Serial: SN-1 · Blue' }]);
});

test('legacy IMEI and serial arrays do not duplicate identifiers already listed in units', () => {
  const product = {
    units: [{ imei1: 'IMEI-1', id: 'UNIT-1' }, { serialNumber: 'SN-1', id: 'UNIT-2' }],
    imeis: ['IMEI-1', 'IMEI-2'],
    serialNumbers: ['SN-1', 'SN-2']
  };
  assert.deepEqual(getReplacementUnitOptions(product).map(option => option.value), ['IMEI-1', 'SN-1', 'IMEI-2', 'SN-2']);
});
