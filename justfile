set dotenv-load

alias d := dry-local
alias l := local
alias r := restart
alias k := kill

hasEnv := path_exists(absolute_path("./.env"))
hasPNPM := `pnpm --help | grep -q 'Version' && echo true || echo false`
hasFoundry := `forge --version | grep -q 'forge' && echo true || echo false`
hasPM2 := `pnpm list --global pm2 | grep -q '' && echo true || echo false`

dry-local:
	forge script src/contracts/scripts/deploy/Deploy.s.sol:Deploy \
	--sig $(cast calldata "deploy(string,string,uint32,bool,bool)" "localhost" "MNEMONIC_DEVNET" 0 true false) \
	--with-gas-price 100000000 \
	--ffi \
	--skip-simulation \
	-vvv

deploy-local:
	forge script src/contracts/scripts/deploy/Deploy.s.sol:Deploy \
	--sig $(cast calldata  "deploy(string,string,uint32,bool,bool)" "localhost" "MNEMONIC_DEVNET" 0 true false) \
	--mnemonics "$MNEMONIC_DEVNET" \
	--fork-url "$RPC_LOCAL" \
	--broadcast \
	--non-interactive \
	--ffi \
	-vvv


deploy-arbitrum-sepolia:
	forge script src/contracts/scripts/deploy/Deploy.s.sol:Deploy \
	--sig $(cast calldata "deploy(string,string,uint32,bool,bool)" "arbitrum-sepolia" "MNEMONIC_DEVNET" 0 false true) \
	--with-gas-price 100000000 \
	--evm-version "paris" \
	--skip-simulation \
	--fork-url "$RPC_ARBITRUM_SEPOLIA_ALCHEMY" \
	--fork-block-number 2680581 \
	--ffi \
	-vvv

dry-arbitrum-fork:
	forge script src/contracts/scripts/deploy/Deploy.s.sol:Deploy \
	--sig $(cast calldata  "deploy(string,string,uint32,bool,bool)" "arbitrum-fork" "MNEMONIC_DEVNET" 0 true false) \
	--fork-url "$RPC_ARBITRUM_INFURA" \
	--with-gas-price 100000000 \
	--fork-block-number 159492977 \
	--skip-simulation \
	--evm-version "paris" \
	--ffi \
	-vvv

deploy-arbitrum-fork:
	forge script src/contracts/scripts/deploy/Deploy.s.sol:Deploy \
	--sig $(cast calldata  "deploy(string,string,uint32,bool,bool)" "arbitrum-fork" "MNEMONIC_DEVNET" 0 true false) \
	--fork-url "$RPC_LOCAL" \
	--sender "0x4bb7f4c3d47C4b431cb0658F44287d52006fb506" \
	--unlocked \
	--with-gas-price 100000000 \
	--evm-version "paris" \
	--non-interactive \
	--skip-simulation \
	--broadcast \
	--ffi \
	-vvv

test-impersonate:
	forge script src/contracts/scripts/deploy/Impersonated.s.sol \
	--sig "example()" \
	--fork-url "$RPC_LOCAL" \
	--broadcast \
	--ffi \
	-vvvv


arbitrum-fork-users: 
	just arbitrum-fork-balances-token && \
	just arbitrum-fork-balances-wbtc && \
	just arbitrum-fork-balances-nft


local:
	pm2 ping
	@echo "/* -------------------------------------------------------------------------- */"
	@echo "/*                                 LAUNCHING                                  */"
	@echo "/* -------------------------------------------------------------------------- */"
	pm2 start utils/pm2.config.js --only anvil-local
	sleep 2
	pm2 start utils/pm2.config.js --only deploy-local
	pm2 save
	@echo "/* -------------------------------------------------------------------------- */"
	@echo "/*                                  LAUNCHED                                  */"
	@echo "/* -------------------------------------------------------------------------- */"

arbitrum-fork:
	pm2 ping
	@echo "/* -------------------------------------------------------------------------- */"
	@echo "/*                                 LAUNCHING                                  */"
	@echo "/* -------------------------------------------------------------------------- */"
	pm2 start utils/pm2.config.js --only anvil-fork
	sleep 5
	pm2 start utils/pm2.config.js --only deploy-arbitrum-fork
	pm2 save
	@echo "/* -------------------------------------------------------------------------- */"
	@echo "/*                                  LAUNCHED                                  */"
	@echo "/* -------------------------------------------------------------------------- */"



kill: 
	pm2 delete all && pm2 cleardump && pm2 flush && pm2 kill 

restart:
	pm2 restart all --update-env

