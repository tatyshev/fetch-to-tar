#!/bin/bash

./node_modules/.bin/rollup -c rollup.config.ts
ls dist/*.d.ts | grep -v index.d.ts | xargs rm
mv dist/index.d.ts dist/fetch-to-tar.d.ts
