source .env

forge script src/contracts/scripts/local/Localnet.s.sol:Localnet --ffi -vv --broadcast --mnemonics "$MNEMONIC_LOCALNET"
