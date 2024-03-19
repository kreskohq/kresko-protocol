set dotenv-load

alias d := dry-local
alias l := local
alias r := restart
alias k := kill
alias bal := balances-live-arbitrum-fork
alias aal := anvil-live-arbitrum-fork

hasEnv := path_exists(absolute_path("./.env"))
hasBun := `bun --help | grep -q 'Usage: bun' && echo true || echo false`
hasFoundry := `forge --version | grep -q 'forge' && echo true || echo false`
hasPM2 := `bunx pm2 | grep -q 'usage: pm2' && echo true || echo false`

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
	--sig $(cast calldata "deploy(string,string,uint32,bool,bool)" "arbitrum-sepolia" "MNEMONIC_DEVNET" 0 true false) \
	--with-gas-price 100000000 \
	--evm-version "paris" \
	--skip-simulation \
	--broadcast \
	--fork-url "$RPC_ARBITRUM_SEPOLIA_ALCHEMY" \
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

dry-local:
	forge script src/contracts/scripts/deploy/Deploy.s.sol:Deploy \
	--sig $(cast calldata "deploy(string,string,uint32,bool,bool)" "localhost" "MNEMONIC_DEVNET" 0 true false) \
	--with-gas-price 100000000 \
	--ffi \
	--skip-simulation \
	-vvv


dry-arbitrum:
	forge script src/contracts/scripts/deploy/Deploy.s.sol:Deploy \
	--sig $(cast calldata "deploy(string,string,uint32,bool,bool)" "arbitrum" "MNEMONIC_DEPLOY" 0 true false) \
	--fork-url "$RPC_ARBITRUM_INFURA" \
	--with-gas-price 100000000 \
	--ffi \
	-vvv

dry-arbitrum-fork:
	forge script src/contracts/scripts/deploy/Deploy.s.sol:Deploy \
	--sig $(cast calldata  "deploy(string,string,uint32,bool,bool)" "arbitrum-fork" "MNEMONIC_DEVNET" 0 true false) \
	--fork-url "$RPC_ARBITRUM_INFURA" \
	--with-gas-price 100000000 \
	--skip-simulation \
	--evm-version "paris" \
	--ffi \
	-vvv

balances-live-arbitrum-fork: 
	forge script src/contracts/scripts/fork/Fork.s.sol:ArbFork \
	--sig $(cast calldata  "withDefaultBalances(string)" "MNEMONIC_DEVNET") \
	--fork-url "$RPC_LOCAL" \
	--broadcast \
	--with-gas-price 100000000 \
	--sender "0x4bb7f4c3d47C4b431cb0658F44287d52006fb506" \
	--unlocked \
	--ffi \
	-vvvv

sync-prices-arbitrum-fork:
	forge script ArbFork --broadcast --sig "updatePrices()"

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
	pm2 start utils/pm2.config.js --only anvil-arbitrum-fork
	sleep 5
	pm2 start utils/pm2.config.js --only deploy-arbitrum-fork
	pm2 save
	@echo "/* -------------------------------------------------------------------------- */"
	@echo "/*                                  LAUNCHED                                  */"
	@echo "/* -------------------------------------------------------------------------- */"

arbitrum-fork-live:
	pm2 ping
	@echo "/* -------------------------------------------------------------------------- */"
	@echo "/*                                 LAUNCHING                                  */"
	@echo "/* -------------------------------------------------------------------------- */"
	pm2 start utils/pm2.config.js --only anvil-live-arbitrum-fork
	sleep 5
	pm2 start utils/pm2.config.js --only sync-prices-arbitrum-fork
	pm2 save
	@echo "/* -------------------------------------------------------------------------- */"
	@echo "/*                                  LAUNCHED                                  */"
	@echo "/* -------------------------------------------------------------------------- */"

anvil-local:
	anvil -m "$MNEMONIC_DEVNET" \
	--auto-impersonate \
	--code-size-limit "100000000000000000" \
	--chain-id 1337 \
	--gas-limit "100000000"

anvil-arbitrum-fork:
	anvil -m "$MNEMONIC_DEVNET" \
	--auto-impersonate \
	--code-size-limit "100000000000000000" \
	--chain-id 41337 \
	--hardfork "paris" \
	--fork-url "$RPC_ARBITRUM_INFURA" \
	--fork-block-number 188474553

anvil-live-arbitrum-fork:
	anvil -m "$MNEMONIC_DEVNET" \
	--auto-impersonate \
	--no-cors \
	--chain-id 41337 \
	--no-rate-limit \
	--fork-block-number "$ANVIL_FORK_BLOCK" \
	--load-state out/anvil-fork.json \
	--code-size-limit "100000000000000000" \
	--fork-url "$RPC_ARBITRUM_INFURA"

flats: 
	forge flatten src/contracts/core/periphery/IKresko.sol > out/IKresko.sol && \
	forge flatten src/contracts/core/kiss/interfaces/IKISS.sol > out/IKISS.sol && \
	forge flatten src/contracts/core/vault/interfaces/IVault.sol > out/IVault.sol && \
	forge flatten src/contracts/core/vault/interfaces/IVaultRateProvider.sol > out/IVaultRateProvider.sol 

verify-proxy-contract:
	forge verify-contract 0x \
	src/contracts/core/factory/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy \
	--chain arbitrum \
	--watch \
	--constructor-args "0x"

verify-contract:
	forge verify-contract 0x \
	DataV1 \
	--chain arbitrum \
	--watch \
	--constructor-args "0x"

@setup:
	just deps
	just dry-local
	bun hh:dry
	echo "*** kresko: Setup complete!"

@deps:
	{{ if hasFoundry == "true" { "echo '***' kresko: foundry exists, skipping install.." } else { "echo '***' kresko: Installing foundry && curl -L https://foundry.paradigm.xyz | bash && foundryup" } }}
	echo "*** kresko: Installing forge dependencies" && forge install && echo "*** kresko: Forge dependencies installed"
	{{ if hasEnv == "true" { "echo '***' kresko: .env exists, skipping copy.." } else { "echo '***' kresko: Copying .env.example to .env && cp .env.example .env" } }}
	{{ if hasBun == "true" { "echo '***' kresko: bun exist, skipping install.." } else { "echo '***' kresko: Installing bun && curl -fsSL https://bun.sh/install | bash" } }}
	echo "*** kresko: Installing npm dependencies..." && bun install --yarn && echo "*** kresko: NPM dependencies installed"
	{{ if hasPM2 == "true" { "echo '***' kresko: PM2 exists, skipping install.." } else { "echo '***' kresko: Installing PM2 && bun a -g pm2 && echo '***' kresko: PM2 installed" } }}
	echo "*** kresko: Finished installing dependencies"

kill: 
	pm2 delete all && pm2 cleardump && pm2 flush && pm2 kill 

restart:
	pm2 restart all --update-env
