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

const { promise } = fetchToTar({
  entries: [
    { name: 'foo.txt', src: 'http://example.com/foo.txt' },
    { name: 'bar.txt', src: 'http://example.com/bar.txt' },
  ],

  onProgress(value, max) {
    console.log(`Progress: ${valie}/${max}`);
  },
});

promise.then(blob => saveAs(blob));
```
