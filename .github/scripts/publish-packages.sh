#!/usr/bin/env bash
# Publish prepared tarballs, skipping versions already present on npm.
# Requires RUNNER_TEMP, NPM_DIST_TAG, and PACKAGE_VERSION; performs real publishing.
set -euo pipefail
shopt -s nullglob
packages=("$RUNNER_TEMP/npm-packages/"*.tgz)
test "${#packages[@]}" -gt 0
for package in "${packages[@]}"; do
  manifest="$(tar -xOf "$package" package/package.json)"
  name="$(jq -r '.name' <<< "$manifest")"
  version="$(jq -r '.version' <<< "$manifest")"
  test "$version" = "$PACKAGE_VERSION"
  test "$NPM_DIST_TAG" = beta || test "$NPM_DIST_TAG" = latest

  # Allow retries after a partially completed release; fail on errors other than E404.
  if npm view "$name@$version" version --json --registry=https://registry.npmjs.org > "$RUNNER_TEMP/npm-version.json"; then
    test "$(jq -r '.' "$RUNNER_TEMP/npm-version.json")" = "$version"
    echo "Already published: $name@$version"
    continue
  elif ! jq -e '.error.code == "E404"' "$RUNNER_TEMP/npm-version.json" > /dev/null; then
    echo "Unable to check published version: $name@$version"
    exit 1
  fi

  npm publish "$package" --access public --tag "$NPM_DIST_TAG" --ignore-scripts --registry=https://registry.npmjs.org
done
