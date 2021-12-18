#!/usr/bin/env bash

set -euxo pipefail
cd "${0%/*}"

cd ..
hugo --minify
