import { useState, useEffect, useCallback } from 'react';
import useInstance from '@use-it/instance';

const assert = (condition, msg) => {
  if (!condition) {
    throw new Error(msg);
  }
};

const createCachedState = (
  configStringOrObject = assert(false, 'createCachedState: must specify a config object or a namespace string')
) => {
  const config = typeof configStringOrObject === 'string'
    ? { namespace: configStringOrObject }
    : configStringOrObject;

  const {
    namespace = assert(false, 'createCachedState: namespace is required'),
    storageProvider = null, // null = don't persist
    element = global,
  } = config;

  assert(!namespace.includes('.'), 'createCachedState: namespace may not contain a "."');

  // hydrate the cache with the value from the storageProvider
  const storageValueNames = storageProvider && storageProvider.getItem(namespace);
  const cachedValues = {};
  const setters = {};

  if (storageValueNames) {
    const names = JSON.parse(storageValueNames);
    names.forEach((name) => {
      const json = storageProvider.getItem(`${namespace}.${name}`);
      cachedValues[name] = JSON.parse(json);
    });
  }

  // register listener globally in case another tab updates
  // while instances on this tab have unmounted
  // when they remount, they will hydrate initialState from cache
  if (storageProvider && element) {
    element.addEventListener('storage', ({ key: eventKey, newValue }) => {
      const [ns, ...keySegments] = eventKey.split('.');
      if (namespace === ns) {
        const name = keySegments.join('.');
        if (name) {
          const value = JSON.parse(newValue);
          cachedValues[name] = value;
          (setters[name] || []).forEach((setter) => {
            setter(value);
          });
        }
      }
    });
  }

  // this is the custom hook that will be returned from createCachedState
  const useCachedState = ({ name = 'default', initialValue }) => {
    const self = useInstance(() => {
      if (!(name in cachedValues)) {
        const value = typeof initialValue === 'function' ? initialValue() : initialValue;
        cachedValues[name] = value;
      }
      return { shouldPersistState: false };
    });
    const [state, setState] = useState(cachedValues[name]);

    // add/remove this setState to/from array of setters on mount/unmount
    useEffect(() => {
      const currentSetters = setters[name] || [];
      setters[name] = [...currentSetters, setState];
      return () => {
        setters[name] = setters[name].filter(setter => setter === setState);
      };
    }, [name]);

    const setAllInstances = useCallback(
      (valueOrFunction) => {
        // we don't know the actual state value as it could be a function
        // so tell this instance to persist on the next function interaction
        // (below in useEffect)
        self.shouldPersistState = true;
        setters[name].forEach((setter) => {
          setter(valueOrFunction);
        });
      },
      [name, self]
    );

    useEffect(() => {
      if (self.shouldPersistState) {
        // cache the actual state value and optionally persist to the storageProvider
        self.shouldPersistState = false;
        cachedValues[name] = state;
        if (storageProvider) {
          storageProvider.setItem(`${namespace}.${name}`, JSON.stringify(state));
          storageProvider.setItem(namespace, JSON.stringify(Object.keys(cachedValues)));
        }
      }
    });

    return [state, setAllInstances];
  };

  return useCachedState;
};

export default createCachedState;
