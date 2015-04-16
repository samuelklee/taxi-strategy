from collections import Hashable, OrderedDict
import functools

class memoize(object):
    '''Decorator. Caches a function's return value each time it is called.
    If called later with the same arguments, the cached value is returned
    (not reevaluated).  
    Modification of standard snippet from https://wiki.python.org/moin/PythonDecoratorLibrary.
    Takes optional argument k, and only stores last k values calculated.'''
    def __init__(self, k=None):
        self.k = k
        self.cache = OrderedDict()
    def __call__(self, func):
        def wrapped_func(*args):
            if not isinstance(args, Hashable):
                #don't memoize if any argument is immutable/hashable
                return func(*args)
            if args in self.cache:
                return self.cache[args]
            else:
                value = func(*args)
                self.cache[args] = value
                if self.k is not None and len(self.cache) > self.k:
                     self.cache.popitem(last=False) #swap for debug line below
                return value
        return wrapped_func
