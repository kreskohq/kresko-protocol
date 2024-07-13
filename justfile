set dotenv-load
import? "../justfile";

alias dd := deploy-local-dry
alias dr := restart
alias dk := kill

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

deploy-local-dry:
	forge script src/contracts/scripts/deploy/Deploy.s.sol:Deploy \
	--sig $(cast calldata "deploy(string,string,uint32,bool,bool)" "localhost" "MNEMONIC_DEVNET" 0 true false) \
	--ffi \
	-vvv

exports: 
	forge flatten src/contracts/core/periphery/IKresko.sol -o out/IKresko.sol && \
	forge flatten src/contracts/core/kiss/interfaces/IKISS.sol -o out/IKISS.sol && \
	forge flatten src/contracts/core/vault/interfaces/IVault.sol -o out/IVault.sol && \
	forge flatten src/contracts/core/vault/interfaces/IVaultRateProvider.sol -o out/IVaultRateProvider.sol 

set positional-arguments

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