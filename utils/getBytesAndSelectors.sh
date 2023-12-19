#!/bin/sh
forge_out=$(forge config | grep -m 1 'out =' | awk '{print $3}' | tr -d '"' | head -n 1)

# bytecodes found to array
bytecodes="[$(for filename in $@; do
    jq -r '.bytecode.object' ./$forge_out/$(basename $filename)/$(basename $filename .sol).json
done | tr '\n' ',' | sed 's/,$//')]"

selectors="[$(for filename in $@; do
    jq -r '.methodIdentifiers | join(",") | "[" + . + "]"' ./$forge_out/$(basename $filename)/$(basename $filename .sol).json
done | tr '\n' ',' | sed 's/,$//')]"

filenames="[$(for filename in $@; do
    echo "\"$(basename $filename .sol)\""
done | tr '\n' ',' | sed 's/,$//')]"
cast abi-encode "f(string[],bytes[],bytes4[][])" $filenames $bytecodes $selectors

exit 0
