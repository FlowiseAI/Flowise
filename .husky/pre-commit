#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

pnpm quick # prettify
pnpm lint-staged # eslint lint(also include prettify but prettify support more file extensions than eslint, so run prettify first)
