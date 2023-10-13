deploy-local:
	source .env && \
	forge script src/contracts/scripts/devnet/Devnet.s.sol:WithLocal \
	--mnemonics "$$MNEMONIC_DEVNET" --ffi \
	--fork-url "$$RPC_LOCAL" \
	--with-gas-price 100000000 \
	-vv \
	--skip-simulation

deploy-arbitrum:
	source .env && \
	forge script src/contracts/scripts/devnet/Devnet.s.sol:WithArbitrum \ 
	--mnemonics "$$MNEMONIC_DEVNET" --ffi \
	--fork-url "$$RPC_LOCAL" \
	--broadcast \
	--with-gas-price 100000000 \
	-vv \
	--skip-simulation

server:
	source .env && \
	anvil -m "$$MNEMONIC_DEVNET" \
	--fork-url "$$RPC_ARBITRUM_ALCHEMY" \
	--fork-block-number 139667500

flats: 
	forge flatten src/contracts/periphery/IKresko.sol > out/IKresko.sol && \
	forge flatten src/contracts/core/kiss/interfaces/IKISS.sol > out/IKISS.sol && \
	forge flatten src/contracts/core/vault/interfaces/IVault.sol > out/IVault.sol && \
	forge flatten src/contracts/core/vault/interfaces/IVaultRateProvider.sol > out/IVaultRateProvider.sol 

test:
	forge test --ffi