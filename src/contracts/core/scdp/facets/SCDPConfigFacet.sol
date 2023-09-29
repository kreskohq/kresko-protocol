// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {SafeERC20Permit, IERC20Permit} from "vendor/SafeERC20Permit.sol";
import {Arrays} from "libs/Arrays.sol";
import {DSModifiers} from "diamond/Modifiers.sol";
import {ds} from "diamond/State.sol";

import {Role} from "common/Types.sol";
import {DiamondEvent} from "common/Events.sol";
import {CModifiers} from "common/Modifiers.sol";
import {cs} from "common/State.sol";
import {Percents} from "common/Constants.sol";
import {CError} from "common/Errors.sol";
import {MEvent} from "minter/Events.sol";

import {ISCDPConfigFacet} from "scdp/interfaces/ISCDPConfigFacet.sol";
import {SCDPInitArgs, PairSetter} from "scdp/Types.sol";
import {scdp} from "scdp/State.sol";
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
        }
        scdp().minCollateralRatio = _init.minCollateralRatio;
        scdp().liquidationThreshold = _init.liquidationThreshold;
        scdp().swapFeeRecipient = _init.swapFeeRecipient;
        scdp().maxLiquidationRatio = _init.liquidationThreshold + Percents.ONE;

        emit DiamondEvent.Initialized(msg.sender, ds().storageVersion++);
    }

    /// @inheritdoc ISCDPConfigFacet
    function getCurrentParametersSCDP() external view override returns (SCDPInitArgs memory) {
        return
            SCDPInitArgs({
                swapFeeRecipient: scdp().swapFeeRecipient,
                minCollateralRatio: scdp().minCollateralRatio,
                liquidationThreshold: scdp().liquidationThreshold
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
    function enableAssetsSCDP(address[] calldata _enabledAssets, bool _enableAsDepositAsset) external onlyRole(Role.ADMIN) {
        require(_enabledAssets.length > 0, "collateral-disable-length-0");
        address[] memory enabledAssets = scdp().collaterals;
        bool didEnable;
        // Loopdy by disabled assets in.
        for (uint256 i; i < _enabledAssets.length; i++) {
            address enabledAsset = _enabledAssets[i];
            // Remove the assets from enabled list.
            for (uint256 j; j < enabledAssets.length; j++) {
                if (enabledAsset == enabledAssets[j]) {
                    scdp().isEnabled[enabledAsset] = true;
                    if (_enableAsDepositAsset) {
                        require(cs().assets[enabledAsset].decimals != 0, "!depositable");
                        cs().assets[enabledAsset].isSCDPDepositAsset = true;
                    }
                    didEnable = true;
                }
            }
        }

        require(didEnable, "!enabled");
    }

    /// @inheritdoc ISCDPConfigFacet
    function disableAssetsSCDP(address[] calldata _disabledAssets, bool _disableDepositsOnly) external onlyRole(Role.ADMIN) {
        require(_disabledAssets.length > 0, "array");
        address[] memory enabledAssets = scdp().collaterals;
        bool didDisable;
        // Loopdy by disabled assets in.
        for (uint256 i; i < _disabledAssets.length; i++) {
            address disabledAsset = _disabledAssets[i];
            // Remove the assets from enabled list.
            for (uint256 j; j < enabledAssets.length; j++) {
                if (disabledAsset == enabledAssets[j]) {
                    cs().assets[disabledAsset].isSCDPDepositAsset = false;
                    if (!_disableDepositsOnly) {
                        scdp().isEnabled[disabledAsset] = false;
                    }
                    didDisable = true;
                }
            }
        }
        require(didDisable, "!disabled");
    }

    /// @inheritdoc ISCDPConfigFacet
    function removeCollateralsSCDP(address[] calldata _removedAssets) external onlyRole(Role.ADMIN) {
        require(_removedAssets.length > 0, "array");
        address[] memory enabledCollaterals = scdp().collaterals;
        bool didRemove;
        // Loopdy by disabled assets in.
        for (uint256 i; i < _removedAssets.length; i++) {
            address removedAsset = _removedAssets[i];
            // Remove the assets from enabled list.
            for (uint256 j; j < enabledCollaterals.length; j++) {
                if (removedAsset == enabledCollaterals[j]) {
                    require(scdp().userDepositAmount(removedAsset, cs().assets[removedAsset]) == 0, "deposits");
                    scdp().collaterals.removeAddress(removedAsset, j);
                    scdp().isEnabled[removedAsset] = false;
                    cs().assets[removedAsset].isSCDPDepositAsset = false;
                    didRemove = true;
                }
            }
        }
        require(didRemove, "!removed");
    }

    /// @inheritdoc ISCDPConfigFacet
    function removeKrAssetsSCDP(address[] calldata _removedAssets) external onlyRole(Role.ADMIN) {
        require(_removedAssets.length > 0, "krasset-disable-length-0");
        address[] memory enabledKrAssets = scdp().krAssets;
        bool didRemove;
        // Loopdy by disabled assets in.
        for (uint256 i; i < _removedAssets.length; i++) {
            address removedAsset = _removedAssets[i];

            // Remove the assets from enabled list.
            for (uint256 j; j < enabledKrAssets.length; j++) {
                if (removedAsset == enabledKrAssets[j]) {
                    // Make sure the asset has no debt.
                    require(scdp().assetData[removedAsset].debt == 0, "debt");
                    scdp().krAssets.removeAddress(removedAsset, j);
                    scdp().isEnabled[removedAsset] = false;
                    cs().assets[removedAsset].isSCDPDepositAsset = false;
                    didRemove = true;
                }
            }
        }
        require(didRemove, "!removed");
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
