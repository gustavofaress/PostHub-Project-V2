import test from 'node:test';
import assert from 'node:assert/strict';
import { getEditorialStatusBucket } from './editorialStatus.ts';

test('editorial status normalization keeps legacy and new values in the correct buckets', () => {
  assert.equal(getEditorialStatusBucket('Draft'), 'in_production');
  assert.equal(getEditorialStatusBucket('Planned'), 'in_production');
  assert.equal(getEditorialStatusBucket('rascunho'), 'in_production');
  assert.equal(getEditorialStatusBucket('em_producao'), 'in_production');
  assert.equal(getEditorialStatusBucket('agendado'), 'in_production');
  assert.equal(getEditorialStatusBucket('Review'), 'review');
  assert.equal(getEditorialStatusBucket('em_revisao'), 'review');
  assert.equal(getEditorialStatusBucket('Published'), 'published');
  assert.equal(getEditorialStatusBucket('publicado'), 'published');
  assert.equal(getEditorialStatusBucket('concluido'), 'published');
});
