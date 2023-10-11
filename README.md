# Kresko Protocol

This repository contains the code for the Kresko Protocol. Kresko Protocol supports creating and managing crypto-backed synthetic assets. Prices for synthetic assets are derived from combination of oracle providers (on-demand/push). Protocol uses the [EIP-2535](https://eips.ethereum.org/EIPS/eip-2535) architecture. It enables composability through flexibile storage patterns while allowing users to access all core functionality with a single contract address. This is a usage and integration guide that assumes familiarity with Solidity (and EIP-2535), Foundry, Hardhat and [core concepts](https://kresko.gitbook.io/kresko-docs/) of Kresko.

[![run test suite](https://github.com/kreskohq/kresko-protocol/actions/workflows/run-test-suite.yml/badge.svg?branch=develop)](https://github.com/kreskohq/kresko-protocol/actions/workflows/run-test-suite.yml?branch=develop)

## Usage

### Setup

(**OPTIONAL**) create .env file `cp .env.example .env`

#### Dependencies

Install forge dependencies

```sh
forge install
```

Install node dependencies
(_Authorized npm token is required in .npmrc for some internal packages. This will be lifted later._)<br/>

```sh
pnpm i
```

### Compiling

#### Foundry

Compile the contracts using foundry

```sh
forge build
```

Check your setup by running the local forge deployment

```sh
forge script src/contracts/scripts/devnet/Devnet.s.sol:WithLocal
```

#### Hardhat

Compile the contracts using hardhat

```sh
pnpm compile
```

Check your setup by running the local hardhat deployment

```sh
pnpm run deploy --tags local
```

### Testing

**NOTE:** Primary test coverage uses hardhat. Forge tests are a work in progress.

#### Hardhat

Run tests with against a local deployment fixture:

```sh
pnpm test
```

#### Foundry

```sh
forge test --ffi
```

### Deployment

#### Hardhat

To local network:

```sh
pnpm local
```

To live network:

```sh
pnpm deploy --network <network>
```

#### Foundry

Local

```sh
forge script src/contracts/scripts/devnet/Devnet.s.sol:WithLocal
```

### Forking

- value of `process.env.FORKING` maps to network key and it's setup within `hardhat-configs/networks`
- set a specific block with `process.env.FORKING_BLOCKNUMBER`
- HRE is extended with helpers to get live deployments within the forked network (https://github.com/wighawag/hardhat-deploy#companionnetworks)

Run deploy in fork

```sh
pnpm fork:deploy
```

Run tests with `--grep Forking`

```sh
pnpm fork:test
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
