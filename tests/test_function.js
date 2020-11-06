import tap from 'tap';
import { toFunction, resetObjectResolver } from '../src';

let counter = 0;
let nullCounter = 0;
const doc1 = { category: 'meal', obj: { num: 6, str: 'gasbuddy', more: { cowbell: true } }, foo: ['green'] };
const doc2 = { category: 'dessert', obj: { num: 1, str: 'gasbuddy' }, foo: ['blue', 'red', 'green'] };
const doc3 = {
  async delayed() {
    return new Promise(accept => setTimeout(() => accept('meal'), 100));
  },
  cached() {
    counter += 1;
    return counter;
  },
  returnNull() {
    nullCounter += 1;
    return null;
  },
  async thrown() {
    return new Promise((accept, reject) => setTimeout(() => reject(new Error('Foobar')), 100));
  },
};

tap.test('test_function', (test) => {
  test.test('simple property match', async (t) => {
    const filter = toFunction('category == "meal"');
    t.ok(await filter(doc1), 'Should match intended target');
    t.notOk(await filter(doc2), 'Should not match unintended target');
  });

  test.test('deep property match', async (t) => {
    const filter = toFunction('obj.num == 6');
    t.ok(await filter(doc1), 'Should match intended target');
    t.notOk(await filter(doc2), 'Should not match unintended target');
  });

  test.test('deep property match', async (t) => {
    let filter = toFunction('obj.more.cowbell');
    t.ok(await filter(doc1), 'Should match intended target');
    t.notOk(await filter(doc2), 'Should not match unintended target');

    filter = toFunction('obj.more.cowbell and category == "meal"');
    t.ok(await filter(doc1), 'Should match intended target');
    t.notOk(await filter(doc2), 'Should not match unintended target');
  });

  test.test('promise match', async (t) => {
    let filter = toFunction('delayed == "meal"');
    t.ok(await filter(doc3), 'Should match intended target');
    filter = toFunction('delayed == "meal" and delayed != "dessert"');
    t.ok(await filter(doc3), 'Should match intended target with caching');
    filter = toFunction('delayed != "meal"');
    t.notOk(await filter(doc3), 'Should not match unintended target');

    filter = toFunction('cached > 0 and cached == 1 and cached != 2');
    t.ok(await filter(doc3), 'Should match intended target');
    t.notOk(await filter(doc2), 'Should not match unintended target');
    resetObjectResolver(doc3);
    filter = toFunction('cached == 2 and cached <= 2');
    t.ok(await filter(doc3), 'Should match intended target');

    nullCounter = 0;
    filter = toFunction('not returnNull');
    await filter(doc3);
    await filter(doc3);
    t.strictEquals(nullCounter, 1, 'Should only run the promise once');
  });

  test.test('inverted array match', async (t) => {
    const filter = toFunction('"red" in foo');
    t.ok(await filter(doc2), 'Should match intended target');
    t.notOk(await filter(doc1), 'Should not match unintended target');
    t.notOk(await filter(doc3), 'Should not match unintended target');
  });

  test.test('array length match', async (t) => {
    let filter = toFunction('foo.length > 1');
    t.ok(await filter(doc2), 'Should match intended target');
    t.notOk(await filter(doc1), 'Should not match unintended target');
    t.notOk(await filter(doc3), 'Should not match unintended target');

    filter = toFunction('length(foo) == 0');
    t.ok(await filter(doc3), 'Should match intended target');
  });

  test.test('string lower', async (t) => {
    let filter = toFunction('lower(foo) == "brookline"');
    t.ok(await filter({ foo: 'BROOKLINE' }), 'Should match intended target');
    t.ok(await filter({ foo: 'brookline' }), 'Should match intended target');
    t.notOk(await filter({ foo: 'brooklinen' }), 'Should not match unintended target');

    filter = toFunction('lower(foo) ~= "^brookline"');
    t.ok(await filter({ foo: 'BROOKLINE' }), 'Should match intended target');
  });

  test.test('substring', async (t) => {
    const filter = toFunction('substr(foo, 0, 5) == "01234"');
    t.ok(await filter({ foo: '0123456789' }), 'Should match intended target');
    t.ok(await filter({ foo: '01234' }), 'Should match intended target');
    t.notOk(await filter({ foo: '12345678' }), 'Should not match unintended target');
  });

  test.test('multiparam custom function', async (t) => {
    let filter = toFunction('add(1, "3") == 4', {
      functions: {
        add(a, b) { return Number(a) + Number(b); },
      },
    });
    t.ok(await filter({}), 'Should match intended target');

    filter = toFunction('add(\'1\', "3", 5) == nine', {
      functions: {
        add(...args) {
          return args.reduce((prev, cur) => (Number(cur) + prev), 0);
        },
      },
    });
    t.ok(await filter({ nine: 9, 1: 1 }), 'Should match intended target');
    t.notOk(await filter({}), 'Should not match unintended target');
  });

  test.test('event interception', (t) => {
    let code;
    toFunction('transactions <= 5 and abs(profit) > 20.5', {
      onParse({ functionObject }) {
        code = functionObject.toString();
      },
    });
    t.ok(code.startsWith('async function anonymous(fns,std,prop'), 'Code should start with expected value');
    t.ok(code.includes('return (std.numify((std.numify((await prop("transactions"))<=(5)))&&(std.numify(((std.isfn(fns, "abs") ? fns["abs"]((await prop("profit"))) : std.unknown("abs")))> (20.5)))));'), 'Code should match expectation');
    t.end();
  });

  test.end();
});
