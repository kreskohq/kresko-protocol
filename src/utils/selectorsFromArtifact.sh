#!/bin/sh

if [ "$#" -ne 1 ]; then
    echo "Usage: utils/selectorsFromArtifact.sh <facet_name> " >&2
    exit 1
fi

if [ -e ./artifacts/foundry/$@.sol/$@.json ]; then
    cast abi-encode "f(bytes4[])" "$(jq -r '.methodIdentifiers | join(",") | "[" + . + "]"' ./artifacts/foundry/$@.sol/$@.json)"
else
    echo "Artifact not found" >&2
    exit 1
fi

exit 0
