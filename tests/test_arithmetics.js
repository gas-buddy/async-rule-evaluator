import tap from 'tap';
import { toFunction } from '../src';

async function runFilter(input, data) {
  const fn = toFunction(input);
  return fn(data);
}

tap.test('Arithmetics', (arithmetic) => {
  arithmetic.test('can do simple numeric expressions', async (t) => {
    t.strictEquals(await runFilter('1 + 2 * 3'), 7);
    t.strictEquals(await runFilter('2 * 3 + 1'), 7);
    t.strictEquals(await runFilter('1 + (2 * 3)'), 7);
    t.strictEquals(await runFilter('(1 + 2) * 3'), 9);
    t.strictEquals(await runFilter('((1 + 2) * 3 / 2 + 1 - 4 + (2 ^ 3)) * -2'), -19);
    t.strictEquals(await runFilter('1.4 * 1.1'), 1.54);
    t.strictEquals(await runFilter('97 % 10'), 7);
  });

  arithmetic.test('does math functions', async (t) => {
    t.strictEquals(await runFilter('abs(-5)'), 5);
    t.strictEquals(await runFilter('abs(5)'), 5);
    t.strictEquals(await runFilter('ceil(4.1)'), 5);
    t.strictEquals(await runFilter('ceil(4.6)'), 5);
    t.strictEquals(await runFilter('floor(4.1)'), 4);
    t.strictEquals(await runFilter('floor(4.6)'), 4);
    t.strictEquals(await runFilter('round(4.1)'), 4);
    t.strictEquals(await runFilter('round(4.6)'), 5);
    t.strictEquals(await runFilter('sqrt(9)'), 3);
  });

  arithmetic.test('supports functions with multiple args', async (t) => {
    t.strictEquals(await runFilter('random() >= 0'), 1);
    t.strictEquals(await runFilter('min(2)'), 2);
    t.strictEquals(await runFilter('max(2)'), 2);
    t.strictEquals(await runFilter('min(2, 5)'), 2);
    t.strictEquals(await runFilter('max(2, 5)'), 5);
    t.strictEquals(await runFilter('min(2, 5, 6)'), 2);
    t.strictEquals(await runFilter('max(2, 5, 6)'), 6);
    t.strictEquals(await runFilter('min(2, 5, 6, 1)'), 1);
    t.strictEquals(await runFilter('max(2, 5, 6, 1)'), 6);
    t.strictEquals(await runFilter('min(2, 5, 6, 1, 9)'), 1);
    t.strictEquals(await runFilter('max(2, 5, 6, 1, 9)'), 9);
    t.strictEquals(await runFilter('min(2, 5, 6, 1, 9, 12)'), 1);
    t.strictEquals(await runFilter('max(2, 5, 6, 1, 9, 12)'), 12);
  });


  arithmetic.test('can do comparisons', async (t) => {
    t.strictEquals(await runFilter('foo == 4', { foo: 4 }), 1);
    t.strictEquals(await runFilter('foo == 4', { foo: 3 }), 0);
    t.strictEquals(await runFilter('foo == 4', { foo: -4 }), 0);
    t.strictEquals(await runFilter('foo != 4', { foo: 4 }), 0);
    t.strictEquals(await runFilter('foo != 4', { foo: 3 }), 1);
    t.strictEquals(await runFilter('foo != 4', { foo: -4 }), 1);
    t.strictEquals(await runFilter('foo > 4', { foo: 3 }), 0);
    t.strictEquals(await runFilter('foo > 4', { foo: 4 }), 0);
    t.strictEquals(await runFilter('foo > 4', { foo: 5 }), 1);
    t.strictEquals(await runFilter('foo >= 4', { foo: 3 }), 0);
    t.strictEquals(await runFilter('foo >= 4', { foo: 4 }), 1);
    t.strictEquals(await runFilter('foo >= 4', { foo: 5 }), 1);
    t.strictEquals(await runFilter('foo < 4', { foo: 3 }), 1);
    t.strictEquals(await runFilter('foo < 4', { foo: 4 }), 0);
    t.strictEquals(await runFilter('foo < 4', { foo: 5 }), 0);
    t.strictEquals(await runFilter('foo <= 4', { foo: 3 }), 1);
    t.strictEquals(await runFilter('foo <= 4', { foo: 4 }), 1);
    t.strictEquals(await runFilter('foo <= 4', { foo: 5 }), 0);
  });


  arithmetic.test('can do boolean logic', async (t) => {
    t.strictEquals(await runFilter('0 and 0'), 0);
    t.strictEquals(await runFilter('0 and 1'), 0);
    t.strictEquals(await runFilter('1 and 0'), 0);
    t.strictEquals(await runFilter('1 and 1'), 1);
    t.strictEquals(await runFilter('0 or 0'), 0);
    t.strictEquals(await runFilter('0 or 1'), 1);
    t.strictEquals(await runFilter('1 or 0'), 1);
    t.strictEquals(await runFilter('1 or 1'), 1);
    t.strictEquals(await runFilter('this_is_undefined.really or 1'), 1);
    t.strictEquals(await runFilter('thisis.really or 0', { thisis: {} }), 0);
    t.strictEquals(await runFilter('thisis.really or 1', { thisis: {} }), 1);
    t.strictEquals(await runFilter('thisis.really or 0', { thisis: { really: {} } }), 1);
    t.strictEquals(await runFilter('not 0'), 1);
    t.strictEquals(await runFilter('not 1'), 0);
    t.strictEquals(await runFilter('(0 and 1) or 1'), 1);
    t.strictEquals(await runFilter('0 and (1 or 1)'), 0);
    t.strictEquals(await runFilter('0 and 1 or 1'), 1);
    t.strictEquals(await runFilter('1 or 1 and 0'), 1);
    t.strictEquals(await runFilter('not 1 and 0'), 0);
  });

  arithmetic.end();
});
