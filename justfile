set dotenv-load


dry-local:
	forge script src/contracts/scripts/deploy/Run.s.sol:Local \
	--with-gas-price 100000000 \
	--skip-simulation \
	--ffi \
	-vvv

dry-arbitrum:
	forge script src/contracts/scripts/deploy/Run.s.sol:Arbitrum \
	--with-gas-price 100000000 \
	--fork-url "$RPC_ARBITRUM_INFURA" \
	--skip-simulation \
	--ffi \
	-vvv


deploy-local:
	sleep 3
	forge script src/contracts/scripts/deploy/Run.s.sol:Local \
	-vvv \
	--mnemonics "$MNEMONIC_DEVNET" \
	--fork-url "$RPC_LOCAL" \
	--broadcast \
	--ffi

deploy-arbitrum:
	forge script src/contracts/scripts/deploy/Run.s.sol:Arbitrum \
	--mnemonics "$MNEMONIC_DEVNET" \
	--fork-url "$RPC_LOCAL" \
	--broadcast \
	--with-gas-price 100000000 \
	--ffi \
	-vvv

anvil-fork:
	anvil -m "$MNEMONIC_DEVNET" \
	--fork-url "$RPC_ARBITRUM_INFURA" \
	--fork-block-number 140307500

anvil-local:
	anvil -m "$MNEMONIC_DEVNET" \
	--code-size-limit "100000000000000000" \
	--gas-limit "100000000"

flats: 
	forge flatten src/contracts/periphery/IKresko.sol > out/IKresko.sol && \
	forge flatten src/contracts/core/kiss/interfaces/IKISS.sol > out/IKISS.sol && \
	forge flatten src/contracts/core/vault/interfaces/IVault.sol > out/IVault.sol && \
	forge flatten src/contracts/core/vault/interfaces/IVaultRateProvider.sol > out/IVaultRateProvider.sol 

