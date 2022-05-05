#!/usr/bin/env bash

set -euxo pipefail
cd "${0%/*}"

pushd ./seabios
git clone -b 1.12-stable --single-branch https://git.seabios.org/seabios.git
cp ./.config ./seabios/
make -C seabios

cp seabios/out/bios.bin seabios/out/vgabios.bin ../build/

rm -rf ./seabios
popd
