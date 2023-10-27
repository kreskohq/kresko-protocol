# Kresko Protocol

This repository contains the code for the Kresko Protocol. Kresko Protocol supports creating and managing crypto-backed synthetic assets. Prices for synthetic assets are derived from combination of oracle providers (on-demand/push). Protocol uses the [EIP-2535](https://eips.ethereum.org/EIPS/eip-2535) architecture. It enables composability through flexibile storage patterns while allowing users to access all core functionality with a single contract address. This is a usage and integration guide that assumes familiarity with Solidity (and EIP-2535), Foundry, Hardhat and [core concepts](https://kresko.gitbook.io/kresko-docs/) of Kresko.

[![run test suite](https://github.com/kreskohq/kresko-protocol/actions/workflows/run-test-suite.yml/badge.svg?branch=develop)](https://github.com/kreskohq/kresko-protocol/actions/workflows/run-test-suite.yml?branch=develop)

## Usage

A [justfile](https://github.com/casey/just) exists for running foundry things. Use with (just installed) `just <command>` or (not installed) `npx just <command>`.

### Setup

Create a new .env file `cp .env.example .env`

#### Dependencies

Install forge dependencies

```sh
forge install
```

Install node dependencies

```sh
pnpm i
```

Required for development network using anvil & forge:

```sh
pnpm i -g pm2
```

### Compiling

#### Foundry

Compile the contracts

```sh
forge build
```

Check your setup by running the forge deployment script

no just installed:

```sh
pnpm f:dry
```

just installed:

```sh
just d
```

#### Hardhat

Compile the contracts

```sh
pnpm hh:compile
```

Check your setup by running the hardhat deployment script

```sh
pnpm hh:dry
```

### Testing

**NOTE:** Primary test coverage uses hardhat. Forge tests are a work in progress.

#### Hardhat

Run tests with against a local deployment fixture:

```sh
pnpm hh:test
```

#### Foundry

```sh
forge test
```

### Deployment

#### Hardhat

Local network:

```sh
pnpm hh:dev
```

#### Foundry

(requires PM2: `pnpm i -g pm2`)

Local network:

```sh
just l
```

Observe deployment status:

```sh
pm2 logs 1
```

Restart the network:

```sh
just r
```

Stop the network:

```sh
just k
```

## Notes about the usage of [ERC-2535](https://eips.ethereum.org/EIPS/eip-2535) (Diamond)

### General

- All external functions are contained in the facets, `hardhat-diamond-abi` will combine their ABI to a separate artifact (Kresko.json) after compile.

- Core logic is mostly defined inside library functions. These internal functions are attached to the minter storage struct for ease of use.

- Storage is used through a inline assembly pointer inside free function. To access the storage (+ attached internal lib functions) simply call the free function anywhere within the diamond.

- Note that Staking, AMM and KreskoAsset contracts do not live inside the diamond scope.

### State

#### Nay

- Do not add new state variables to the beginning or middle of structs. Doing this makes the new state variable overwrite existing state variable data and all state variables after the new state variable reference the wrong storage location.

- Do not put structs directly in structs unless you don’t plan on ever adding more state variables to the inner structs. You won't be able to add new state variables to inner structs in upgrades. This makes sense because a struct uses a fixed number of storage locations. Adding a new state variable to an inner struct would cause the next state variable after the inner struct to be overwritten. Structs that are in mappings can be extended in upgrades, because those structs are stored in random locations based on keccak256 hashing.

- Do not add new state variables to structs that are used in arrays.

- Do not use the same namespace string for different structs. This is obvious. Two different structs at the same location will overwrite each other.

#### Yay

- To add new state variables to DiamondStorage pattern in eg. MinterStorage (ms), add them to the end of the struct. This makes sense because it is not possible for existing facets to overwrite state variables at new storage locations.

- New state variables can be added to the ends of structs that are used in mappings.

- The names of state variables can be changed, but that might be confusing if different facets are using different names for the same storage locations.

_Learning references_

_https://eip2535diamonds.substack.com/p/compliance-with-eip-2535-diamonds_

_https://github.com/solidstate-network/solidstate-solidity_

_https://eip2535diamonds.substack.com/p/how-eip2535-diamonds-reduces-gas_

### Contributions

Contributions to Kresko Protocol are encouraged, feel free to open an issue or pull request. <br/> All contributions are licensed under BUSL1.1.

### Contact

Critical bug disclosures and inquiries should be directed to: <br> ![contact_2](https://user-images.githubusercontent.com/15370712/167093578-d6c0acd8-f32c-4ca3-b22e-76c2eef7f0e3.png)
