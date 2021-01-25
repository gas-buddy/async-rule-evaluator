import toPath from 'lodash.topath';
import { parser } from '../parser';

const AsyncFunction = Object.getPrototypeOf(async () => true).constructor;
const OBJECT_RESOLVER = Symbol('Property resolver assigned to filtered objects');

const std = {
  numify(v) {
    if (v !== null && typeof v === 'object') {
      return 1;
    }
    return Number(v);
  },

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

  isSubsetInexact(a, b) {
    const A = std.coerceArray(a);
    const B = std.coerceArray(b);
    return +A.every(val => B.findIndex(v => (String(v) === String(val))) >= 0);
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

export function resetObjectResolver(obj) {
  delete obj[OBJECT_RESOLVER];
}

export function getObjectResolver(obj) {
  if (!obj) {
    return () => undefined;
  }

  if (obj[OBJECT_RESOLVER]) {
    return obj[OBJECT_RESOLVER];
  }
  const cachedPromises = new WeakMap();
  async function objectResolver(name) {
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
        if (cacheEntry && Object.hasOwnProperty.call(cacheEntry, key)) {
          currentVal = cacheEntry[key];
        } else {
          // By passing objectResolver to the fn, it can "depend" on other promises
          // and still get the cache benefits
          currentVal = currentVal(objectResolver, obj, current, name);
          // Need to get this again because someone else may have made it
          cacheEntry = cachedPromises.get(current);
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
  Object.defineProperty(obj, OBJECT_RESOLVER, { value: objectResolver, enumerable: false, configurable: true });
  return objectResolver;
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
    length(o) { return o?.length || 0; },
    lower(a) {
      if (a === null || a === undefined) {
        return a;
      }
      return a.toString().toLocaleLowerCase();
    },
    substr(a, from, length) {
      if (a === null || a === undefined) {
        return a;
      }
      return a.toString().substr(from, length);
    },
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
  const func = new AsyncFunction('fns', 'std', 'prop', js.join(''));

  if (onParse) {
    onParse({
      input,
      tree,
      functionObject: func,
      pathReferences,
    });
  }

  return async function asyncRuleEvaluator(data) {
    return func(allFunctions, std, customResolver || getObjectResolver(data));
  };
}
