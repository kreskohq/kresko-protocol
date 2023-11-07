// solhint-disable state-visibility, max-states-count, var-name-mixedcase, no-global-import, const-name-snakecase, no-empty-blocks, no-console, code-complexity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Asset, RawPrice} from "common/Types.sol";
import {VaultAsset} from "vault/VTypes.sol";

library PType {
    struct AssetData {
        address addr;
        uint256 amountColl;
        uint256 amountCollFees;
        uint256 valColl;
        uint256 valCollAdj;
        uint256 valCollFees;
        uint256 amountDebt;
        uint256 valDebt;
        uint256 valDebtAdj;
        uint256 amountSwapDeposit;
        uint256 price;
        string symbol;
        Asset config;
    }

    struct STotals {
        uint256 valColl;
        uint256 valCollAdj;
        uint256 valFees;
        uint256 valDebt;
        uint256 valDebtOg;
        uint256 valDebtOgAdj;
        uint256 sdiPrice;
        uint256 cr;
        uint256 crOg;
        uint256 crOgAdj;
    }

    struct Protocol {
        PAsset[] assets;
        Minter minter;
        SCDP scdp;
        uint32 staleTime;
        uint32 sequencerGracePeriodTime;
        uint16 maxPriceDeviationPct;
        uint8 oracleDecimals;
        uint32 sequencerStartedAt;
        uint32 timestamp;
        uint32 blockNr;
        bool isSequencerUp;
        bool safetyStateSet;
        Gate gate;
    }

    struct Account {
        address addr;
        Balance[] bals;
        MAccount minter;
        SAccount scdp;
    }

    struct Balance {
        address addr;
        address token;
        uint256 amount;
        uint256 val;
        string symbol;
        string name;
        uint8 decimals;
    }

    struct Minter {
        uint32 MCR;
        uint32 LT;
        uint32 MLR;
        uint96 minDebtValue;
    }

    struct SCDP {
        uint32 MCR;
        uint32 LT;
        uint32 MLR;
        uint16 CR;
        STotals totals;
        SDeposit[] deposits;
        PAssetEntry[] debts;
    }

    struct Gate {
        address kreskian;
        address questForKresk;
        uint8 phase;
    }

    struct PAsset {
        address addr;
        string name;
        string symbol;
        uint256 tSupply;
        uint256 price;
        bool marketStatus;
        RawPrice priceRaw;
        Asset config;
    }

    struct MAccount {
        MTotals totals;
        PAssetEntry[] deposits;
        PAssetEntry[] debts;
    }

    struct MTotals {
        uint256 valColl;
        uint256 valDebt;
        uint16 cr;
    }

    struct SAccountTotals {
        uint256 valColl;
        uint256 valFees;
        uint256 valProfit;
    }

    struct SAccount {
        address addr;
        SAccountTotals totals;
        PAssetEntry[] deposits;
    }

    struct SDeposit {
        address addr;
        string symbol;
        uint256 amount;
        uint256 amountSwapDeposit;
        uint256 amountFees;
        uint256 val;
        uint256 valFees;
        uint256 valAdj;
        uint256 price;
        Asset config;
    }

    struct PAssetEntry {
        address addr;
        string symbol;
        uint256 amount;
        uint256 amountAdj;
        uint256 val;
        uint256 valAdj;
        uint256 price;
        int256 index;
        Asset config;
    }
}
