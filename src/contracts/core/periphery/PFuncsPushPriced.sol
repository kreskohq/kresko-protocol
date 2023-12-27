// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.19;

import {PercentageMath} from "libs/PercentageMath.sol";
import {cs, gm} from "common/State.sol";
import {scdp, SCDPState, sdi, SDIState} from "scdp/SState.sol";
import {PType} from "periphery/PTypes.sol";
import {isSequencerUp} from "common/funcs/Utils.sol";
import {Asset, RawPrice} from "common/Types.sol";
import {IERC20} from "kresko-lib/token/IERC20.sol";
import {pushPrice} from "common/funcs/Prices.sol";
import {collateralAmountToValues, debtAmountToValues} from "common/funcs/Helpers.sol";
import {WadRay} from "libs/WadRay.sol";
import {MinterState, ms} from "minter/MState.sol";
import {Arrays} from "libs/Arrays.sol";
import {IAggregatorV3} from "kresko-lib/vendor/IAggregatorV3.sol";
import {IKreskoAsset} from "kresko-asset/IKreskoAsset.sol";
import {PHelpers} from "periphery/PHelpers.sol";
import {fromWad, toWad, wadUSD} from "common/funcs/Math.sol";
import {Percents} from "common/Constants.sol";

// solhint-disable code-complexity

