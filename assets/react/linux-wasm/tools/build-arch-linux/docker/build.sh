#!/usr/bin/env bash

set -euxo pipefail
cd "${0%/*}"

apt update
apt install -y ca-certificates packer qemu-system-x86

exec /data/build.sh
