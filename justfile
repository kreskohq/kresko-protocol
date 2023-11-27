set dotenv-load

alias d := dry-local
alias l := local
alias r := restart
alias k := kill

hasEnv := path_exists(absolute_path("./.env"))
# hasFoundry := `forge --version` 
# hasFoundry := `shell forge --version`
hasPNPM := `pnpm --help | grep -q 'Version' && echo true || echo false`
hasFoundry := `forge --version | grep -q 'forge' && echo true || echo false`
hasPM2 := `pnpm list --global pm2 | grep -q '' && echo true || echo false`

dry-local:
	forge script src/contracts/scripts/deploy/Run.s.sol:Local \
	--with-gas-price 100000000 \
	--skip-simulation \
	--ffi \
	-vvv


local:
	pm2 ping
	@echo "/* -------------------------------------------------------------------------- */"
	@echo "/*                                 LAUNCHING                                  */"
	@echo "/* -------------------------------------------------------------------------- */"
	pm2 start utils/pm2.config.js --only anvil-local
	pm2 start utils/pm2.config.js --only setup-local
	pm2 save
	@echo "/* -------------------------------------------------------------------------- */"
	@echo "/*                                  LAUNCHED                                  */"
	@echo "/* -------------------------------------------------------------------------- */"

arbitrum:
	pm2 ping
	@echo "/* -------------------------------------------------------------------------- */"
	@echo "/*                                 LAUNCHING                                  */"
	@echo "/* -------------------------------------------------------------------------- */"
	pm2 start utils/pm2.config.js --only anvil-fork
	sleep 5
	pm2 start utils/pm2.config.js --only setup-arbitrum
	pm2 save
	@echo "/* -------------------------------------------------------------------------- */"
	@echo "/*                                  LAUNCHED                                  */"
	@echo "/* -------------------------------------------------------------------------- */"

kill: 
	pm2 delete all && pm2 cleardump && pm2 flush && pm2 kill 

restart:
	pm2 restart all --update-env


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
	--mnemonics "$MNEMONIC_DEVNET" \
	--fork-url "$RPC_LOCAL" \
	--broadcast \
	--ffi \
	-vvv

deploy-arbitrum:
	forge script src/contracts/scripts/deploy/Run.s.sol:Arbitrum \
	--mnemonics "$MNEMONIC_DEVNET" \
	--non-interactive \
	--fork-url "$RPC_LOCAL" \
	--broadcast \
	--with-gas-price 100000000 \
	--ffi \
	-vvv

setup-arbitrum: 
	just deploy-arbitrum && \
	just arb-users

arb-users: 
	just arb-bal-nfts && \
	just arb-bal-stables && \
	just arb-bal-wbtc && \
	just arb-setup-users

arb-bal-stables:
	forge script src/contracts/scripts/deploy/Run.s.sol:Arbitrum \
	--sig "setupStables()" \
	--mnemonics "$MNEMONIC_DEVNET" \
	--sender "0xB38e8c17e38363aF6EbdCb3dAE12e0243582891D" \
	--unlocked \
	--fork-url "$RPC_LOCAL" \
	--broadcast \
	--ffi \
	-vvv

arb-bal-wbtc:
	forge script src/contracts/scripts/deploy/Run.s.sol:Arbitrum \
	--sig "setupWBTC()" \
	--mnemonics "$MNEMONIC_DEVNET" \
	--sender "0x4bb7f4c3d47C4b431cb0658F44287d52006fb506" \
	--unlocked \
	--fork-url "$RPC_LOCAL" \
	--broadcast \
	--ffi \
	-vvv

arb-bal-nfts:
	forge script src/contracts/scripts/deploy/Run.s.sol:Arbitrum \
	--sig "setupNFTs()" \
	--mnemonics "$MNEMONIC_DEVNET" \
	--sender "0x99999A0B66AF30f6FEf832938a5038644a72180a" \
	--unlocked \
	--fork-url "$RPC_LOCAL" \
	--broadcast \
	--ffi \
	-vvv

arb-setup-users:
	forge script src/contracts/scripts/deploy/Run.s.sol:Arbitrum \
	--sig "createUsers()" \
	--mnemonics "$MNEMONIC_DEVNET" \
	--fork-url "$RPC_LOCAL" \
	--broadcast \
	--ffi \
	-vvv

anvil-fork:
	anvil -m "$MNEMONIC_DEVNET" \
	--auto-impersonate \
	--code-size-limit "100000000000000000" \
	--fork-url "$RPC_ARBITRUM_INFURA" \
	--fork-block-number 154603658

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

