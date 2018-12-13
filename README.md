<h1 align="center">
  fetch-to-tar
</h1>

<p align="center">
  <img src="https://img.shields.io/github/license/tatyshev/fetch-to-tar.svg"/>
  <img src="https://img.shields.io/github/package-json/v/tatyshev/fetch-to-tar.svg"/>
  <img src="https://img.shields.io/npm/v/fetch-to-tar.svg"/>
</p>

> **fetchToTar** is the solution to download and saving multiple files into single tar archive on the client-side.

```js
import fetchToTar from 'fetch-to-tar';
import saveAs from 'file-saver';

/**
 * promise - Promise that resolves builded tar archive blob
 * cancel - Function that abort the building of the archive
 */
const { promise, cancel } = fetchToTar({
  entries: [
    { name: 'foo.txt', src: 'http://example.com/foo.txt' },
    { name: 'bar.txt', src: 'http://example.com/bar.txt' },
  ],

  onProgress(value, max) {
    console.log(`Progress: ${value}/${max}`);
  },
});

promise.then(blob => saveAs(blob, 'files.tar'));
```

## Installation

You can install `fetch-to-tar` using `npm` or `yarn`

```
npm install fetch-to-tar
yarn add fetch-to-tar
```

## License

MIT © [Ruslan Tatyshev](http://github.com/tatyshev)
