const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(writer) {
  const modules = {};
  function localRequire(name) {
    if (name === '@/lib/replicate') return { runReplicatePrediction: writer };
    if (name === 'zod') return require('zod');
    if (modules[name]) return modules[name];
    const context = { exports: {}, require: localRequire, process: { env: { REPLICATE_API_TOKEN: 'test' } }, AbortSignal };
    const file = name.replace('@/', 'src/') + '.ts';
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText, context);
    return modules[name] = context.exports;
  }
  return localRequire('@/lib/llm');
}
const beats = [{ id: 'one', title: 'Arrival', description: 'Elena opens the lighthouse door.', visualPrompt: 'Wide shot.' }];
test('existing prompts use Replicate and preserve beat identity', async () => {
  const llm = load(async (model, input) => {
    assert.equal(model, 'meta/meta-llama-3-70b-instruct');
    assert.match(input.system_prompt, /different focal action/);
    assert.match(input.prompt, /Elena opens/);
    return { ok: true, output: ['```json\n', JSON.stringify({ beats: [{ id: 'one', visualPrompt: 'Elena grips the brass latch, viewed over her shoulder.' }] }), '\n```'] };
  });
  const result = await llm.improveVisualPrompts({ hero: 'Elena' }, beats);
  assert.equal(result[0].id, 'one');
  assert.match(result[0].visualPrompt, /brass latch/);
});
test('provider failure surfaces instead of returning template beats', async () => {
  const llm = load(async () => ({ ok: false, error: 'Insufficient credit' }));
  await assert.rejects(llm.generateBeatSheet({ story: 'A lighthouse keeper' }), /Insufficient credit/);
});
test('missing or mismatched beat IDs are rejected before saving', async () => {
  const llm = load(async () => ({ ok: true, output: JSON.stringify({ beats: [{ id: 'wrong', visualPrompt: 'A new shot' }] }) }));
  await assert.rejects(llm.improveVisualPrompts({}, beats), /incomplete shot list/);
});
test('malformed model output is actionable, never a silent fallback', async () => {
  const llm = load(async () => ({ ok: true, output: '{"beats":' }));
  await assert.rejects(llm.generateBeatSheet({}), /incomplete text/);
});
