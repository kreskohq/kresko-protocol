# Kresko Protocol

This repository contains the core smart contract code for Kresko protocol, which supports the creation and management of crypto-backed synthetic assets. Prices for synthetic assets are committed on chain by trusted oracles. Kresko uses a proxy system so that contract upgrades are not disruptive to protocol functionality. This is a usage and integration guide that assumes familiarity with the basic economic mechanics as described in the litepaper.

[![run test suite](https://github.com/kreskohq/kresko-protocol/actions/workflows/run-test-suite.yml/badge.svg)](https://github.com/kreskohq/kresko-protocol/actions/workflows/run-test-suite.yml)

## Usage

### Setup

Install dependencies:

```sh
pnpm i
```

### Testing

Create local .env file:

```sh
cp .env.example .env
```

Example values:

```sh
MNEMONIC=your mnemonic here
LIQUIDATION_INCENTIVE=1.1
LIQUIDATION_THRESHOLD=1.4
MINIMUM_COLLATERALIZATION_RATIO=1.5
MINIMUM_DEBT_VALUE=10
FEE_RECIPIENT_ADDRESS=0x0000000000000000000000000000000000000FEE

```

Run tests: 

```sh
pnpm test
```

### Deployment

Compile and dry-run the deployments on hardhat-network:
```sh
pnpm deploy
```

Deploy to external networks:
```sh
pnpm deploy --network <network>
```


### Contributions

Open source contributions to Kresko Protocol are encouraged, feel free to open an issue or pull request.

### Contact

Critical bug disclosures and inquiries should be directed to: <br> ![contact_2](https://user-images.githubusercontent.com/15370712/167093578-d6c0acd8-f32c-4ca3-b22e-76c2eef7f0e3.png)
