const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function harness(respond) {
  let now = 0;
  const calls = [];
  const context = {
    exports: {},
    require: (name) => name === "@/lib/replicate" ? replicate : ({ resolveImageProvider: () => 'replicate' }),
    process: { env: { REPLICATE_API_TOKEN: 'test' } },
    Date: { now: () => now, parse: Date.parse },
    AbortSignal,
    setTimeout: (callback, ms) => { now += ms; queueMicrotask(callback); },
    fetch: async (url, options) => {
      calls.push({ url, ...options, at: now });
      return respond(calls.length, options);
    },
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/replicate.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, context);
  const replicate = context.exports;
  context.exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/panels.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, context);
  return { generate: () => context.exports.generatePanelImage('A woman enters a train', 0, 'Arrival'), calls };
}
const response = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers });
const done = () => response({ status: 'succeeded', output: ['https://example.com/panel.webp'] });
const running = () => response({ status: 'processing', urls: { get: 'https://api.replicate.com/v1/predictions/test' } });

test('throttled starts respect Retry-After and then succeed', async () => {
  const h = harness(n => n === 1 ? response({ detail: 'Request was throttled. Your rate limit resets in ~3s.' }, 429, { 'retry-after': '20' }) : done());
  assert.equal((await h.generate()).ok, true);
  assert.equal(h.calls.length, 2);
  assert.ok(h.calls[1].at - h.calls[0].at >= 21000);
  const input = JSON.parse(h.calls[1].body).input;
  assert.equal(input.aspect_ratio, '16:9');
  assert.match(input.prompt, /monochrome grayscale/);
});

test('prediction running beyond 90 seconds completes without another POST', async () => {
  const h = harness(n => n <= 100 ? running() : done());
  assert.equal((await h.generate()).ok, true);
  assert.ok(h.calls.at(-1).at > 90000);
  assert.equal(h.calls.filter(c => c.method === 'POST').length, 1);
});

test('polling recovers from network errors, throttles, and server failures', async () => {
  const h = harness(n => {
    if (n === 1) return running();
    if (n === 2) throw new Error('network');
    if (n === 3) return response({}, 429);
    if (n === 4) return response({}, 503);
    return done();
  });
  assert.equal((await h.generate()).ok, true);
  assert.equal(h.calls.filter(c => c.method === 'POST').length, 1);
});

test('billing errors are not retried', async () => {
  const h = harness(() => response({ detail: 'Insufficient credit' }, 402));
  assert.equal((await h.generate()).ok, false);
  assert.equal(h.calls.length, 1);
});

test('persistent throttling has a bounded retry count', async () => {
  const h = harness(() => response({ detail: 'Throttled' }, 429));
  assert.equal((await h.generate()).ok, false);
  assert.equal(h.calls.length, 6);
});

test('long-running prediction has a provider cancellation deadline and bounded polling', async () => {
  const h = harness(() => running());
  assert.equal((await h.generate()).ok, false);
  assert.equal(h.calls[0].headers['Cancel-After'], '10m');
  assert.equal(h.calls.filter(c => c.method === 'POST').length, 1);
  assert.ok(h.calls.length <= 662);
});
