1.0.0
=====
* Everything changes.

1.1.0
=====
* Modify function calls to include the property resolver, fix the cache of resolutions to be run-specific not filter-specific

1.2.0
=====
* Add length function that returns a length property if present, or 0 if not (or if length property is falsy). Note that this means custom non-numeric length property will make it through

1.3.0
=====
* Rework the object resolution infra to use a bound function tied to the original object via a Symbol property. The advantage of this is that you can reuse the object across filter operations and functions will be cached once.
* Added getObjectResolver and resetObjectResolver so you can participate in the fun too
* Removed true and false from the default property resolver. The spirit of boolean comparison isn't done that way in filtrex

1.6.0
=====
* Previously, an object would convert to NaN in boolean operations, causing "odd" behavior. Now, all objects will be converted to 1 when used in a context where a number is required. This is done by using std.numify (a function we wrote) instead of the generic Number constructor. We don't consider this a breaking change since the behavior before seemed bug-like and underspecified.