arbitrum-fork-balances-token:
	forge script src/contracts/scripts/deploy/Impersonated.s.sol \
	--sig "setupArbForkBalances()" \
	--mnemonics "$MNEMONIC_DEVNET" \
	--sender "0xB38e8c17e38363aF6EbdCb3dAE12e0243582891D" \
	--unlocked \
	--fork-url "$RPC_LOCAL" \
	--broadcast \
	--ffi \
	-vvv

arbitrum-fork-balances-wbtc:
	forge script src/contracts/scripts/deploy/Impersonated.s.sol \
	--sig "setupArbForkWBTC()" \
	--mnemonics "$MNEMONIC_DEVNET" \
	--sender "0x4bb7f4c3d47C4b431cb0658F44287d52006fb506" \
	--unlocked \
	--fork-url "$RPC_LOCAL" \
	--broadcast \
	--ffi \
	-vvv

arbitrum-fork-balances-nft:
	forge script src/contracts/scripts/deploy/Impersonated.s.sol \
	--sig "setupArbForkNFTs()" \
	--mnemonics "$MNEMONIC_DEVNET" \
	--sender "0x99999A0B66AF30f6FEf832938a5038644a72180a" \
	--unlocked \
	--fork-url "$RPC_LOCAL" \
	--broadcast \
	--ffi \
	-vvv

arbitrum-fork-minter-setup:
	forge script src/contracts/scripts/deploy/Impersonated.s.sol \
	--sig "setupArbForkUsers()" \
	--mnemonics "$MNEMONIC_DEVNET" \
	--fork-url "$RPC_LOCAL" \
	--broadcast \
	--skip-simulation \
	--ffi \
	-vvv

anvil-fork:
	anvil -m "$MNEMONIC_DEVNET" \
	--auto-impersonate \
	--code-size-limit "100000000000000000" \
	--chain-id 41337 \
	--hardfork "paris" \
	--fork-url "$RPC_ARBITRUM_INFURA" \
	--fork-block-number 159492977

anvil-local:
	anvil -m "$MNEMONIC_DEVNET" \
	--auto-impersonate \
	--code-size-limit "100000000000000000" \
	--chain-id 1337 \
	--gas-limit "100000000"

flats: 
	forge flatten src/contracts/periphery/IKresko.sol > out/IKresko.sol && \
	forge flatten src/contracts/core/kiss/interfaces/IKISS.sol > out/IKISS.sol && \
	forge flatten src/contracts/core/vault/interfaces/IVault.sol > out/IVault.sol && \
	forge flatten src/contracts/core/vault/interfaces/IVaultRateProvider.sol > out/IVaultRateProvider.sol 


verify-proxy-contract:
	forge verify-contract 0x13b3c432420f77F8Cd50497962A4cfA0EF70200E \
	src/contracts/core/factory/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy \
	--chain arbitrum-sepolia \
	--constructor-args "0x"

verify-contract:
	forge verify-contract 0x2c3CeB92EF9ce5876512c9caAC85550DF1E2d0b5 \
	KreskoAsset \
	--chain arbitrum-sepolia \
	--watch \
	--constructor-args "0x"
	
verify-arbitrum-sepolia:
	forge script src/contracts/scripts/deploy/ArbitrumSepolia.s.sol \
	--mnemonics "$MNEMONIC_DEVNET" \
	--rpc-url "$RPC_ARBITRUM_SEPOLIA_ALCHEMY" \
	--evm-version "paris" \
	--verify \
	--resume \
	--ffi \
	-vvv


@setup:
	just deps
	just dry-local
	pnpm hh:dry
	echo "*** kresko: Setup complete!"

@deps:
	{{ if hasFoundry == "true" { "echo '***' kresko: foundry exists, skipping install.." } else { "echo '***' kresko: Installing foundry && curl -L https://foundry.paradigm.xyz | bash && foundryup" } }}
	echo "*** kresko: Installing forge dependencies" && forge install && echo "*** kresko: Forge dependencies installed"
	{{ if hasEnv == "true" { "echo '***' kresko: .env exists, skipping copy.." } else { "echo '***' kresko: Copying .env.example to .env && cp .env.example .env" } }}
	{{ if hasPNPM == "true" { "echo '***' kresko: pnpm exist, skipping install.." } else { "echo '***' kresko: Installing pnpm && npm i -g pnpm" } }}
	echo "*** kresko: Installing node dependencies..." && pnpm i && echo "*** kresko: Node dependencies installed"
	{{ if hasPM2 == "true" { "echo '***' kresko: PM2 exists, skipping install.." } else { "echo '***' kresko: Installing PM2 && pnpm i -g pm2 && echo '***' kresko: PM2 installed" } }}
	echo "*** kresko: Finished installing dependencies"
