#!/bin/bash

set -euxo pipefail

echo -e "\033[0;32mDeploying updates to GitHub...\033[0m"

# Remove old files
rm -rf ./public/*

# Make sure we are building against the most recent version of the site
git submodule update --init --remote --recursive
cd public
git checkout master
git pull
cd ..

# Build the project.
hugo

# Commit and push changes to website submodule
cd public
git add .
msg="rebuilding site $(date)"
if [ $# -eq 1 ]
  then msg="${1}"
fi
git commit -m "${msg}"
git push
cd ..

