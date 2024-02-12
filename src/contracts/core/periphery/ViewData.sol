// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.19;

import {PercentageMath} from "libs/PercentageMath.sol";
import {cs, gm} from "common/State.sol";
import {scdp, sdi, SDIState} from "scdp/SState.sol";
import {View} from "periphery/ViewTypes.sol";
import {isSequencerUp} from "common/funcs/Utils.sol";
import {Asset, RawPrice} from "common/Types.sol";
import {IERC20} from "kresko-lib/token/IERC20.sol";
import {pushPrice, viewPrice} from "common/funcs/Prices.sol";
import {WadRay} from "libs/WadRay.sol";
import {MinterState, ms} from "minter/MState.sol";
import {Arrays} from "libs/Arrays.sol";
import {IAggregatorV3} from "kresko-lib/vendor/IAggregatorV3.sol";
import {IKreskoAsset} from "kresko-asset/IKreskoAsset.sol";
import {ViewHelpers} from "periphery/ViewHelpers.sol";
import {fromWad, toWad, wadUSD} from "common/funcs/Math.sol";
import {Percents} from "common/Constants.sol";
import {PythView} from "vendor/pyth/PythScript.sol";

// solhint-disable code-complexity

library ViewFuncs {
    using PercentageMath for *;
    using ViewHelpers for Asset;
    using ViewHelpers for MinterState;
    using WadRay for uint256;
    using Arrays for address[];

    function find(address[] memory _elements, address _elementToFind) internal pure returns (bool found) {
        for (uint256 i; i < _elements.length; ) {
            if (_elements[i] == _elementToFind) {
                return true;
            }
            unchecked {
                ++i;
            }
        }
    }

    function getAllAssets() internal view returns (address[] memory result) {
        address[] memory mCollaterals = ms().collaterals;
        address[] memory mkrAssets = ms().krAssets;
        address[] memory sAssets = scdp().collaterals;

        address[] memory all = new address[](mCollaterals.length + mkrAssets.length + sAssets.length);

        uint256 uniques;

        for (uint256 i; i < mCollaterals.length; i++) {
            if (!find(all, mCollaterals[i])) {
                all[uniques] = mCollaterals[i];
                uniques++;
            }
        }

        for (uint256 i; i < mkrAssets.length; i++) {
            if (!find(all, mkrAssets[i])) {
                all[uniques] = mkrAssets[i];
                uniques++;
            }
        }

        for (uint256 i; i < sAssets.length; i++) {
            if (!find(all, sAssets[i])) {
                all[uniques] = sAssets[i];
                uniques++;
            }
        }

        result = new address[](uniques);

        for (uint256 i; i < uniques; i++) {
            result[i] = all[i];
        }
    }

    function viewProtocol(PythView calldata prices) internal view returns (View.Protocol memory result) {
        result.assets = viewAssets(prices);
        result.minter = viewMinter();
        result.scdp = viewSCDP(prices);
        result.maxPriceDeviationPct = cs().maxPriceDeviationPct;
        result.oracleDecimals = cs().oracleDecimals;
        result.pythEp = cs().pythEp;
        result.safetyStateSet = cs().safetyStateSet;
        result.sequencerGracePeriodTime = cs().sequencerGracePeriodTime;
        result.isSequencerUp = isSequencerUp(cs().sequencerUptimeFeed, cs().sequencerGracePeriodTime);
        (, , uint256 startedAt, , ) = IAggregatorV3(cs().sequencerUptimeFeed).latestRoundData();
        result.sequencerStartedAt = uint32(startedAt);
        result.timestamp = uint32(block.timestamp);
        result.blockNr = uint32(block.number);
        result.gate = viewGate();
        result.tvl = viewTVL(prices);
    }

    function viewTVL(PythView calldata prices) internal view returns (uint256 result) {
        address[] memory assets = getAllAssets();
        for (uint256 i; i < assets.length; i++) {
            Asset storage asset = cs().assets[assets[i]];
            result += toWad(IERC20(assets[i]).balanceOf(address(this)), asset.decimals).wadMul(asset.getViewPrice(prices));
        }
    }

    function viewGate() internal view returns (View.Gate memory result) {
        if (address(gm().manager) == address(0)) {
            return result;
        }
        result.kreskian = address(gm().manager.kreskian());
        result.questForKresk = address(gm().manager.questForKresk());
        result.phase = gm().manager.phase();
    }

    function viewMinter() internal view returns (View.Minter memory result) {
        result.LT = ms().liquidationThreshold;
        result.MCR = ms().minCollateralRatio;
        result.MLR = ms().maxLiquidationRatio;
        result.minDebtValue = ms().minDebtValue;
    }

    function viewAccount(PythView calldata prices, address _account) internal view returns (View.Account memory result) {
        result.addr = _account;
        result.bals = viewBalances(prices, _account);
        result.minter = viewMAccount(prices, _account);
        result.scdp = viewSAccount(prices, _account, viewSDepositAssets());
    }

    function viewSCDP(PythView calldata prices) internal view returns (View.SCDP memory result) {
        result.LT = scdp().liquidationThreshold;
        result.MCR = scdp().minCollateralRatio;
        result.MLR = scdp().maxLiquidationRatio;
        result.coverIncentive = uint32(sdi().coverIncentive);
        result.coverThreshold = uint32(sdi().coverThreshold);

        (result.totals, result.deposits) = viewSData(prices);
        result.debts = viewSDebts(prices);
    }

    function viewSDebts(PythView calldata prices) internal view returns (View.Position[] memory results) {
        address[] memory krAssets = scdp().krAssets;
        results = new View.Position[](krAssets.length);

        for (uint256 i; i < krAssets.length; i++) {
            address addr = krAssets[i];

            View.AssetData memory data = viewSAssetData(prices, addr);

            results[i] = View.Position({
                addr: addr,
                symbol: _symbol(addr),
                amount: data.amountDebt,
                amountAdj: data.amountDebt,
                val: data.valDebt,
                valAdj: data.valDebtAdj,
                price: data.price,
                index: -1,
                config: data.config
            });
        }
    }

    function viewSData(
        PythView calldata prices
    ) internal view returns (View.STotals memory totals, View.SDeposit[] memory results) {
        address[] memory collaterals = scdp().collaterals;
        results = new View.SDeposit[](collaterals.length);

        for (uint256 i; i < collaterals.length; i++) {
            address assetAddr = collaterals[i];

            View.AssetData memory data = viewSAssetData(prices, assetAddr);
            totals.valFees += data.valCollFees;
            totals.valColl += data.valColl;
            totals.valCollAdj += data.valCollAdj;
            totals.valDebtOg += data.valDebt;
            totals.valDebtOgAdj += data.valDebtAdj;
            totals.sdiPrice = viewSDIPrice(prices);
            results[i] = View.SDeposit({
                addr: assetAddr,
                liqIndex: scdp().assetIndexes[assetAddr].currLiqIndex,
                feeIndex: scdp().assetIndexes[assetAddr].currFeeIndex,
                symbol: _symbol(assetAddr),
                config: data.config,
                price: data.price,
                amount: data.amountColl,
                amountFees: data.amountCollFees,
                amountSwapDeposit: data.amountSwapDeposit,
                val: data.valColl,
                valAdj: data.valCollAdj,
                valFees: data.valCollFees
            });
        }

        totals.valDebt = viewEffectiveDebtValue(sdi(), prices);
        if (totals.valColl == 0) {
            totals.cr = 0;
            totals.crOg = 0;
            totals.crOgAdj = 0;
        } else if (totals.valDebt == 0) {
            totals.cr = type(uint256).max;
            totals.crOg = type(uint256).max;
            totals.crOgAdj = type(uint256).max;
        } else {
            totals.cr = totals.valColl.percentDiv(totals.valDebt);
            totals.crOg = totals.valColl.percentDiv(totals.valDebtOg);
            totals.crOgAdj = totals.valCollAdj.percentDiv(totals.valDebtOgAdj);
        }
    }

    function viewBalances(PythView calldata prices, address _account) internal view returns (View.Balance[] memory result) {
        address[] memory allAssets = getAllAssets();
        result = new View.Balance[](allAssets.length);
        for (uint256 i; i < allAssets.length; i++) {
            result[i] = viewBalance(prices, _account, allAssets[i]);
        }
    }

    function viewAsset(PythView calldata prices, address addr) internal view returns (View.AssetView memory) {
        Asset storage asset = cs().assets[addr];
        IERC20 token = IERC20(addr);
        RawPrice memory price = prices.ids.length > 0
            ? viewPrice(asset.ticker, prices)
            : pushPrice(asset.oracles, asset.ticker);
        string memory symbol = _symbol(address(token));

        IKreskoAsset.Wrapping memory synthwrap;
        if (asset.kFactor > 0 && bytes32(bytes(symbol)) != bytes32("KISS")) {
            synthwrap = IKreskoAsset(addr).wrappingInfo();
        }
        return
            View.AssetView({
                addr: addr,
                symbol: symbol,
                synthwrap: synthwrap,
                name: token.name(),
                tSupply: token.totalSupply(),
                price: uint256(price.answer),
                isMarketOpen: asset.isMarketOpen(),
                priceRaw: price,
                config: asset
            });
    }

    function viewAssets(PythView calldata prices) internal view returns (View.AssetView[] memory result) {
        address[] memory mCollaterals = ms().collaterals;
        address[] memory mkrAssets = ms().krAssets;
        address[] memory sAssets = scdp().collaterals;

        address[] memory all = new address[](mCollaterals.length + mkrAssets.length + sAssets.length);

        uint256 uniques;

        for (uint256 i; i < mCollaterals.length; i++) {
            if (!find(all, mCollaterals[i])) {
                all[uniques] = mCollaterals[i];
                uniques++;
            }
        }

        for (uint256 i; i < mkrAssets.length; i++) {
            if (!find(all, mkrAssets[i])) {
                all[uniques] = mkrAssets[i];
                uniques++;
            }
        }

        for (uint256 i; i < sAssets.length; i++) {
            if (!find(all, sAssets[i])) {
                all[uniques] = sAssets[i];
                uniques++;
            }
        }

        result = new View.AssetView[](uniques);

        for (uint256 i; i < uniques; i++) {
            result[i] = viewAsset(prices, all[i]);
        }
    }

    function viewBalance(
        PythView calldata prices,
        address _account,
        address _assetAddr
    ) internal view returns (View.Balance memory result) {
        IERC20 token = IERC20(_assetAddr);
        Asset storage asset = cs().assets[_assetAddr];
        result.addr = _account;
        result.amount = token.balanceOf(_account);
        result.val = asset.exists() ? asset.viewCollateralAmountToValue(asset.getViewPrice(prices), result.amount, true) : 0;
        result.token = _assetAddr;
        result.name = token.name();
        result.decimals = token.decimals();
        result.symbol = _symbol(address(token));
    }

    function viewSDepositAssets() internal view returns (address[] memory result) {
        address[] memory depositAssets = scdp().collaterals;
        address[] memory assets = new address[](depositAssets.length);

        uint256 length;

        for (uint256 i; i < depositAssets.length; ) {
            if (cs().assets[depositAssets[i]].isSharedCollateral) {
                assets[length++] = depositAssets[i];
            }
            unchecked {
                i++;
            }
        }

        result = new address[](length);
        for (uint256 i; i < length; ) {
            result[i] = assets[i];
            unchecked {
                i++;
            }
        }
    }

    function viewSAssetData(PythView calldata prices, address _assetAddr) internal view returns (View.AssetData memory result) {
        Asset storage asset = cs().assets[_assetAddr];
        result.addr = _assetAddr;
        result.config = asset;
        result.price = asset.getViewPrice(prices);
        result.symbol = _symbol(_assetAddr);

        bool isSwapMintable = asset.isSwapMintable;
        bool isSCDPAsset = asset.isSharedOrSwappedCollateral;
        result.amountColl = isSCDPAsset ? scdp().totalDepositAmount(_assetAddr, asset) : 0;
        result.amountDebt = isSwapMintable ? asset.toRebasingAmount(scdp().assetData[_assetAddr].debt) : 0;

        uint256 feeIndex = scdp().assetIndexes[_assetAddr].currFeeIndex;
        result.amountCollFees = feeIndex > 0 ? result.amountColl.wadToRay().rayMul(feeIndex).rayToWad() : 0;
        {
            (result.valDebt, result.valDebtAdj) = isSwapMintable
                ? asset.viewDebtAmountToValues(result.price, result.amountDebt)
                : (0, 0);

            (result.valColl, result.valCollAdj) = isSCDPAsset
                ? asset.viewCollateralAmountToValues(result.price, result.amountColl)
                : (0, 0);

            result.valCollFees = feeIndex > 0 ? result.valColl.wadToRay().rayMul(feeIndex).rayToWad() : 0;
        }
        result.amountSwapDeposit = isSwapMintable ? scdp().swapDepositAmount(_assetAddr, asset) : 0;
    }

    function viewMAssetData(
        PythView calldata prices,
        address _account,
        address _assetAddr
    ) internal view returns (View.AssetData memory result) {
        Asset storage asset = cs().assets[_assetAddr];
        result.addr = _assetAddr;
        result.config = asset;
        result.symbol = _symbol(_assetAddr);
        result.price = asset.getViewPrice(prices);

        bool isMinterCollateral = asset.isMinterCollateral;
        bool isMinterMintable = asset.isMinterMintable;

        result.amountColl = isMinterCollateral ? ms().accountCollateralAmount(_account, _assetAddr, asset) : 0;
        result.amountDebt = isMinterMintable ? ms().accountDebtAmount(_account, _assetAddr, asset) : 0;

        (result.valDebt, result.valDebtAdj) = isMinterMintable
            ? asset.viewDebtAmountToValues(result.price, result.amountDebt)
            : (0, 0);

        (result.valColl, result.valCollAdj) = isMinterCollateral
            ? asset.viewCollateralAmountToValues(result.price, result.amountColl)
            : (0, 0);
    }

    function viewMAccount(PythView calldata prices, address _account) internal view returns (View.MAccount memory result) {
        result.totals.valColl = ms().viewAccountTotalCollateralValue(prices, _account);
        result.totals.valDebt = ms().viewAccountTotalDebtValue(prices, _account);
        if (result.totals.valColl == 0) {
            result.totals.cr = 0;
        } else if (result.totals.valDebt == 0) {
            result.totals.cr = type(uint256).max;
        } else {
            result.totals.cr = result.totals.valColl.percentDiv(result.totals.valDebt);
        }
        result.deposits = viewMDeposits(prices, _account);
        result.debts = viewMDebts(prices, _account);
    }

    function viewMDeposits(PythView calldata prices, address _account) internal view returns (View.Position[] memory result) {
        address[] memory colls = ms().collaterals;
        result = new View.Position[](colls.length);

        for (uint256 i; i < colls.length; i++) {
            address addr = colls[i];
            View.AssetData memory data = viewMAssetData(prices, _account, addr);
            Arrays.FindResult memory findResult = ms().depositedCollateralAssets[_account].find(addr);
            result[i] = View.Position({
                addr: addr,
                symbol: _symbol(addr),
                amount: data.amountColl,
                amountAdj: 0,
                val: data.valColl,
                valAdj: data.valCollAdj,
                price: data.price,
                index: findResult.exists ? int256(findResult.index) : -1,
                config: data.config
            });
        }
    }

    function viewMDebts(PythView calldata prices, address _account) internal view returns (View.Position[] memory result) {
        address[] memory krAssets = ms().krAssets;
        result = new View.Position[](krAssets.length);

        for (uint256 i; i < krAssets.length; i++) {
            address addr = krAssets[i];
            View.AssetData memory data = viewMAssetData(prices, _account, addr);
            Arrays.FindResult memory findResult = ms().mintedKreskoAssets[_account].find(addr);
            result[i] = View.Position({
                addr: addr,
                symbol: _symbol(addr),
                amount: data.amountDebt,
                amountAdj: 0,
                val: data.valDebt,
                valAdj: data.valDebtAdj,
                price: data.price,
                index: findResult.exists ? int256(findResult.index) : -1,
                config: data.config
            });
        }
    }

    function viewSAccount(
        PythView calldata prices,
        address _account,
        address[] memory _assets
    ) internal view returns (View.SAccount memory result) {
        result.addr = _account;
        (result.totals.valColl, result.totals.valFees, result.deposits) = viewSAccountTotals(prices, _account, _assets);
    }

    function viewSAccountTotals(
        PythView calldata prices,
        address _account,
        address[] memory _assets
    ) internal view returns (uint256 totalVal, uint256 totalValFees, View.SDepositUser[] memory datas) {
        address[] memory assets = scdp().collaterals;
        datas = new View.SDepositUser[](_assets.length);

        for (uint256 i; i < assets.length; ) {
            address asset = assets[i];
            View.SDepositUser memory assetData = viewSAccountDeposit(prices, _account, asset);

            totalVal += assetData.val;
            totalValFees += assetData.valFees;

            for (uint256 j; j < _assets.length; ) {
                if (asset == _assets[j]) {
                    datas[j] = assetData;
                }
                unchecked {
                    j++;
                }
            }

            unchecked {
                i++;
            }
        }
    }

    function viewSAccountDeposit(
        PythView calldata prices,
        address _account,
        address _assetAddr
    ) internal view returns (View.SDepositUser memory result) {
        Asset storage asset = cs().assets[_assetAddr];

        result.price = asset.getViewPrice(prices);
        result.config = asset;

        result.amount = scdp().accountDeposits(_account, _assetAddr, asset);
        result.amountFees = scdp().accountFees(_account, _assetAddr, asset);
        result.val = asset.viewCollateralAmountToValue(result.price, result.amount, true);
        result.valFees = asset.viewCollateralAmountToValue(result.price, result.amountFees, true);

        result.symbol = _symbol(_assetAddr);
        result.addr = _assetAddr;
        result.liqIndexAccount = scdp().accountIndexes[_account][_assetAddr].lastLiqIndex;
        result.feeIndexAccount = scdp().accountIndexes[_account][_assetAddr].lastFeeIndex;
        result.accountIndexTimestamp = scdp().accountIndexes[_account][_assetAddr].timestamp;
        result.liqIndexCurrent = scdp().assetIndexes[_assetAddr].currLiqIndex;
        result.feeIndexCurrent = scdp().assetIndexes[_assetAddr].currFeeIndex;
    }

    function viewPhaseEligibility(address _account) internal view returns (uint8 phase, bool isEligible) {
        if (address(gm().manager) == address(0)) {
            return (0, true);
        }
        phase = gm().manager.phase();
        isEligible = gm().manager.isEligible(_account);
    }

    function _symbol(address _assetAddr) internal view returns (string memory) {
        return _assetAddr == 0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8 ? "USDC.e" : IERC20(_assetAddr).symbol();
    }

    /// @notice Returns the total effective debt value of the SCDP.
    /// @notice Calculation is done in wad precision but returned as oracle precision.
    function viewEffectiveDebtValue(SDIState storage self, PythView calldata prices) internal view returns (uint256 result) {
        uint256 sdiPrice = viewSDIPrice(prices);
        uint256 coverValue = viewTotalCoverValue(prices);
        uint256 coverAmount = coverValue != 0 ? coverValue.wadDiv(sdiPrice) : 0;
        uint256 totalDebt = self.totalDebt;

        if (coverAmount >= totalDebt) return 0;

        if (coverValue == 0) {
            result = totalDebt;
        } else {
            result = (totalDebt - coverAmount);
        }

        return fromWad(result.wadMul(sdiPrice), cs().oracleDecimals);
    }

    /// @notice Get the price of SDI in USD (WAD precision, so 18 decimals).
    function viewSDIPrice(PythView calldata prices) internal view returns (uint256) {
        uint256 totalValue = viewTotalDebtValueAtRatioSCDP(prices, Percents.HUNDRED, false);
        if (totalValue == 0) {
            return 1e18;
        }
        return toWad(totalValue, cs().oracleDecimals).wadDiv(sdi().totalDebt);
    }

    /**
     * @notice Returns the value of the krAsset held in the pool at a ratio.
     * @param _ratio Percentage ratio to apply for the value in 1e4 percentage precision (uint32).
     * @param _ignorekFactor Whether to ignore kFactor
     * @return totalValue Total value in USD
     */
    function viewTotalDebtValueAtRatioSCDP(
        PythView calldata prices,
        uint32 _ratio,
        bool _ignorekFactor
    ) internal view returns (uint256 totalValue) {
        address[] memory assets = scdp().krAssets;
        for (uint256 i; i < assets.length; ) {
            Asset storage asset = cs().assets[assets[i]];
            uint256 debtAmount = asset.toRebasingAmount(scdp().assetData[assets[i]].debt);
            unchecked {
                if (debtAmount != 0) {
                    totalValue += asset.viewDebtAmountToValue(debtAmount, asset.getViewPrice(prices), _ignorekFactor);
                }
                i++;
            }
        }

        // Multiply if needed
        if (_ratio != Percents.HUNDRED) {
            totalValue = totalValue.percentMul(_ratio);
        }
    }

    function viewTotalCoverValue(PythView calldata prices) internal view returns (uint256 result) {
        address[] memory assets = sdi().coverAssets;
        for (uint256 i; i < assets.length; ) {
            unchecked {
                result += viewCoverAssetValue(prices, assets[i]);
                i++;
            }
        }
    }

    /// @notice Get total deposit value of `asset` in USD, wad precision.
    function viewCoverAssetValue(PythView calldata prices, address _assetAddr) internal view returns (uint256) {
        uint256 bal = IERC20(_assetAddr).balanceOf(sdi().coverRecipient);
        if (bal == 0) return 0;

        Asset storage asset = cs().assets[_assetAddr];
        if (!asset.isCoverAsset) return 0;

        return wadUSD(bal, asset.decimals, asset.getViewPrice(prices), cs().oracleDecimals);
    }
}
