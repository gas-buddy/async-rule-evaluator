import toPath from 'lodash.topath';
import { parser } from '../parser';

const AsyncFunction = Object.getPrototypeOf(async () => true).constructor;

const std = {
  isfn(fns, funcName) {
    return Object.hasOwnProperty.call(fns, funcName) && typeof fns[funcName] === 'function';
  },

  unknown(funcName) {
    throw ReferenceError(`Unknown function: ${funcName}()`);
  },

  coerceArray(value) {
    if (Array.isArray(value)) return value;
    return [value];
  },

  coerceBoolean(value) {
    if (typeof value === 'boolean') return +value;
    return value;
  },

  isSubset(a, b) {
    const A = std.coerceArray(a);
    const B = std.coerceArray(b);
    return +A.every(val => B.includes(val));
  },

  buildString(inQuote, inLiteral) {
    const quote = String(inQuote)[0];
    const literal = String(inLiteral);
    let built = '';

    if (literal[0] !== quote || literal[literal.length - 1] !== quote) throw new Error('Unexpected internal error: String literal doesn\'t begin/end with the right quotation mark.');

    for (let i = 1; i < literal.length - 1; i += 1) {
      if (literal[i] === '\\') {
        i += 1;
        if (i >= literal.length - 1) throw new Error('Unexpected internal error: Unescaped backslash at the end of string literal.');

        if (literal[i] === '\\') built += '\\';
        else if (literal[i] === quote) built += quote;
        else throw new Error(`Unexpected internal error: Invalid escaped character in string literal: ${literal[i]}`);
      } else if (literal[i] === quote) {
        throw new Error('Unexpected internal error: String literal contains unescaped quotation mark.');
      } else {
        built += literal[i];
      }
    }

    return JSON.stringify(built);
  },
};

parser.yy = std;

export function parse(input) {
  return parser.parse(input);
}

export function toFunction(input, { functions, onParse, customResolver } = {}) {
  const allFunctions = {
    abs: Math.abs,
    ceil: Math.ceil,
    floor: Math.floor,
    log: Math.log,
    max: Math.max,
    min: Math.min,
    random: Math.random,
    round: Math.round,
    sqrt: Math.sqrt,
    ...functions,
  };

  const tree = parser.parse(input);
  const js = [];
  const pathReferences = [];

  js.push('return ');
  function toJs(node) {
    if (Array.isArray(node)) {
      if (node[1] === 'await prop(') {
        pathReferences.push(JSON.parse(node[2]));
      }
      node.forEach(toJs);
    } else {
      js.push(node);
    }
  }
  tree.forEach(toJs);
  js.push(';');

  async function prop(name, obj, cachedPromises) {
    if (name === 'true') { return 1; }
    if (name === 'false') { return 0; }

    let current = obj;
    const path = toPath(name);
    let index = 0;
    const { length } = path;

    // Walk the specified path, looking for functions and promises along the way.
    // If we find a function, invoke it and cache the result (which is often a promise)
    while (current != null && index < length) {
      const key = String(path[index]);
      let currentVal = Object.prototype.hasOwnProperty.call(current, key) ? current[key] : undefined;
      if (typeof currentVal === 'function') {
        let cacheEntry = cachedPromises.get(current);
        const cachedValue = cacheEntry?.[key];
        if (cachedValue) {
          currentVal = cachedValue;
        } else {
          currentVal = currentVal(obj, current, name);
          if (!cacheEntry) {
            cacheEntry = {};
            cachedPromises.set(current, cacheEntry);
          }
          cacheEntry[key] = currentVal;
        }
      }
      // eslint-disable-next-line no-await-in-loop
      current = await currentVal;
      index += 1;
    }
    return (index && index === length) ? current : undefined;
  }
  const func = new AsyncFunction('fns', 'std', 'prop', 'data', 'cache', js.join(''));

  if (onParse) {
    onParse({
      input,
      tree,
      resolver: prop,
      functionObject: func,
      pathReferences,
    });
  }

  return async function asyncRuleEvaluator(data) { return func(allFunctions, std, customResolver || prop, data, new WeakMap()); };
}
