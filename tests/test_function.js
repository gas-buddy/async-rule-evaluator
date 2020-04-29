import tap from 'tap';
import { toFunction } from '../src';

let counter = 0;
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
    let filter = toFunction('obj.more.cowbell == true');
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
  });

  test.test('inverted array match', async (t) => {
    const filter = toFunction('"red" in foo');
    t.ok(await filter(doc2), 'Should match intended target');
    t.notOk(await filter(doc1), 'Should not match unintended target');
    t.notOk(await filter(doc3), 'Should not match unintended target');
  });

  test.test('event interception', (t) => {
    let code;
    toFunction('transactions <= 5 and abs(profit) > 20.5', {
      onParse({ functionObject }) {
        code = functionObject.toString();
      },
    });
    t.ok(code.startsWith('async function anonymous(fns,std,prop,data'), 'Code should start with expected value');
    t.ok(code.includes('return (Number((Number((await prop("transactions", data))<=(5)))&&(Number(((std.isfn(fns, "abs") ? fns["abs"]((await prop("profit", data))) : std.unknown("abs")))> (20.5)))));'), 'Code should match expectation');
    t.end();
  });

  test.end();
});
