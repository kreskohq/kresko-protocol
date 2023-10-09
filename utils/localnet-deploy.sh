source .env

forge script src/contracts/scripts/Localnet.s.sol:Localnet --ffi --fork-url http://localhost:8545 -vv --broadcast
