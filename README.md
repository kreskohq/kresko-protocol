# Kresko Protocol

This repository contains the core smart contract code for Kresko protocol, which supports the creation and management of crypto-backed synthetic assets. Prices for synthetic assets are committed on chain by trusted oracles. Kresko uses a proxy system so that contract upgrades are not disruptive to protocol functionality. This is a usage and integration guide that assumes familiarity with the basic economic mechanics as described in the litepaper.

## Usage

### Setup

Install dependencies:

```sh
yarn
```

Compile the smart contracts with Hardhat:

```sh
yarn compile
```

Run typechain:

```sh
yarn typechain
```

### Testing

Run the test suite with:

```sh
yarn test
```

### Deployment

It's possible to run the local deployment setup without a local server started with:

```sh
yarn deploy
```

The contracts are deployable to a variety of blockchain networks (full list in package.json). For example, deploy the contracts to the Aurora testnet with:

```sh
yarn deploy:auroratest
```

After a proxy upgrade or deployment to a new network the contract addresses and ABIs can be updated with:

```sh
yarn publish:contracts-frontend
```
