// solhint-disable state-visibility, max-states-count, var-name-mixedcase, no-global-import, const-name-snakecase, no-empty-blocks, no-console, code-complexity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Asset, RawPrice} from "common/Types.sol";
import {IKreskoAsset} from "kresko-asset/IKreskoAsset.sol";

library PType {
    struct AssetData {
        Asset config;
        uint256 amountColl;
        address addr;
        string symbol;
        uint256 amountCollFees;
        uint256 valColl;
        uint256 valCollAdj;
        uint256 valCollFees;
        uint256 amountDebt;
        uint256 valDebt;
        uint256 valDebtAdj;
        uint256 amountSwapDeposit;
        uint256 price;
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
        Gate gate;
        PAsset[] assets;
        Minter minter;
        SCDP scdp;
        uint256 sequencerGracePeriodTime;
        uint32 staleTime;
        uint16 maxPriceDeviationPct;
        uint8 oracleDecimals;
        uint32 sequencerStartedAt;
        uint32 timestamp;
        bool isSequencerUp;
        bool safetyStateSet;
        uint256 blockNr;
    }

    struct Account {
        address addr;
        Balance[] bals;
        MAccount minter;
        SAccount scdp;
    }

    struct Balance {
        address addr;
        string name;
        address token;
        string symbol;
        uint256 amount;
        uint256 val;
        uint8 decimals;
    }

    struct Minter {
        uint32 MCR;
        uint32 LT;
        uint32 MLR;
        uint256 minDebtValue;
    }

    struct SCDP {
        SDeposit[] deposits;
        PAssetEntry[] debts;
        STotals totals;
        uint256 coverIncentive;
        uint32 coverThreshold;
        uint32 MCR;
        uint32 LT;
        uint32 MLR;
    }

    struct Gate {
        address kreskian;
        address questForKresk;
        uint8 phase;
    }

    struct Synthwrap {
        address token;
        uint256 openFee;
        uint256 closeFee;
    }

    struct PAsset {
        Asset config;
        uint256 tSupply;
        IKreskoAsset.Wrapping synthwrap;
        RawPrice priceRaw;
        address addr;
        bool isMarketOpen;
        string name;
        string symbol;
        uint256 price;
    }

    struct MAccount {
        MTotals totals;
        PAssetEntry[] deposits;
        PAssetEntry[] debts;
    }

    struct MTotals {
        uint256 valColl;
        uint256 valDebt;
        uint256 cr;
    }

    struct SAccountTotals {
        uint256 valColl;
        uint256 valFees;
    }

    struct SAccount {
        address addr;
        SAccountTotals totals;
        SDepositUser[] deposits;
    }

    struct SDeposit {
        Asset config;
        uint256 amount;
        address addr;
        string symbol;
        uint256 amountSwapDeposit;
        uint256 amountFees;
        uint256 val;
        uint256 valAdj;
        uint256 valFees;
        uint128 feeIndex;
        uint128 liqIndex;
        uint256 price;
    }

    struct SDepositUser {
        Asset config;
        uint256 amount;
        address addr;
        string symbol;
        uint256 amountFees;
        uint256 val;
        uint256 valFees;
        uint128 feeIndex;
        uint128 liqIndex;
        uint256 price;
    }

    struct PAssetEntry {
        Asset config;
        uint256 amount;
        address addr;
        string symbol;
        uint256 amountAdj;
        uint256 val;
        uint256 valAdj;
        int256 index;
        uint256 price;
    }
}
