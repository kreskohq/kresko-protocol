// solhint-disable state-visibility, max-states-count, var-name-mixedcase, no-global-import, const-name-snakecase, no-empty-blocks, no-console, code-complexity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Asset, RawPrice} from "common/Types.sol";
import {IKreskoAsset} from "kresko-asset/IKreskoAsset.sol";

library PType {
    struct AssetData {
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
        SCDP scdp;
        Gate gate;
        Minter minter;
        PAsset[] assets;
        uint256 sequencerGracePeriodTime;
        uint256 staleTime;
        uint256 maxPriceDeviationPct;
        uint8 oracleDecimals;
        uint256 sequencerStartedAt;
        bool safetyStateSet;
        bool isSequencerUp;
        uint256 timestamp;
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
        uint256 MCR;
        uint256 LT;
        uint256 MLR;
        uint256 minDebtValue;
    }

    struct SCDP {
        uint256 MCR;
        uint256 LT;
        uint256 MLR;
        uint256 coverIncentive;
        uint256 coverThreshold;
        SDeposit[] deposits;
        PAssetEntry[] debts;
        STotals totals;
    }

    struct Gate {
        address kreskian;
        address questForKresk;
        uint256 phase;
    }

    struct Synthwrap {
        address token;
        uint256 openFee;
        uint256 closeFee;
    }

    struct PAsset {
        IKreskoAsset.Wrapping synthwrap;
        RawPrice priceRaw;
        string name;
        string symbol;
        address addr;
        bool isMarketOpen;
        uint256 tSupply;
        uint256 price;
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
        uint256 amount;
        address addr;
        string symbol;
        uint256 amountSwapDeposit;
        uint256 amountFees;
        uint256 val;
        uint256 valAdj;
        uint256 valFees;
        uint256 feeIndex;
        uint256 liqIndex;
        uint256 price;
        Asset config;
    }

    struct SDepositUser {
        uint256 amount;
        address addr;
        string symbol;
        uint256 amountFees;
        uint256 val;
        uint256 feeIndex;
        uint256 liqIndex;
        uint256 valFees;
        uint256 price;
        Asset config;
    }

    struct PAssetEntry {
        uint256 amount;
        address addr;
        string symbol;
        uint256 amountAdj;
        uint256 val;
        uint256 valAdj;
        int256 index;
        uint256 price;
        Asset config;
    }
}
