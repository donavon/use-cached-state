import { renderHook, act, cleanup } from 'react-hooks-testing-library';
import createCachedState from '../src';

afterEach(cleanup);

const createMockElement = () => {
  const element = {
    _handlers: {},
    addEventListener: (eventName, handler) => {
      element._handlers[eventName] = handler;
    },
    removeEventListener: (eventName) => {
      element._handlers[eventName] = null;
    },
    dispatchEvent: (event) => {
      element._handlers[event.type](event);
    },
  };
  return element;
};

const createMockStorage = () => {
  const storage = {
    _values: {},
    getItem: key => (key in storage._values ? storage._values[key] : null),
    setItem: (key, value) => {
      storage._values[key] = value;
    },
  };
  return storage;
};

const namespace = 'NS';
const defaultName = 'default';

describe('createCachedState', () => {
  it('will throw an exception if not passed any arguments', () => {
    expect(() => createCachedState()).toThrow(Error);
  });

  it('will throw an exception if passed a config object but namespace is not provided', () => {
    const element = createMockElement();
    const storageProvider = null;
    expect(() => createCachedState({
      element, storageProvider,
    })).toThrow(Error);
  });

  it('will throw an exception if namespace contains a "."', () => {
    const element = createMockElement();
    const storageProvider = null;
    expect(() => createCachedState({
      element, storageProvider, namespace: 'foo.bar',
    })).toThrow(Error);
  });

  it('will return a useCachedState custom hook if passed a config object`', () => {
    const element = createMockElement();
    const useCachedState = createCachedState({ namespace, element });
    expect(typeof useCachedState).toBe('function');
  });

  it('will return a useCachedState custom hook if passed a namespace string`', () => {
    const useCachedState = createCachedState(namespace);
    expect(typeof useCachedState).toBe('function');
  });

  it('will not setup a storage listener if storageProvider is null`', () => {
    const element = createMockElement();
    const storageProvider = null;
    createCachedState({ namespace, element, storageProvider });
    expect(element._handlers.storage).toBeUndefined();
  });

  it('will setup a storage listener if storageProvider is provided`', () => {
    const element = createMockElement();
    const storageProvider = createMockStorage();
    createCachedState({ namespace, element, storageProvider });
    expect(typeof element._handlers.storage).toBe('function');
  });
});

