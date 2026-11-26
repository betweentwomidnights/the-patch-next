const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/app/lib/news.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

function load(fetch) {
  const exports = {};
  const errors = [];
  const dependencies = { 'server-only': {}, 'next/cache': { unstable_cache: fn => fn } };
  let time = 1_000;
  vm.runInNewContext(code, {
    exports,
    require: id => dependencies[id] ?? require(id),
    fetch,
    AbortSignal,
    Date: class extends Date { static now() { return time; } },
    process: { env: {} },
    console: { error: (...args) => errors.push(args) },
  });
  return { read: exports.getNewsFeed, advance: () => { time += 60_000; }, errors };
}

function index(date) {
  return Response.json({
    version: 1,
    checkedThrough: date,
    days: { [date]: { status: 'posted', releases: 1, merges: 2 } },
    posts: [{ date, title: 'patch news' }],
  });
}

test('the first readers after expiry share a refresh and all get the new post', async () => {
  let reads = 0;
  let publish;
  const next = new Promise(resolve => { publish = resolve; });
  const { read, advance } = load(async (url, options) => {
    assert.match(url, /\/index\.json$/);
    assert.equal(options.cache, 'no-store');
    assert.equal(options.headers['Cache-Control'], 'no-cache');
    reads += 1;
    return reads === 1 ? index('2026-11-24') : next;
  });

  assert.equal((await read()).posts[0].date, '2026-11-24');
  assert.equal((await read()).posts[0].date, '2026-11-24');
  assert.equal(reads, 1);

  advance();
  const first = read();
  const second = read();
  publish(index('2026-11-25'));
  assert.equal((await first).posts[0].date, '2026-11-25');
  assert.equal((await second).posts[0].date, '2026-11-25');
  assert.equal(reads, 2);
});

test('an invalid refresh keeps the last good feed until the next successful check', async () => {
  const responses = [index('2026-11-24'), Response.json({ version: 1 }), index('2026-11-25')];
  const { read, advance, errors } = load(async () => responses.shift());

  assert.equal((await read()).checkedThrough, '2026-11-24');
  advance();
  assert.equal((await read()).checkedThrough, '2026-11-24');
  assert.equal((await read()).checkedThrough, '2026-11-24');
  assert.equal(errors.length, 1);

  advance();
  assert.equal((await read()).checkedThrough, '2026-11-25');
});
