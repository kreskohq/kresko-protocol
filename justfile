set dotenv-load
	
deploy-local:
	forge script src/contracts/scripts/devnet/Devnet.s.sol:WithLocal \
	--mnemonics "$MNEMONIC_DEVNET" \
	--fork-url "$RPC_LOCAL" \
	--with-gas-price 100000000 \
	--skip-simulation \
	--ffi \
	-vvv

deploy-arbitrum:
	forge script src/contracts/scripts/devnet/Devnet.s.sol:WithArbitrum \
	--mnemonics "$MNEMONIC_DEVNET" \
	--fork-url "$RPC_LOCAL" \
	--broadcast \
	--with-gas-price 100000000 \
	--ffi \
	-vvvv 

anvil-fork:
	anvil -m "$MNEMONIC_DEVNET" \
	--fork-url "$RPC_ARBITRUM_INFURA" \
	--fork-block-number 140307500

anvil-local:
  anvil -m "$MNEMONIC_DEVNET"

flats: 
	forge flatten src/contracts/periphery/IKresko.sol > out/IKresko.sol && \
	forge flatten src/contracts/core/kiss/interfaces/IKISS.sol > out/IKISS.sol && \
	forge flatten src/contracts/core/vault/interfaces/IVault.sol > out/IVault.sol && \
	forge flatten src/contracts/core/vault/interfaces/IVaultRateProvider.sol > out/IVaultRateProvider.sol 

