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

Generate types:

```sh
yarn typechain
```

### Testing

Create local .env file:
```sh
cp .env.example .env
```

Populate the following fields into your .env file with testing values: 
```sh
BURN_FEE=0.01
LIQUIDATION_INCENTIVE=1.1
MINIMUM_COLLATERALIZATION_RATIO=1.5
FEE_RECIPIENT_ADDRESS=0x0000000000000000000000000000000000000FEE
MINIMUM_DEBT_VALUE=10
```

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

### Contributions and Contact

Open source contributions to Kresko Protocol are encouraged, feel free to open an issue or pull request.

Inquiries or partnership requests should be directed to:
   
![contact](https://user-images.githubusercontent.com/15370712/167091756-d69aedf4-ab00-4af5-adc4-1f7e2d3adb54.png)