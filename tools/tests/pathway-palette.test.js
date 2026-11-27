'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { pathwayPalette, pathwayPrimary } = require('../../source/relationships/pathway-palette');

assert.equal(Object.keys(pathwayPalette).length, 32);
for (const entry of Object.values(pathwayPalette)) {
  assert.deepEqual(Object.keys(entry).sort(), ['day', 'night']);
  assert.match(entry.day, /^#[0-9A-F]{6}$/);
  assert.match(entry.night, /^#[0-9A-F]{6}$/);
}
assert.equal(pathwayPrimary('舞蹈家', 'day'), '#9DA7AA');
assert.equal(pathwayPrimary('舞蹈家', 'night'), '#9DA7AA');

// Cache pathway membership, then switch theme without rebuilding the person.
const script = fs.readFileSync('source/relationships/graph.js', 'utf8');
const context = {
  groupPalette: {}, pathwayPrimary,
  document: { documentElement: { dataset: { theme: 'day' } } },
  canvasTheme: { label: '#24292c' }, groupMode: 'pathway',
  pathways: p => p.facts,
  person: { facts: [
    { value: '偷盗者', relation: 'member', primary: true },
    { value: '学徒', relation: 'member' }
  ] }
};
vm.createContext(context);
vm.runInContext(script.slice(script.indexOf('const palettes='), script.indexOf('function pathwayStatus(')), context);
assert.equal(vm.runInContext('personColor(person)', context), '#626B53');
assert.equal(vm.runInContext('ringColor("学徒")', context), '#71DAF2');
context.document.documentElement.dataset.theme = 'night';
context.canvasTheme.label = '#e6edf3';
assert.equal(vm.runInContext('personColor(person)', context), '#E2E3D5');
assert.equal(vm.runInContext('ringColor("学徒")', context), '#71DAF2');
assert.equal(vm.runInContext('personAccent(person)', context), '#e6edf3');
assert.equal(vm.runInContext('categoryColors("pathway", "占卜家").primary', context), '#B99AE4');
console.log('PASS: 32 main-only palettes; pathway and neutral detail colors follow theme changes');
