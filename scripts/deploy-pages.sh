#!/usr/bin/env bash
# Publish public/ to the gh-pages branch. Stamps a version on every CSS/JS link in index.html
# so browsers fetch the new files straight away instead of a cached copy.
set -euo pipefail
cd "$(dirname "$0")/.."
v=$(date +%Y%m%d%H%M%S)
sed -i -E "s#(href|src)=\"((css|js|data)/[^\"?]+)(\?v=[0-9]+)?\"#\1=\"\2?v=$v\"#g" public/index.html
git add public/index.html
git commit -qm "Publish $v" || true
git push -q origin main
git branch -D gh-pages -q 2>/dev/null || true
git subtree split --prefix public -b gh-pages -q
git push -q -f origin gh-pages
echo "Published version $v"