library PFuncPushPriced {
    using PercentageMath for *;
    using PHelpers for Asset;
    using PHelpers for MinterState;
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

    function getProtocol() internal view returns (PType.Protocol memory result) {
        result.assets = getPAssets();
        result.minter = getMinter();
        result.scdp = getSCDP();
        result.maxPriceDeviationPct = cs().maxPriceDeviationPct;
        result.oracleDecimals = cs().oracleDecimals;
        result.staleTime = cs().staleTime;
        result.safetyStateSet = cs().safetyStateSet;
        result.sequencerGracePeriodTime = cs().sequencerGracePeriodTime;
        result.isSequencerUp = isSequencerUp(cs().sequencerUptimeFeed, cs().sequencerGracePeriodTime);
        (, , uint256 startedAt, , ) = IAggregatorV3(cs().sequencerUptimeFeed).latestRoundData();
        result.sequencerStartedAt = uint32(startedAt);
        result.timestamp = uint32(block.timestamp);
        result.blockNr = uint32(block.number);
        result.gate = getGate();
        result.tvl = getTVL();
    }

    function getTVL() internal view returns (uint256 result) {
        address[] memory assets = getAllAssets();
        for (uint256 i; i < assets.length; i++) {
            Asset storage asset = cs().assets[assets[i]];
            result += toWad(IERC20(assets[i]).balanceOf(address(this)), asset.decimals).wadMul(asset.getNormalizedPushPrice());
        }
    }

    function getGate() internal view returns (PType.Gate memory result) {
        if (address(gm().manager) == address(0)) {
            return result;
        }
        result.kreskian = address(gm().manager.kreskian());
        result.questForKresk = address(gm().manager.questForKresk());
        result.phase = gm().manager.phase();
    }

    function getMinter() internal view returns (PType.Minter memory result) {
        result.LT = ms().liquidationThreshold;
        result.MCR = ms().minCollateralRatio;
        result.MLR = ms().maxLiquidationRatio;
        result.minDebtValue = ms().minDebtValue;
    }

    function getAccount(address _account) internal view returns (PType.Account memory result) {
        result.addr = _account;
        result.bals = getBalances(_account);
        result.minter = getMAccount(_account);
        result.scdp = getSAccount(_account, getSDepositAssets());
    }

    function getSCDP() internal view returns (PType.SCDP memory result) {
        result.LT = scdp().liquidationThreshold;
        result.MCR = scdp().minCollateralRatio;
        result.MLR = scdp().maxLiquidationRatio;
        result.coverIncentive = uint32(sdi().coverIncentive);
        result.coverThreshold = uint32(sdi().coverThreshold);

        (result.totals, result.deposits) = getSData();
        result.debts = getSDebts();
    }

    function getSDebts() internal view returns (PType.PAssetEntry[] memory results) {
        address[] memory krAssets = scdp().krAssets;
        results = new PType.PAssetEntry[](krAssets.length);

        for (uint256 i; i < krAssets.length; i++) {
            address addr = krAssets[i];

            PType.AssetData memory data = getSAssetData(addr);

            results[i] = PType.PAssetEntry({
                addr: addr,
                symbol: _getSymbol(addr),
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

    function getSData() internal view returns (PType.STotals memory totals, PType.SDeposit[] memory results) {
        address[] memory collaterals = scdp().collaterals;
        results = new PType.SDeposit[](collaterals.length);

        for (uint256 i; i < collaterals.length; i++) {
            address assetAddr = collaterals[i];

            PType.AssetData memory data = getSAssetData(assetAddr);
            totals.valFees += data.valCollFees;
            totals.valColl += data.valColl;
            totals.valCollAdj += data.valCollAdj;
            totals.valDebtOg += data.valDebt;
            totals.valDebtOgAdj += data.valDebtAdj;
            totals.sdiPrice = SDIPricePushPriced();
            results[i] = PType.SDeposit({
                addr: assetAddr,
                liqIndex: scdp().assetIndexes[assetAddr].currLiqIndex,
                feeIndex: scdp().assetIndexes[assetAddr].currFeeIndex,
                symbol: _getSymbol(assetAddr),
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

        totals.valDebt = effectiveDebtValuePushPriced(sdi());
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

    function getBalances(address _account) internal view returns (PType.Balance[] memory result) {
        address[] memory allAssets = getAllAssets();
        result = new PType.Balance[](allAssets.length);
        for (uint256 i; i < allAssets.length; i++) {
            result[i] = getBalance(_account, allAssets[i]);
        }
    }

    function getAsset(address addr) internal view returns (PType.PAsset memory) {
        Asset storage asset = cs().assets[addr];
        IERC20 token = IERC20(addr);
        RawPrice memory price = pushPrice(asset.oracles, asset.ticker);
        string memory symbol = _getSymbol(address(token));

        IKreskoAsset.Wrapping memory synthwrap;
        if (asset.kFactor > 0 && bytes32(bytes(symbol)) != bytes32("KISS")) {
            synthwrap = IKreskoAsset(addr).wrappingInfo();
        }
        return
            PType.PAsset({
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

    function getPAssets() internal view returns (PType.PAsset[] memory result) {
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

        result = new PType.PAsset[](uniques);

        for (uint256 i; i < uniques; i++) {
            result[i] = getAsset(all[i]);
        }
    }

    function getBalance(address _account, address _assetAddr) internal view returns (PType.Balance memory result) {
        IERC20 token = IERC20(_assetAddr);
        Asset storage asset = cs().assets[_assetAddr];
        result.addr = _account;
        result.amount = token.balanceOf(_account);
        result.val = asset.exists() ? asset.collateralAmountToValuePushPriced(result.amount, true) : 0;
        result.token = _assetAddr;
        result.name = token.name();
        result.decimals = token.decimals();
        result.symbol = _getSymbol(address(token));
    }

    function getSDepositAssets() internal view returns (address[] memory result) {
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

    function getSAssetData(address _assetAddr) internal view returns (PType.AssetData memory result) {
        Asset storage asset = cs().assets[_assetAddr];
        result.addr = _assetAddr;
        result.config = asset;
        result.symbol = _getSymbol(_assetAddr);

        bool isSwapMintable = asset.isSwapMintable;
        bool isSCDPAsset = asset.isSharedOrSwappedCollateral;
        result.amountColl = isSCDPAsset ? scdp().totalDepositAmount(_assetAddr, asset) : 0;
        result.amountDebt = isSwapMintable ? asset.toRebasingAmount(scdp().assetData[_assetAddr].debt) : 0;

        uint256 feeIndex = scdp().assetIndexes[_assetAddr].currFeeIndex;
        result.amountCollFees = feeIndex > 0 ? result.amountColl.wadToRay().rayMul(feeIndex).rayToWad() : 0;
        {
            (uint256 debtValue, uint256 debtValueAdjusted, uint256 krAssetPrice) = isSwapMintable
                ? asset.debtAmountToValuesPushPriced(result.amountDebt)
                : (0, 0, 0);

            result.valDebt = debtValue;
            result.valDebtAdj = debtValueAdjusted;

            (uint256 depositValue, uint256 depositValueAdjusted, uint256 collateralPrice) = isSCDPAsset
                ? asset.collateralAmountToValuesPushPriced(result.amountColl)
                : (0, 0, 0);

            result.valColl = depositValue;
            result.valCollAdj = depositValueAdjusted;
            result.valCollFees = feeIndex > 0 ? depositValue.wadToRay().rayMul(feeIndex).rayToWad() : 0;
            result.price = krAssetPrice > 0 ? krAssetPrice : collateralPrice;
        }
        result.amountSwapDeposit = isSwapMintable ? scdp().swapDepositAmount(_assetAddr, asset) : 0;
    }

    function getMAssetData(address _account, address _assetAddr) internal view returns (PType.AssetData memory) {
        Asset storage config = cs().assets[_assetAddr];
        bool isMinterCollateral = config.isMinterCollateral;
        bool isMinterMintable = config.isMinterMintable;
        uint256 depositAmount = isMinterCollateral ? ms().accountCollateralAmount(_account, _assetAddr, config) : 0;
        uint256 debtAmount = isMinterMintable ? ms().accountDebtAmount(_account, _assetAddr, config) : 0;
        // uint256 debtAmount = isMinterMintable ? asset.toRebasingAmount(scdp().assetData[_assetAddr].debt) : 0;

        (uint256 debtValue, uint256 debtValueAdjusted, uint256 krAssetPrice) = isMinterMintable
            ? config.debtAmountToValuesPushPriced(debtAmount)
            : (0, 0, 0);

        (uint256 depositValue, uint256 depositValueAdjusted, uint256 collateralPrice) = isMinterCollateral
            ? config.collateralAmountToValuesPushPriced(depositAmount)
            : (0, 0, 0);

        return
            PType.AssetData({
                addr: _assetAddr,
                symbol: _getSymbol(_assetAddr),
                config: config,
                price: krAssetPrice > 0 ? krAssetPrice : collateralPrice,
                amountColl: depositAmount,
                amountCollFees: 0,
                valColl: depositValue,
                valCollAdj: depositValueAdjusted,
                valCollFees: 0,
                amountDebt: debtAmount,
                valDebt: debtValue,
                valDebtAdj: debtValueAdjusted,
                amountSwapDeposit: 0
            });
    }

    function getMAccount(address _account) internal view returns (PType.MAccount memory result) {
        result.totals.valColl = ms().accountTotalCollateralValuePushPriced(_account);
        result.totals.valDebt = ms().accountTotalDebtValuePushPriced(_account);
        if (result.totals.valColl == 0) {
            result.totals.cr = 0;
        } else if (result.totals.valDebt == 0) {
            result.totals.cr = type(uint256).max;
        } else {
            result.totals.cr = result.totals.valColl.percentDiv(result.totals.valDebt);
        }
        result.deposits = getMDeposits(_account);
        result.debts = getMDebts(_account);
    }

    function getMDeposits(address _account) internal view returns (PType.PAssetEntry[] memory result) {
        address[] memory collaterals = ms().collaterals;
        result = new PType.PAssetEntry[](collaterals.length);

        for (uint256 i; i < collaterals.length; i++) {
            address addr = collaterals[i];
            PType.AssetData memory data = getMAssetData(_account, addr);
            Arrays.FindResult memory findResult = ms().depositedCollateralAssets[_account].find(addr);
            result[i] = PType.PAssetEntry({
                addr: addr,
                symbol: _getSymbol(addr),
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

    function getMDebts(address _account) internal view returns (PType.PAssetEntry[] memory result) {
        address[] memory krAssets = ms().krAssets;
        result = new PType.PAssetEntry[](krAssets.length);

        for (uint256 i; i < krAssets.length; i++) {
            address addr = krAssets[i];
            PType.AssetData memory data = getMAssetData(_account, addr);
            Arrays.FindResult memory findResult = ms().mintedKreskoAssets[_account].find(addr);
            result[i] = PType.PAssetEntry({
                addr: addr,
                symbol: _getSymbol(addr),
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

    function getSAccount(address _account, address[] memory _assets) internal view returns (PType.SAccount memory result) {
        result.addr = _account;
        (result.totals.valColl, result.totals.valFees, result.deposits) = getSAccountTotals(_account, _assets);
    }

    function getSAccountTotals(
        address _account,
        address[] memory _assets
    ) internal view returns (uint256 totalVal, uint256 totalValFees, PType.SDepositUser[] memory datas) {
        address[] memory assets = scdp().collaterals;
        datas = new PType.SDepositUser[](_assets.length);

        for (uint256 i; i < assets.length; ) {
            address asset = assets[i];
            PType.SDepositUser memory assetData = getSAccountDeposit(_account, asset);

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

    function getSAccountDeposit(address _account, address _assetAddr) internal view returns (PType.SDepositUser memory result) {
        Asset storage asset = cs().assets[_assetAddr];
        result.config = asset;

        result.amount = scdp().accountDeposits(_account, _assetAddr, asset);
        result.amountFees = scdp().accountFees(_account, _assetAddr, asset);
        (result.val, result.price) = asset.collateralAmountToValueWithPushPrice(result.amount, true);
        result.valFees = asset.collateralAmountToValuePushPriced(result.amountFees, true);

        result.symbol = _getSymbol(_assetAddr);
        result.addr = _assetAddr;
        result.liqIndexAccount = scdp().accountIndexes[_account][_assetAddr].lastLiqIndex;
        result.feeIndexAccount = scdp().accountIndexes[_account][_assetAddr].lastFeeIndex;
        result.accountIndexTimestamp = scdp().accountIndexes[_account][_assetAddr].timestamp;
        result.liqIndexCurrent = scdp().assetIndexes[_assetAddr].currLiqIndex;
        result.feeIndexCurrent = scdp().assetIndexes[_assetAddr].currFeeIndex;
    }

    function getPhaseEligibility(address _account) internal view returns (uint8 phase, bool isEligible) {
        if (address(gm().manager) == address(0)) {
            return (0, true);
        }
        phase = gm().manager.phase();
        isEligible = gm().manager.isEligible(_account);
    }

    function _getSymbol(address _assetAddr) internal view returns (string memory) {
        return _assetAddr == 0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8 ? "USDC.e" : IERC20(_assetAddr).symbol();
    }

    /// @notice Returns the total effective debt value of the SCDP.
    /// @notice Calculation is done in wad precision but returned as oracle precision.
    function effectiveDebtValuePushPriced(SDIState storage self) internal view returns (uint256 result) {
        uint256 sdiPrice = SDIPricePushPriced();
        uint256 coverValue = totalCoverValuePushPriced();
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
    function SDIPricePushPriced() internal view returns (uint256) {
        uint256 totalValue = totalDebtValueAtRatioSCDPPushPriced(Percents.HUNDRED, false);
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
    function totalDebtValueAtRatioSCDPPushPriced(
        uint32 _ratio,
        bool _ignorekFactor
    ) internal view returns (uint256 totalValue) {
        address[] memory assets = scdp().krAssets;
        for (uint256 i; i < assets.length; ) {
            Asset storage asset = cs().assets[assets[i]];
            uint256 debtAmount = asset.toRebasingAmount(scdp().assetData[assets[i]].debt);
            unchecked {
                if (debtAmount != 0) {
                    totalValue += asset.debtAmountToValuePushPriced(debtAmount, _ignorekFactor);
                }
                i++;
            }
        }

        // Multiply if needed
        if (_ratio != Percents.HUNDRED) {
            totalValue = totalValue.percentMul(_ratio);
        }
    }

    function totalCoverValuePushPriced() internal view returns (uint256 result) {
        address[] memory assets = sdi().coverAssets;
        for (uint256 i; i < assets.length; ) {
            unchecked {
                result += coverAssetValuePushPriced(assets[i]);
                i++;
            }
        }
    }

    /// @notice Get total deposit value of `asset` in USD, wad precision.
    function coverAssetValuePushPriced(address _assetAddr) internal view returns (uint256) {
        uint256 bal = IERC20(_assetAddr).balanceOf(sdi().coverRecipient);
        if (bal == 0) return 0;

        Asset storage asset = cs().assets[_assetAddr];
        if (!asset.isCoverAsset) return 0;

        return wadUSD(bal, asset.decimals, asset.getNormalizedPushPrice(), cs().oracleDecimals);
    }
}