#!/usr/bin/env bash

set -euxo pipefail
cd "${0%/*}"

find ../assets/react/ -mindepth 1 -maxdepth 1 -type d -exec basename {} \; -exec yarn --cwd {} build \;

