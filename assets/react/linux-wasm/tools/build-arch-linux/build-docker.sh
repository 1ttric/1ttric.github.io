#!/usr/bin/env bash

set -euxo pipefail
cd "${0%/*}"

docker run --rm --privileged -v "$(pwd):/data" debian /data/docker/build.sh