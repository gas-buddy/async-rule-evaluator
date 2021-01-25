import tap from 'tap';
import { toFunction } from '../src';

tap.test('Object support', async (obj) => {
  obj.test('can bind to data', async (t) => {
    const something = toFunction('1 + foo * bar');
    t.strictEquals(await something({ foo: 5, bar: 2 }), 11);
    t.strictEquals(await something({ foo: 2, bar: 1 }), 3);
  });

  obj.test('includes symbols with dots', async (t) => {
    t.strictEquals(await toFunction('hello.world.foo')({ hello: { world: { foo: 123 } } }), 123);
    t.strictEquals(await toFunction('order.gooandstuff')({ order: { gooandstuff: 123 } }), 123);
  });

  obj.test('includes quoted symbols', async (t) => {
    t.strictEquals(await toFunction('\'hello-world-foo\'')({ 'hello-world-foo': 123 }), 123);
    t.strictEquals(await toFunction('\'order+goo*and#stuff\'')({ 'order+goo*and#stuff': 123 }), 123);
  });

  obj.test('includes symbols with $ and _', async (t) => {
    t.strictEquals(await toFunction('$_.0$$')({ $_: { '0$$': 123 } }), 123);
  });

  obj.test('disallows symbols starting with numerals', async (t) => {
    t.throws(() => toFunction('0hey'));
    t.throws(() => toFunction('123.456hey'));
  });

  obj.test('null should be falsy', async (t) => {
    const checkfornull = toFunction('myobj.myprop');
    t.notOk(await checkfornull({ myobj: { myprop: null } }));
  });

  obj.end();
});
