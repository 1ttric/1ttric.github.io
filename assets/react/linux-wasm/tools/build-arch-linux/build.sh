#!/usr/bin/env bash

set -euxo pipefail
cd "${0%/*}"

pushd packer
packer build -force template.json
mv output-qemu/archlinux ../build/
popd