async-rule-evaluator
====================

![Node CI](https://github.com/gas-buddy/async-rule-evaluator/workflows/Node%20CI/badge.svg)

A simple DSL based on [Filtrex](https://github.com/joewalnes/filtrex) and its forks that supports lazy
and asynchronous comparisons. Essentially this means the object you pass in for matching
can include functions that don't evaluate unless a comparison asks for them, and that these
functions can be asynchronous.

The main thing we took from Filtrex is the grammar, which seemed like a good one,
but modified for our use case. For example, we removed the `x of y` syntax in favor
of lodash path-based lookup (i.e. `x.y`). We also made the execution more pluggable with events
and of course added functor and promise support. See tests/test_functions for specific examples
of promise and function handling.

Features
--------
*   **Simple!** End user expression language looks like this `transactions <= 5 and abs(profit) > 20.5`
*   **Fast!** Expressions get compiled into JavaScript functions, offering the same performance as if it had been hand coded. e.g. `function(item) { return item.transactions <=5 && Math.abs(item.profit) > 20.5; }`
*   **Safe!** You as the developer have control of which data can be accessed and the functions that can be called. Expressions cannot escape the sandbox.
*   **Pluggable!** Add your own data and functions.
*   **Predictable!** Because users can't define loops or recursive functions, you know you won't be left hanging.
*   **Asyncy** Not everything happens at once, and some things don't happen immediately - this module supports any property on your object being a function, an async function and/or a promise. Additionally, you can get notified (via the onParse option) of what properties will be accessed and kick off things in parallel, if you so choose.

10 second tutorial
------------------

```javascript
// Input from user (e.g. search filter)
var expression = 'transactions <= 5 and abs(profit) > 20.5';

// Compile expression to executable function
var myfilter = toFunction(expression);

// Execute function
myfilter({transactions: 3, profit:-40.5}); // returns 1
myfilter({transactions: 3, profit:-14.5}); // returns 0
```

Under the hood, the above expression gets compiled to a clean and fast JavaScript function, looking something like this:

```javascript
// Psuedo-code for resulting function - real thing has lots of parens and Number casting
async function(item) {
  return (await item.transactions) <= 5 && Math.abs((await item.profit)) > 20.5;
}
```

Expressions
-----------

There are only 3 types: numbers, strings and arrays of these. Numbers may be floating point or integers. Boolean logic is applied on the truthy value of values (e.g. any non-zero number is true, any non-empty string is true, otherwise false).

Okay, I lied to you, there are also objects whose properties can be accessed with dot and array notation (thanks to lodash.toPath). And there's undefined. But everything else is just numbers, strings and arrays!

Values | Description
--- | ---
43, -1.234 | Numbers
"hello" | String
" \\" \\\\ " | Escaping of double-quotes and blackslash in string
foo, a.b.c, 'foo-bar' | External data variable defined by application (may be numbers or strings)

Numeric arithmetic | Description
--- | ---
x + y | Add
x - y | Subtract
x * y | Multiply
x / y | Divide
x % y | Modulo
x ^ y | Power

Comparisons | Description
--- | ---
x == y | Equals
x != y | Does not equal
x < y | Less than
x <= y | Less than or equal to
x > y | Greater than
x >= y | Greater than or equal to
x ~= y | Regular expression match
x in (a, b, c) | Equivalent to (x === a or x === b or x === c)
x not in (a, b, c) | Equivalent to (x != a and x != b and x != c)
x in~ (a, b, c) | Equivalent to (String(x) == String(a) or String(x) == String(b) or String(x) == String(c))
x not in~ (a, b, c) | Equivalent to (String(x) != String(a) and String(x) != String(b) and String(x) != String(c))

Boolean logic | Description
--- | ---
x or y | Boolean or
x and y | Boolean and
not x | Boolean not
x ? y : z | If boolean x, value y, else z
( x ) | Explicit operator precedence

Objects and arrays | Description
--- | ---
(a, b, c) | Array
[a, b, c] | Array (synonym)
a in b | Array a is a subset of array b
a in~ b | Array a is a subset of array b using string conversion for comparison
x.y | Property y of object x (x can be a function/promise, y can be a function/promise)

Built-in functions | Description
--- | ---
abs(x) | Absolute value
ceil(x) | Round floating point up
floor(x) | Round floating point down
log(x) | Natural logarithm
max(a, b, c...) | Max value (variable length of args)
min(a, b, c...) | Min value (variable length of args)
random() | Random floating point from 0.0 to 1.0
round(x) | Round floating point
length(x) | Return the length of an array (or the length property of an object), or 0 if x is falsy
lower(x) | If x is null or undefined, return it, else return x.toString().toLocaleLowerCase()
sqrt(x) | Square root
substr(x, start, end) | Get a part of a string

Operator precedence follows that of any sane language.

Adding custom functions
-----------------------

When integrating in to your application, you can add your own custom functions.

```javascript
// Custom function: Return string length.
function strlen(s) {
  return s.length;
}

let options = {
  functions: { strlen }
};

// Compile expression to executable function
let myfilter = toFunction('strlen(firstname) > 5', options);

myfilter({firstname:'Joe'});    // returns 0
myfilter({firstname:'Joseph'}); // returns 1
```

FAQ
---

**What's Jison?**

[Jison](http://zaach.github.io/jison/) is used by async-rule-evaluator to generate the grammar. It's a JavaScript parser generator that does the underlying hard work of understanding the expression. It's based on Flex and Bison. You should not need it at runtime since we
pregenerate the parser and publish it with the package.

**License?**

[MIT](https://github.com/gas-buddy/async-rule-evaluator/raw/master/LICENSE)

**Unit tests?**

Here: [Source](https://github.com/gas-buddy/async-rule-evaluator/blob/master/tests)

**What happens if the expression is malformed?**

Calling `toFunction()` with a malformed expression will throw an exception. You can catch that and display feedback to the user.
A good UI pattern is to attempt to compile on each keystroke and continuously indicate whether the expression is valid.


Contributors
------------

* [@djmax](https://github.com/djmax) Max Metral - the author of this repository
* [@joewalnes](https://github.com/joewalnes) Joe Walnes – the author of the original [filtrex](https://github.com/joewalnes/filtrex) repository
* [@m93a](https://github.com/m93a) Michal Grňo – maintainer of the filtrex NPM package current main developer of filtrex
* [@msantos](https://github.com/msantos) Michael Santos – quoted symbols, regex matches and numerous fixes
* [@bradparks](https://github.com/bradparks) Brad Parks – extensible prop function
* [@arendjr](https://github.com/arendjr) Arend van Beelen jr. – quote escaping in string literals
* [@alexgorbatchev](https://github.com/alexgorbatchev) Alex Gorbatchev – the original maintainer of the NPM package
