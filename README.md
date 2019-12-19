<h1 align="center">fetch-to-tar</h1>

<p align="center">
  <img src="https://img.shields.io/github/license/tatyshev/fetch-to-tar.svg"/>
  <img src="https://img.shields.io/npm/v/fetch-to-tar.svg"/>
</p>

There are many great <strong>backend based solutions</strong> for downloading multiple files into one archive.
There are many great software engineers who will tell you that this is the right way. But if you need a quick and
lightweight solution that just work in a browser, then `fetch-to-tar` is for you.

## How it works?
`fetch-to-tar` download files in small chunks using [Fetch Api](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API)
and [Stream Api](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API).
Then it saves them to [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
immediately as part of the [GNU TAR](https://www.gnu.org/software/tar/manual/html_node/Standard.html) format.

At the end of the download, it sticks together all chunks and returns as single `Blob`. All saved data in `indexedDB` will be deleted.

<hr>

Basically this is a very simple attempt to make download like mega.nz.
Without encryption and support for older browsers. This is more like an experiment. But it works.

## Limitations

* [Fetch Api](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API) required
* [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) required (RAM is used as fallback)
* Only [same-origin](https://en.wikipedia.org/wiki/Same-origin_policy) requests allowed

## Installation

You can install `fetch-to-tar` using `npm` or `yarn`

```
npm install fetch-to-tar
yarn add fetch-to-tar
```

## Usage

Basic usage example:

```js
const { promise } = fetchToTar({
  entries: [
    { name: 'foo.txt', src: 'http://example.com/foo.txt' },
    { name: 'bar.txt', src: 'http://example.com/bar.txt' },
  ],
});

promise.then(({ blob }) => {
  console.log('Tadaaa:', blob);
});
```

How to show progress:

```js
fetchToTar({
  entries: [
    { name: 'foo.txt', src: 'http://example.com/foo.txt' },
    { name: 'bar.txt', src: 'http://example.com/bar.txt' },
  ],

  onProgress(value, max) {
    console.log(`Progress is: ${value}/${max}`)
  }
});
```

How to cancel download:

```js
const { promise, cancel } = fetchToTar({
  entries: [
    { name: 'foo.txt', src: 'http://example.com/foo.txt' },
    { name: 'bar.txt', src: 'http://example.com/bar.txt' },
  ],
});

if (SomeCondition) {
  cancel()
}
```

You can use any name for creating folder structure:

```js
fetchToTar({
  entries: [
    { name: 'one/foo.txt', src: 'http://example.com/foo.txt' },
    { name: 'two/bar.txt', src: 'http://example.com/bar.txt' },
  ],
});
```

## License

MIT © [Ruslan Tatyshev](http://github.com/tatyshev)
