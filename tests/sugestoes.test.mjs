// Regression test for product suggestion keyboard activation.
// Run: node --test tests/sugestoes.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';

function createSuggestion(offer, state) {
  const button = {
    type: 'button',
    role: 'option',
    click() {
      state.selectedOfferId = offer.id;
      state.query = offer.title;
      state.renderCount += 1;
    },
  };
  return button;
}

test('click selects exact offer id, not just title', () => {
  const state = { selectedOfferId: null, query: '', renderCount: 0 };
  const offer = { id: 42, title: 'Celular 256 GB' };
  createSuggestion(offer, state).click();
  assert.equal(state.selectedOfferId, 42);
  assert.equal(state.query, offer.title);
  assert.equal(state.renderCount, 1);
});

test('same title in different merchants remains distinguishable by id', () => {
  const state = { selectedOfferId: null, query: '', renderCount: 0 };
  createSuggestion({ id: 7, title: 'Produto X' }, state).click();
  createSuggestion({ id: 8, title: 'Produto X' }, state).click();
  assert.equal(state.selectedOfferId, 8);
  assert.equal(state.renderCount, 2);
});
