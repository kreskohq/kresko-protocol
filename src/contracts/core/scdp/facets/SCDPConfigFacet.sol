// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {SafeERC20Permit, IERC20Permit} from "vendor/SafeERC20Permit.sol";
import {Arrays} from "libs/Arrays.sol";
import {DSModifiers} from "diamond/Modifiers.sol";
import {ds} from "diamond/State.sol";

import {Role, Asset} from "common/Types.sol";
import {DiamondEvent} from "common/Events.sol";
import {CModifiers} from "common/Modifiers.sol";
import {cs} from "common/State.sol";
import {Percents} from "common/Constants.sol";
import {CError} from "common/CError.sol";
import {MEvent} from "minter/Events.sol";

import {ISCDPConfigFacet} from "scdp/interfaces/ISCDPConfigFacet.sol";
import {SCDPInitArgs, PairSetter} from "scdp/Types.sol";
import {scdp, sdi} from "scdp/State.sol";
import {SEvent} from "scdp/Events.sol";

contract SCDPConfigFacet is ISCDPConfigFacet, DSModifiers, CModifiers {
    using SafeERC20Permit for IERC20Permit;
    using Arrays for address[];

    /// @inheritdoc ISCDPConfigFacet
    function initializeSCDP(SCDPInitArgs memory _init) external onlyOwner {
        if (_init.minCollateralRatio < Percents.MIN_CR) {
            revert CError.INVALID_MCR(_init.minCollateralRatio, Percents.MIN_CR);
        } else if (_init.liquidationThreshold < Percents.MIN_CR) {
            revert CError.INVALID_LT(_init.liquidationThreshold, Percents.MIN_CR);
        } else if (_init.liquidationThreshold > _init.minCollateralRatio) {
            revert CError.INVALID_LT(_init.liquidationThreshold, _init.minCollateralRatio);
        } else if (_init.swapFeeRecipient == address(0)) {
            revert CError.INVALID_FEE_RECIPIENT(_init.swapFeeRecipient);
        } else if (_init.sdiPricePrecision < 8) {
            revert CError.INVALID_DECIMALS(address(0xD1), _init.sdiPricePrecision);
        }
        scdp().minCollateralRatio = _init.minCollateralRatio;
        scdp().liquidationThreshold = _init.liquidationThreshold;
        scdp().swapFeeRecipient = _init.swapFeeRecipient;
        scdp().maxLiquidationRatio = _init.liquidationThreshold + Percents.ONE;
        sdi().sdiPricePrecision = _init.sdiPricePrecision;

        emit DiamondEvent.Initialized(msg.sender, ds().storageVersion++);
    }

    /// @inheritdoc ISCDPConfigFacet
    function getCurrentParametersSCDP() external view override returns (SCDPInitArgs memory) {
        return
            SCDPInitArgs({
                swapFeeRecipient: scdp().swapFeeRecipient,
                minCollateralRatio: scdp().minCollateralRatio,
                liquidationThreshold: scdp().liquidationThreshold,
                sdiPricePrecision: sdi().sdiPricePrecision
            });
    }

    function setFeeAssetSCDP(address asset) external onlyRole(Role.ADMIN) {
        scdp().feeAsset = asset;
    }

    /// @inheritdoc ISCDPConfigFacet
    function setMinCollateralRatioSCDP(uint32 _mcr) external onlyRole(Role.ADMIN) {
        if (_mcr < Percents.MIN_CR) {
            revert CError.INVALID_MCR(_mcr, Percents.MIN_CR);
        }
        scdp().minCollateralRatio = _mcr;
    }

    /// @inheritdoc ISCDPConfigFacet
    function setLiquidationThresholdSCDP(uint32 _lt) external onlyRole(Role.ADMIN) {
        if (_lt < Percents.MIN_CR) {
            revert CError.INVALID_LT(_lt, Percents.MIN_CR);
        } else if (_lt > scdp().minCollateralRatio) {
            revert CError.INVALID_LT(_lt, scdp().minCollateralRatio);
        }
        scdp().liquidationThreshold = _lt;
        scdp().maxLiquidationRatio = _lt + Percents.ONE;
    }

    function setMaxLiquidationRatioSCDP(uint32 _mlr) external onlyRole(Role.ADMIN) {
        if (_mlr < scdp().liquidationThreshold) {
            revert CError.INVALID_MLR(_mlr, scdp().liquidationThreshold);
        }
        scdp().maxLiquidationRatio = _mlr;
    }

    /* -------------------------------------------------------------------------- */
    /*                                   Assets                                   */
    /* -------------------------------------------------------------------------- */

    /// @inheritdoc ISCDPConfigFacet
    function updateDepositLimitSCDP(
        address _assetAddr,
        uint128 _newDepositLimitSCDP
    ) external isSCDPDepositAsset(_assetAddr) onlyRole(Role.ADMIN) {
        cs().assets[_assetAddr].depositLimitSCDP = _newDepositLimitSCDP;
    }

    /// @inheritdoc ISCDPConfigFacet
    function updateLiquidationIncentiveSCDP(
        address _assetAddr,
        uint16 _newLiqIncentiveSCDP
    ) public isSCDPKrAsset(_assetAddr) onlyRole(Role.ADMIN) {
        if (_newLiqIncentiveSCDP < Percents.HUNDRED) {
            revert CError.INVALID_LIQ_INCENTIVE(_assetAddr, _newLiqIncentiveSCDP, Percents.HUNDRED);
        } else if (_newLiqIncentiveSCDP > Percents.MAX_LIQ_INCENTIVE) {
            revert CError.INVALID_LIQ_INCENTIVE(_assetAddr, _newLiqIncentiveSCDP, Percents.MAX_LIQ_INCENTIVE);
        }

        cs().assets[_assetAddr].liqIncentiveSCDP = _newLiqIncentiveSCDP;
        emit MEvent.LiquidationIncentiveMultiplierUpdated(_assetAddr, _newLiqIncentiveSCDP);
    }

    /// @inheritdoc ISCDPConfigFacet
    function setDepositAssetSCDP(address _assetAddr, bool _enabled) external onlyRole(Role.ADMIN) {
        Asset storage asset = cs().assets[_assetAddr];
        if (_enabled && asset.isSCDPDepositAsset) {
            revert CError.ASSET_ALREADY_ENABLED(_assetAddr);
        } else if (!_enabled && !asset.isSCDPDepositAsset) {
            revert CError.ASSET_ALREADY_DISABLED(_assetAddr);
        }
        if (_enabled) {
            scdp().collaterals.pushUnique(_assetAddr);
        } else {
            asset.depositLimitSCDP = 0;
        }
        asset.isSCDPDepositAsset = _enabled;
    }

    /// @inheritdoc ISCDPConfigFacet
    function setKrAssetSCDP(address _assetAddr, bool _enabled) external onlyRole(Role.ADMIN) {
        Asset storage asset = cs().assets[_assetAddr];
        if (_enabled && asset.isKrAsset) {
            revert CError.ASSET_ALREADY_ENABLED(_assetAddr);
        } else if (!_enabled && !asset.isKrAsset) {
            revert CError.ASSET_ALREADY_DISABLED(_assetAddr);
        }
        if (_enabled) {
            scdp().collaterals.pushUnique(_assetAddr);
            scdp().krAssets.pushUnique(_assetAddr);
        } else {
            if (asset.toRebasingAmount(scdp().assetData[_assetAddr].debt) != 0) revert CError.INVALID_ASSET(_assetAddr);
            scdp().krAssets.removeExisting(_assetAddr);
            asset.liqIncentiveSCDP = 0;
        }
        asset.isSCDPKrAsset = _enabled;
    }

    function setCollateralSCDP(address _assetAddr, bool _enabled) external onlyRole(Role.ADMIN) {
        Asset storage asset = cs().assets[_assetAddr];
        if (_enabled && asset.isSCDPCollateral) {
            revert CError.ASSET_ALREADY_ENABLED(_assetAddr);
        } else if (!_enabled && !asset.isSCDPCollateral) {
            revert CError.ASSET_ALREADY_DISABLED(_assetAddr);
        }
        if (_enabled) {
            scdp().collaterals.pushUnique(_assetAddr);
        } else {
            if (scdp().userDepositAmount(_assetAddr, asset) != 0) revert CError.INVALID_ASSET(_assetAddr);
            scdp().collaterals.removeExisting(_assetAddr);
            asset.depositLimitSCDP = 0;
        }
        asset.isSCDPCollateral = _enabled;
    }

    /* -------------------------------------------------------------------------- */
    /*                                    Swap                                    */
    /* -------------------------------------------------------------------------- */
    /// @inheritdoc ISCDPConfigFacet
    function setSwapFee(
        address _krAsset,
        uint16 _openFee,
        uint16 _closeFee,
        uint16 _protocolFee
    ) external onlyRole(Role.ADMIN) {
        if (_openFee > Percents.TWENTY_FIVE) {
            revert CError.INVALID_SCDP_FEE(_krAsset, _openFee, Percents.TWENTY_FIVE);
        } else if (_closeFee > Percents.TWENTY_FIVE) {
            revert CError.INVALID_SCDP_FEE(_krAsset, _closeFee, Percents.TWENTY_FIVE);
        } else if (_protocolFee > Percents.FIFTY) {
            revert CError.INVALID_PROTOCOL_FEE(_krAsset, _protocolFee, Percents.FIFTY);
        }
        cs().assets[_krAsset].swapInFeeSCDP = _openFee;
        cs().assets[_krAsset].swapOutFeeSCDP = _closeFee;
        cs().assets[_krAsset].protocolFeeShareSCDP = _protocolFee;
        emit SEvent.FeeSet(_krAsset, _openFee, _closeFee, _protocolFee);
    }

    /// @inheritdoc ISCDPConfigFacet
    function setSwapPairs(PairSetter[] calldata _pairs) external onlyRole(Role.ADMIN) {
        for (uint256 i; i < _pairs.length; i++) {
            scdp().isSwapEnabled[_pairs[i].assetIn][_pairs[i].assetOut] = _pairs[i].enabled;
            scdp().isSwapEnabled[_pairs[i].assetOut][_pairs[i].assetIn] = _pairs[i].enabled;
            emit SEvent.PairSet(_pairs[i].assetIn, _pairs[i].assetOut, _pairs[i].enabled);
            emit SEvent.PairSet(_pairs[i].assetOut, _pairs[i].assetIn, _pairs[i].enabled);
        }
    }

    /// @inheritdoc ISCDPConfigFacet
    function setSwapPairsSingle(PairSetter calldata _pair) external onlyRole(Role.ADMIN) {
        scdp().isSwapEnabled[_pair.assetIn][_pair.assetOut] = _pair.enabled;
        emit SEvent.PairSet(_pair.assetIn, _pair.assetOut, _pair.enabled);
    }
}
