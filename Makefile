deploy-local:
	source .env && forge script src/contracts/scripts/devnet/Devnet.s.sol:WithLocal --mnemonics "$$MNEMONIC_DEVNET" --ffi --fork-url "$$RPC_LOCAL" --with-gas-price 100000000 -vv --skip-simulation

deploy-arbitrum:
	source .env && forge script src/contracts/scripts/devnet/Devnet.s.sol:WithArbitrum --mnemonics "$$MNEMONIC_DEVNET" --ffi --fork-url "$$RPC_LOCAL" --broadcast --with-gas-price 100000000 -vv --skip-simulation

server:
	source .env && anvil -m "$$MNEMONIC_DEVNET" -f "$$RPC_ARBITRUM_ALCHEMY" --fork-block-number 139667500

test:
	forge test --ffi