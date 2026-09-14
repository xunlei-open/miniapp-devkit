#!/usr/bin/env bash
# Validate the release tag, channel, source commit, and workspace versions.
# Run from the repository root with RELEASE_TAG and EVENT_NAME set.
set -euo pipefail
version="$(node -p "require('./packages/miniapp/package.json').version")"
test "$RELEASE_TAG" = "v$version"

if [[ "$EVENT_NAME" == push ]]; then
  if [[ ! "$version" =~ ^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)-beta(\.(0|[1-9][0-9]*))?$ ]]; then
    echo "Tag pushes only publish beta versions (vX.Y.Z-beta or vX.Y.Z-beta.N)."
    exit 1
  fi
  dist_tag=beta
else
  if [[ ! "$version" =~ ^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ ]]; then
    echo "Published releases must use a stable version (vX.Y.Z)."
    exit 1
  fi
  git merge-base --is-ancestor HEAD origin/main
  dist_tag=latest
fi

for manifest in packages/*/package.json; do
  package_version="$(node -p 'require("./" + process.argv[1]).version' "$manifest")"
  if [[ "$package_version" != "$version" ]]; then
    echo "Version mismatch in $manifest: expected $version, got $package_version."
    exit 1
  fi
done

echo "dist-tag=$dist_tag" >> "$GITHUB_OUTPUT"
echo "version=$version" >> "$GITHUB_OUTPUT"
