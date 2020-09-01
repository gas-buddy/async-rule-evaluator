import tap from 'tap';
import { toFunction } from '../src';

function runFilter(input, data) {
  const fn = toFunction(input);
  return fn(data);
}

tap.test('Array support', async (arrayTests) => {
  arrayTests.test('in / not in', async (t) => {
    // value in array
    t.strictEquals(await runFilter('5 in (1, 2, 3, 4)'), 0);
    t.strictEquals(await runFilter('3 in (1, 2, 3, 4)'), 1);
    t.strictEquals(await runFilter('5 not in (1, 2, 3, 4)'), 1);
    t.strictEquals(await runFilter('3 not in (1, 2, 3, 4)'), 0);

    // array in array
    t.strictEquals(await runFilter('(1, 2) in (1, 2, 3)'), 1);
    t.strictEquals(await runFilter('(1, 2) in (2, 3, 1)'), 1);
    t.strictEquals(await runFilter('(3, 4) in (1, 2, 3)'), 0);
    t.strictEquals(await runFilter('(1, 2) not in (1, 2, 3)'), 0);
    t.strictEquals(await runFilter('(1, 2) not in (2, 3, 1)'), 0);
    t.strictEquals(await runFilter('(3, 4) not in (1, 2, 3)'), 1);

    // other edge cases
    t.strictEquals(await runFilter('(1, 2) in 1'), 0);
    t.strictEquals(await runFilter('1 in 1'), 1);
    t.strictEquals(await runFilter('(1, 2) not in 1'), 1);
    t.strictEquals(await runFilter('1 not in 1'), 0);
  });

  arrayTests.test('string support', async (t) => {
    t.strictEquals(await runFilter('foo == "hello"', { foo: 'hello' }), 1);
    t.strictEquals(await runFilter('foo == "hello"', { foo: 'bye' }), 0);
    t.strictEquals(await runFilter('foo != "hello"', { foo: 'hello' }), 0);
    t.strictEquals(await runFilter('foo != "hello"', { foo: 'bye' }), 1);
    t.strictEquals(await runFilter('foo in ("aa", "bb")', { foo: 'aa' }), 1);
    t.strictEquals(await runFilter('foo in ("aa", "bb")', { foo: 'cc' }), 0);
    t.strictEquals(await runFilter('foo not in ("aa", "bb")', { foo: 'aa' }), 0);
    t.strictEquals(await runFilter('foo not in ("aa", "bb")', { foo: 'cc' }), 1);

    t.strictEquals(await runFilter('"\n"'), '\n');
    t.strictEquals(await runFilter('"\u0000"'), '\u0000');
    t.strictEquals(await runFilter('"\uD800"'), '\uD800');
  });

  arrayTests.test('regexp support', async (t) => {
    t.strictEquals(await runFilter('foo ~= "^[hH]ello"', { foo: 'hello' }), 1);
    t.strictEquals(await runFilter('foo ~= "^[hH]ello"', { foo: 'bye' }), 0);
  });

  arrayTests.test('array support', async (t) => {
    const arr = await runFilter('(42, "fifty", pi)', { pi: Math.PI });

    t.ok(Array.isArray(arr));
    t.deepEquals(arr, [42, 'fifty', Math.PI]);
  });

  arrayTests.test('ternary operator', async (t) => {
    t.strictEquals(await runFilter('1 > 2 ? 3 : 4'), 4);
    t.strictEquals(await runFilter('1 < 2 ? 3 : 4'), 3);
  });

  arrayTests.test('kitchensink', async (t) => {
    const kitchenSink = toFunction('4 > lowNumber * 2 and (max(a, b) < 20 or foo) ? 1.1 : 9.4');
    t.strictEquals(await kitchenSink({ lowNumber: 1.5, a: 10, b: 12, foo: false }), 1.1);
    t.strictEquals(await kitchenSink({ lowNumber: 3.5, a: 10, b: 12, foo: false }), 9.4);
  });

  arrayTests.test('include', async (t) => {
    const hasOne = toFunction('1 in foo');
    t.strictEqual(await hasOne({ foo: [] }), 0);
    t.strictEqual(await hasOne({ foo: [0, 2, 3] }), 0);
    t.strictEqual(await hasOne({ foo: [6, 1, 3] }), 1);

    const hasOneIsh = toFunction('1 in~ foo');
    t.strictEqual(await hasOneIsh({ foo: [6, '1', 3] }), 1);
    t.strictEqual(await hasOneIsh({ foo: [6, 1, 3] }), 1);

    const notHasOneIsh = toFunction('1 not in~ foo');
    t.strictEqual(await notHasOneIsh({ foo: [6, '1', 3] }), 0);
    t.strictEqual(await notHasOneIsh({ foo: [6, 1, 3] }), 0);
    t.strictEqual(await notHasOneIsh({ foo: [6, 3] }), 1);
  });

  arrayTests.test('nested array', async (t) => {
    const hasIt = toFunction('testNear(input, [[1,2],[2,4],[3,65],["foo", "bar", 1 + 2],[6+3]])', {
      functions: {
        testNear(input, arr) {
          return arr.findIndex(subArr => subArr[0] === input) >= 0 ? 1 : 0;
        },
      },
    });
    t.strictEqual(await hasIt({ input: 1 }), 1);
    t.strictEqual(await hasIt({ input: 6 }), 0);
    t.strictEqual(await hasIt({ input: 9 }), 1);
  });
});
