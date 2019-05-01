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
  const storageValueKeys = storageProvider && storageProvider.getItem(namespace);
  const cachedValues = {};
  const setters = {};

  if (storageValueKeys) {
    const keys = JSON.parse(storageValueKeys);
    keys.forEach((key) => {
      const json = storageProvider.getItem(`${namespace}.${key}`);
      cachedValues[key] = JSON.parse(json);
    });
  }

  // register listener globally in case another tab updates
  // while instances on this tab have unmounted
  // when they remount, they will hydrate initialState from cache
  if (storageProvider && element) {
    element.addEventListener('storage', ({ key: eventKey, newValue }) => {
      const [ns, ...keySegments] = eventKey.split('.');
      if (namespace === ns) {
        const key = keySegments.join('.');
        if (key) {
          const value = JSON.parse(newValue);
          cachedValues[key] = value;
          (setters[key] || []).forEach((setter) => {
            setter(value);
          });
        }
      }
    });
  }

  // this is the custom hook that will be returned from createCachedState
  const useCachedState = ({ key = 'default', initialValue }) => {
    const self = useInstance(() => {
      if (!(key in cachedValues)) {
        const value = typeof initialValue === 'function' ? initialValue() : initialValue;
        cachedValues[key] = value;
      }
      return { shouldPersistState: false };
    });
    const [state, setState] = useState(cachedValues[key]);

    // add/remove this setState to/from array of setters on mount/unmount
    useEffect(() => {
      const currentSetters = setters[key] || [];
      setters[key] = [...currentSetters, setState];
      return () => {
        setters[key] = setters[key].filter(setter => setter === setState);
      };
    }, [key]);

    const setAllInstances = useCallback(
      (valueOrFunction) => {
        // we don't know the actual state value as it could be a function
        // so tell this instance to persist on the next function interaction
        // (below in useEffect)
        self.shouldPersistState = true;
        setters[key].forEach((setter) => {
          setter(valueOrFunction);
        });
      },
      [key, self]
    );

    useEffect(() => {
      if (self.shouldPersistState) {
        // cache the actual state value and optionally persist to the storageProvider
        self.shouldPersistState = false;
        cachedValues[key] = state;
        if (storageProvider) {
          storageProvider.setItem(`${namespace}.${key}`, JSON.stringify(state));
          storageProvider.setItem(namespace, JSON.stringify(Object.keys(cachedValues)));
        }
      }
    });

    return [state, setAllInstances];
  };

  return useCachedState;
};

export default createCachedState;