describe('useCachedState', () => {
  it('returns an array containing a value and a setter function`', () => {
    const element = createMockElement();
    const storageProvider = null;
    const useCachedState = createCachedState({
      namespace, element, storageProvider,
    });

    let value;
    let setter;
    renderHook(() => {
      [value, setter] = useCachedState({ initialValue: 'foo' });
    });

    expect(value).toBe('foo');
    expect(typeof setter).toBe('function');
  });

  it('accepts a function as initialValue`', () => {
    const element = createMockElement();
    const storageProvider = null;
    const useCachedState = createCachedState({
      namespace, element, storageProvider,
    });

    let value;
    let setter;
    renderHook(() => {
      [value, setter] = useCachedState({ initialValue: () => 'foo' });
    });

    expect(value).toBe('foo');
    expect(typeof setter).toBe('function');
  });

  it('calling setter function will cause new return value`', () => {
    const element = createMockElement();
    const storageProvider = null;
    const useCachedState = createCachedState({
      namespace, element, storageProvider,
    });

    let value;
    let setter;
    renderHook(() => {
      [value, setter] = useCachedState({ initialValue: 'foo' });
    });
    act(() => setter('bar'));

    expect(value).toBe('bar');
  });

  it('calling setter function will persist to localStorage', (done) => {
    const element = createMockElement();
    const storageProvider = createMockStorage();
    const useCachedState = createCachedState({
      namespace, element, storageProvider,
    });

    let value;
    let setter;
    renderHook(() => {
      [value, setter] = useCachedState({ initialValue: 'foo' });
    });
    act(() => setter('bar'));

    expect(value).toBe('bar');
    setTimeout(() => {
      expect(storageProvider._values[namespace]).toBe(JSON.stringify([defaultName]));
      expect(storageProvider._values[`${namespace}.${defaultName}`]).toBe(JSON.stringify('bar'));
      done();
    }, 1);
  });

  it('won\'t throw an exception if running SSR ()', () => {
    const element = null;
    const storageProvider = createMockStorage();
    const useCachedState = createCachedState({
      namespace, storageProvider, element,
    });

    let value;
    renderHook(() => {
      [value] = useCachedState({ initialValue: 'foo' });
    });

    expect(value).toBe('foo');
  });

  it('will hydrate value from localStorage`', () => {
    const element = createMockElement();
    const storageProvider = createMockStorage();
    storageProvider.setItem(namespace, JSON.stringify([defaultName]));
    storageProvider.setItem(`${namespace}.${defaultName}`, JSON.stringify('bar'));

    const useCachedState = createCachedState({
      namespace, element, storageProvider,
    });

    let value;
    renderHook(() => {
      [value] = useCachedState({ initialValue: 'foo' });
    });

    expect(value).toBe('bar');
  });

  it('will hydrate value from localStorage (even if value is null)`', () => {
    const element = createMockElement();
    const storageProvider = createMockStorage();
    storageProvider.setItem(namespace, JSON.stringify([defaultName]));
    storageProvider.setItem(`${namespace}.${defaultName}`, JSON.stringify(null));

    const useCachedState = createCachedState({
      namespace, element, storageProvider,
    });

    let value;
    renderHook(() => {
      [value] = useCachedState({ initialValue: 'foo' });
    });

    expect(value).toBe(null);
  });

  it('will hydrate value from storage event`', () => {
    const element = createMockElement();
    const storageProvider = createMockStorage();
    const useCachedState = createCachedState({
      namespace, element, storageProvider,
    });

    const event = { type: 'storage', key: `${namespace}.${defaultName}`, newValue: JSON.stringify('bar') };
    element.dispatchEvent(event);

    let value;
    renderHook(() => {
      [value] = useCachedState({ initialValue: 'foo' });
    });

    expect(value).toBe('bar');
  });

  it('will default element to global', (done) => {
    const storageProvider = createMockStorage();
    const useCachedState = createCachedState({
      namespace, storageProvider,
    });

    let value;
    renderHook(() => {
      [value] = useCachedState({ initialValue: 'foo' });
    });

    const event = new Event('storage');
    event.key = `${namespace}.${defaultName}`;
    event.newValue = JSON.stringify('bar');
    global.dispatchEvent(event);

    setTimeout(() => {
      expect(value).toBe('bar');
      done();
    }, 1);
  });

  it('can accept a non-default name with "."s', () => {
    const element = createMockElement();
    const storageProvider = createMockStorage();
    const useCachedState = createCachedState({
      namespace, element, storageProvider,
    });
    const nameWithDots = 'foo.bar';

    const event = { type: 'storage', key: `${namespace}.${nameWithDots}`, newValue: JSON.stringify('bar') };
    element.dispatchEvent(event);

    let value;
    renderHook(() => {
      [value] = useCachedState({ initialValue: 'foo', name: nameWithDots });
    });

    expect(value).toBe('bar');
  });

  it('will not hydrate value from storage events that do not match name`', () => {
    const element = createMockElement();
    const storageProvider = createMockStorage();
    const useCachedState = createCachedState({
      namespace, element, storageProvider,
    });

    const event = { type: 'storage', key: 'some-other-key', newValue: JSON.stringify('bar') };
    element.dispatchEvent(event);

    let value;
    renderHook(() => {
      [value] = useCachedState({ initialValue: 'foo' });
    });

    expect(value).toBe('foo');
  });

  it('will not hydrate value from storage events for the namespace`', () => {
    const element = createMockElement();
    const storageProvider = createMockStorage();
    const useCachedState = createCachedState({
      namespace, element, storageProvider,
    });

    const event = { type: 'storage', key: namespace, newValue: JSON.stringify('bar') };
    element.dispatchEvent(event);

    let value;
    renderHook(() => {
      [value] = useCachedState({ initialValue: 'foo' });
    });

    expect(value).toBe('foo');
  });

  it('will return a new value after a storage event`', (done) => {
    const element = createMockElement();
    const storageProvider = createMockStorage();
    const useCachedState = createCachedState({
      namespace, element, storageProvider,
    });

    const event = { type: 'storage', key: `${namespace}.${defaultName}`, newValue: JSON.stringify('bar') };

    let value;
    renderHook(() => {
      [value] = useCachedState({ initialValue: 'foo' });
    });
    element.dispatchEvent(event);

    setTimeout(() => {
      expect(value).toBe('bar');
      done();
    }, 1);
  });

  it('will ignore storage events that do not match name`', (done) => {
    const element = createMockElement();
    const storageProvider = createMockStorage();
    const useCachedState = createCachedState({
      namespace, element, storageProvider,
    });

    const event = { type: 'storage', key: 'some-other-key', newValue: JSON.stringify('bar') };

    let value;
    renderHook(() => {
      [value] = useCachedState({ initialValue: 'foo' });
    });
    element.dispatchEvent(event);

    setTimeout(() => {
      expect(value).toBe('foo');
      done();
    }, 10);
  });
});
