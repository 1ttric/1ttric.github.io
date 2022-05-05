#!/usr/bin/env bash

set -euxo pipefail
cd "${0%/*}"

apt update
apt install -y git make python gcc binutils

exec /data/build.sh
