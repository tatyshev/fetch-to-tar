/* tslint:disable max-line-length */
/* tslint:disable no-var-requires */

import fetchToTar from '../src';
import React, { Component } from 'react';

interface IState {
  value?: number;
  max?: number;
  error: any;
}

const ENTRIES = [
  { name: 'hello.txt', src: 'https://raw.githubusercontent.com/tatyshev/fetch-to-tar/master/sandbox/hello.txt' },
];

export default class App extends Component<{}, IState> {
  state = {
    value: 0,
    max: 0,
    error: null,
  };

  perform = () => {
    const fetching = fetchToTar({
      entries: ENTRIES,
      onProgress: (value, max) => {
        this.setState({ value, max });
      },
    });

    fetching.then((blob) => {
      const link = document.createElement('a');
      link.download = `${Date.now()}.tar`;
      link.href = URL.createObjectURL(blob);

      document.body.append(link);
      link.click();

      setTimeout(() => document.body.removeChild(link));
    });

    fetching.catch((err) => {
      this.setState({ error: err });
    });
  }

  render() {
    const { value, max, error } = this.state;

    return (
      <div className="b-sandbox">
        <progress max={max} value={value}/> ({Math.floor(value)}/{max})
        <br/>
        <button className="b-sandbox__button" onClick={this.perform}>
          Perform
        </button>

        <br/>
        <br/>
        <br/>

        { String(error) }
      </div>
    );
  }
}
