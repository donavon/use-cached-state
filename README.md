# use-cached-state

A cached and optionally persisted alternative to useState.

[![npm version](https://badge.fury.io/js/use-cached-state.svg)](https://badge.fury.io/js/use-cached-state)

![use-cached-state](https://user-images.githubusercontent.com/887639/57014924-3e163580-6be0-11e9-85ca-c60166372e53.gif)

## Features

💰 Caches state values even after your component unmounts.

💰 Optionally persists to `localStorage`.

💰 Shares values between components on the same page and even in different browser tabs!

## Installation

```bash
$ npm i use-cached-state
```

or

```bash
$ yarn add use-cached-state
```

## Usage

Here is a basic setup. Perform the following from within your module, but not in your component.
This will create a custom Hook that you can then use in your component.

```js
const useCachedState = createCachedState(config);
```

Next, from without your component, do this (instead of `useState`).

```js
const [state, setState] = useCachedState(options);
```

### Parameters

`createCachedState` is passed a single config object with the following properties.

| Parameter   | Description                                                                                     |
| :---------- | :---------------------------------------------------------------------------------------------- |
| `namespace` | A required string that will be used as a namespace. |
| `storageProvider` | A storage provider to use. The default is `null` which specifies NOT to persist to storage (i.e. just cache in memory). The storage provider must provide a `getItem` and a `setItem` method. You may use `localStorage` or `sessionStorage` or your own custom storage provider.  |


### Return

`createCachedState` returns a custom Hook that you can use from within your component. This custom Hook accepts an options object with the following properties.

| Property       | Description                                                                                     |
| :------------- | :--------------------- |
| `name` | A optional string that represents the name to use for this instance of the component. If all instances are to share the same state, pass the same name (or use the default). |
| `initialValue` | This will be the initial value used. |

## Example

In this example, we replace `useState` with a call to `useCachedCounterState`.
This gives us the same state functionality, but it also persists to `localstorage`.

```js
const useCachedCounterState = createCachedState({
  namespace: 'counter',
  storageProvider: localStorage,
});

const CountButton = ({ name, initialValue }) => {
  const [count, setCount] = useCachedCounterState({
    name,
    initialValue,
  });
  const increment = () => setCount(c => c + 1);

  return (
    <button onClick={increment}>
      Click Me: {count}
    </button>
  );
};
```

### Live demo

You can view/edit the sample code above on CodeSandbox.

[![Edit demo app on CodeSandbox](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/10kj4n30j7)

## Prior art

This is the next generation of my own [`use-persisted-state`](https://github.com/donavon/use-persisted-state/)
package.
It was inspired by [a tweet](https://twitter.com/ryanflorence/status/1111402632218734593)
from Ryan Florence.

## License

**[MIT](LICENSE)** Licensed

## Contributors

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore -->
<table><tr><td align="center"><a href="http://donavon.com"><img src="https://avatars3.githubusercontent.com/u/887639?v=4" width="100px;" alt="Donavon West"/><br /><sub><b>Donavon West</b></sub></a><br /><a href="#ideas-donavon" title="Ideas, Planning, & Feedback">🤔</a> <a href="#infra-donavon" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="#maintenance-donavon" title="Maintenance">🚧</a> <a href="#review-donavon" title="Reviewed Pull Requests">👀</a> <a href="https://github.com/donavon/use-cached-state/commits?author=donavon" title="Code">💻</a> <a href="#design-donavon" title="Design">🎨</a></td></tr></table>

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!
