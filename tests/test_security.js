import tap from 'tap';
import { toFunction } from '../src';

async function runFilter(input, data) {
  const fn = toFunction(input);
  return fn(data);
}

tap.test('Security', async (security) => {
  security.strictEquals(await runFilter('toString'), undefined);

  global.p0wned = false;
  const attack = toFunction('constructor.constructor.name.replace("",constructor.constructor("global.p0wned=true"))');
  security.ok(attack, 'Should compile');
  const result = await attack().catch(e => e);
  security.ok(result instanceof Error, 'Should be an error return');
  security.strictEquals(global.p0wned, false, 'Should not modify global');

  security.strictEquals(await toFunction('a')(Object.create({ a: 42 })), undefined, 'Should not access prototype props');
});
