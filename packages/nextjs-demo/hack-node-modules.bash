#!/bin/bash

if [ "$CI" != "true" ]; then
  sed -i '' 's/runtime: \"automatic\"/runtime: \"classic\"/g' node_modules/next/dist/build/babel/preset.js
fi