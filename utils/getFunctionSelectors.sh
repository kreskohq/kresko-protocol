#!/bin/sh
forge_out=$(forge config | grep -m 1 'out =' | awk '{print $3}' | tr -d '"' | head -n 1)
if [ "$#" -ne 1 ]; then
    echo "Usage: utils/getFunctionSelectors.sh <facet_name> " >&2
    exit 1
fi

if [ -e ./out/foundry/$@.sol/$@.json ]; then
    cast abi-encode "f(bytes4[])" "$(jq -r '.methodIdentifiers | join(",") | "[" + . + "]"' ./$forge_out/$@.sol/$@.json)"
else
    echo "Artifact not found" >&2
    exit 1
fi

exit 0
