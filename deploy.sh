#!/bin/bash

set -e

echo -e "\033[0;32mDeploying updates to GitHub...\033[0m"

# Make sure we are building against the most recent version of the site
git submodule update --init --remote --recursive

# Build the project.
hugo -t hugo-nuo

# Commit and push changes to website submodule
cd public
git checkout master
git add .
msg="rebuilding site `date`"
if [ $# -eq 1 ]
  then msg="$1"
fi
git commit -m "$msg"
git push origin master
cd ..

