source .env &&
    forge script src/contracts/scripts/devnet/Devnet.s.sol:WithLocal \
        --mnemonics $MNEMONIC_DEVNET \
        --fork-url $RPC_ARBITRUM_ALCHEMY \
        --fork-block-number 139667500 \
        --with-gas-price 100000000 \
        --skip-simulation \
        --ffi \
        -vvvv
