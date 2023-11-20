// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.19;

import {PercentageMath} from "libs/PercentageMath.sol";
import {cs, gs} from "common/State.sol";
import {scdp, sdi} from "scdp/SState.sol";
import {PType} from "periphery/PTypes.sol";
import {isSequencerUp} from "common/funcs/Utils.sol";
import {Asset, RawPrice} from "common/Types.sol";
import {IERC20} from "kresko-lib/token/IERC20.sol";
import {pushPrice, SDIPrice} from "common/funcs/Prices.sol";
import {collateralAmountToValues, debtAmountToValues} from "common/funcs/Helpers.sol";
import {WadRay} from "libs/WadRay.sol";
import {ms} from "minter/MState.sol";
import {IERC1155} from "common/interfaces/IERC1155.sol";
import {Arrays} from "libs/Arrays.sol";
import {IAggregatorV3} from "kresko-lib/vendor/IAggregatorV3.sol";

// solhint-disable code-complexity

library PFunc {
    using PercentageMath for *;
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
    }

    function getGate() internal view returns (PType.Gate memory result) {
        result.kreskian = gs().kreskian;
        result.questForKresk = gs().questForKresk;
        result.phase = gs().phase;
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
        // result.coverIncentive = uint32(sdi().coverIncentive);
        // result.coverThreshold = uint32(sdi().coverThreshold);

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
                symbol: IERC20(addr).symbol(),
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
            totals.sdiPrice = SDIPrice();
            results[i] = PType.SDeposit({
                addr: assetAddr,
                liqIndex: scdp().assetIndexes[assetAddr].currLiqIndex,
                feeIndex: scdp().assetIndexes[assetAddr].currFeeIndex,
                symbol: IERC20(assetAddr).symbol(),
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

        totals.valDebt = sdi().effectiveDebtValue();
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
        return
            PType.PAsset({
                addr: addr,
                symbol: token.symbol(),
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
        result.val = asset.exists() ? asset.collateralAmountToValue(result.amount, true) : 0;
        result.token = _assetAddr;
        result.name = token.name();
        result.decimals = token.decimals();
        result.symbol = token.symbol();
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
        result.symbol = IERC20(_assetAddr).symbol();

        bool isSwapMintable = asset.isSwapMintable;
        bool isSCDPAsset = asset.isSharedOrSwappedCollateral;
        result.amountColl = isSCDPAsset ? scdp().totalDepositAmount(_assetAddr, asset) : 0;
        result.amountDebt = isSwapMintable ? asset.toRebasingAmount(scdp().assetData[_assetAddr].debt) : 0;

        uint256 feeIndex = scdp().assetIndexes[_assetAddr].currFeeIndex;
        result.amountCollFees = feeIndex > 0 ? result.amountColl.wadToRay().rayMul(feeIndex).rayToWad() : 0;
        {
            (uint256 debtValue, uint256 debtValueAdjusted, uint256 krAssetPrice) = isSwapMintable
                ? debtAmountToValues(asset, result.amountDebt)
                : (0, 0, 0);

            result.valDebt = debtValue;
            result.valDebtAdj = debtValueAdjusted;

            (uint256 depositValue, uint256 depositValueAdjusted, uint256 collateralPrice) = isSCDPAsset
                ? collateralAmountToValues(asset, result.amountColl)
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
            ? debtAmountToValues(config, debtAmount)
            : (0, 0, 0);

        (uint256 depositValue, uint256 depositValueAdjusted, uint256 collateralPrice) = isMinterCollateral
            ? collateralAmountToValues(config, depositAmount)
            : (0, 0, 0);

        return
            PType.AssetData({
                addr: _assetAddr,
                symbol: IERC20(_assetAddr).symbol(),
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
        result.totals.valColl = ms().accountTotalCollateralValue(_account);
        result.totals.valDebt = ms().accountTotalDebtValue(_account);
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
                symbol: IERC20(addr).symbol(),
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
                symbol: IERC20(addr).symbol(),
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
        (result.val, result.price) = asset.collateralAmountToValueWithPrice(result.amount, true);
        result.valFees = asset.collateralAmountToValue(result.amountFees, true);

        result.symbol = IERC20(_assetAddr).symbol();
        result.addr = _assetAddr;
        result.liqIndex = scdp().accountIndexes[_account][_assetAddr].lastLiqIndex;
        result.feeIndex = scdp().accountIndexes[_account][_assetAddr].lastFeeIndex;
    }

    function getPhaseEligibility(address _user) internal view returns (uint8 phase, bool eligibleForCurrentPhase) {
        phase = gs().phase;
        if (phase <= 2) {
            if (IERC1155(gs().kreskian).balanceOf(_user, 0) > 0) {
                eligibleForCurrentPhase = true;
                phase = 2;
            }
        }
        if (phase == 1) {
            IERC1155 questForKresk = IERC1155(gs().questForKresk);
            if (questForKresk.balanceOf(_user, 2) > 0 && questForKresk.balanceOf(_user, 3) > 0) {
                eligibleForCurrentPhase = true;
                phase = 1;
            }
        } else if (phase == 0) {
            if (IERC1155(gs().questForKresk).balanceOf(_user, 3) > 0) {
                eligibleForCurrentPhase = true;
                phase = 0;
            }
        } else {
            phase = 32;
            eligibleForCurrentPhase = true;
        }
    }
}
