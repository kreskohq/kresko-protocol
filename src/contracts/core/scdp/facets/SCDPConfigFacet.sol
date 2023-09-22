// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {SafeERC20Permit, IERC20Permit} from "vendor/SafeERC20Permit.sol";
import {Arrays} from "libs/Arrays.sol";
import {WadRay} from "libs/WadRay.sol";
import {Role} from "common/Types.sol";
import {Error} from "common/Errors.sol";
import {DSModifiers} from "diamond/Modifiers.sol";
import {ds} from "diamond/State.sol";
import {DiamondEvent} from "common/Events.sol";

import {Constants} from "minter/Constants.sol";
import {MSModifiers} from "minter/Modifiers.sol";
import {ms} from "minter/State.sol";

import {ISCDPConfigFacet} from "scdp/interfaces/ISCDPConfigFacet.sol";
import {SCDPCollateral, SCDPKrAsset, SCDPInitArgs, PairSetter} from "scdp/Types.sol";
import {scdp} from "scdp/State.sol";
import {SEvent} from "scdp/Events.sol";

contract SCDPConfigFacet is ISCDPConfigFacet, DSModifiers, MSModifiers {
    using SafeERC20Permit for IERC20Permit;
    using Arrays for address[];

    /// @inheritdoc ISCDPConfigFacet
    function initializeSCDP(SCDPInitArgs memory _init) external onlyOwner {
        require(_init.mcr >= Constants.MIN_COLLATERALIZATION_RATIO, "mcr-too-low");
        require(_init.lt >= Constants.MIN_COLLATERALIZATION_RATIO, "lt-too-low");
        require(_init.lt <= _init.mcr, "lt-too-high");
        require(_init.swapFeeRecipient != address(0), "invalid-fee-receiver");

        scdp().minCollateralRatio = _init.mcr;
        scdp().liquidationThreshold = _init.lt;
        scdp().swapFeeRecipient = _init.swapFeeRecipient;
        scdp().maxLiquidationRatio = _init.lt + Constants.BASIS_POINT;

        emit DiamondEvent.Initialized(msg.sender, ds().storageVersion++);
    }

    /// @inheritdoc ISCDPConfigFacet
    function getCurrentParametersSCDP() external view override returns (SCDPInitArgs memory) {
        return
            SCDPInitArgs({
                swapFeeRecipient: scdp().swapFeeRecipient,
                mcr: scdp().minCollateralRatio,
                lt: scdp().liquidationThreshold
            });
    }

    function setFeeAssetSCDP(address asset) external onlyRole(Role.ADMIN) {
        scdp().feeAsset = asset;
    }

    /// @inheritdoc ISCDPConfigFacet
    function setMinCollateralRatioSCDP(uint256 _mcr) external onlyRole(Role.ADMIN) {
        require(_mcr >= Constants.MIN_COLLATERALIZATION_RATIO, "mcr-too-low");
        scdp().minCollateralRatio = _mcr;
    }

    /// @inheritdoc ISCDPConfigFacet
    function setLiquidationThresholdSCDP(uint256 _lt) external onlyRole(Role.ADMIN) {
        require(_lt >= Constants.MIN_COLLATERALIZATION_RATIO, "mcr-too-low");
        require(_lt <= scdp().minCollateralRatio, "lt-too-high");
        scdp().liquidationThreshold = _lt;
        scdp().maxLiquidationRatio = _lt + Constants.ONE_PERCENT;
    }

    function setMaxLiquidationRatioSCDP(uint256 _mlr) external onlyRole(Role.ADMIN) {
        require(_mlr >= scdp().liquidationThreshold, "mlr-too-lo");
        scdp().maxLiquidationRatio = _mlr;
    }

    /// @inheritdoc ISCDPConfigFacet
    function addDepositAssetsSCDP(
        address[] calldata _depositAssets,
        SCDPCollateral[] memory _configurations
    ) external onlyRole(Role.ADMIN) {
        require(_depositAssets.length == _configurations.length, "collateral-length-mismatch");
        for (uint256 i; i < _depositAssets.length; i++) {
            address depositAsset = _depositAssets[i];
            // Checks
            require(ms().collateralAssets[depositAsset].pushedPrice().price != 0, Error.ZERO_PRICE);
            require(_configurations[i].depositLimit != 0, "krasset-supply-limit-zero");
            require(scdp().collateral[depositAsset].liquidityIndex == 0, "collateral-already-enabled");

            // We don't care what values are set for decimals or liquidityIndex. Overriding.
            _configurations[i].decimals = IERC20Permit(depositAsset).decimals();
            _configurations[i].liquidityIndex = uint128(WadRay.RAY);

            // Save to state
            scdp().collateral[depositAsset] = _configurations[i];
            scdp().isDepositEnabled[depositAsset] = true;

            // Enable the asset if it's not enabled, eg. if it's already a Kresko Asset.
            if (!scdp().isEnabled[depositAsset]) {
                scdp().isEnabled[depositAsset] = true;
                scdp().collaterals.push(depositAsset);
            }
        }
    }

    /// @inheritdoc ISCDPConfigFacet
    function addKrAssetsSCDP(
        address[] calldata _enabledKrAssets,
        SCDPKrAsset[] memory _configurations
    ) external onlyRole(Role.ADMIN) {
        require(_enabledKrAssets.length == _configurations.length, "krasset-length-mismatch");
        for (uint256 i; i < _enabledKrAssets.length; i++) {
            address enabledKrAsset = _enabledKrAssets[i];
            // Checks
            require(ms().kreskoAssets[enabledKrAsset].pushedPrice().price != 0, Error.ZERO_PRICE);
            require(scdp().krAsset[enabledKrAsset].supplyLimit == 0, "krasset-already-enabled");
            require(_configurations[i].supplyLimit > 0, "krasset-supply-limit-zero");
            require(
                _configurations[i].protocolFee <= Constants.MAX_COLLATERAL_POOL_PROTOCOL_FEE,
                "krasset-protocol-fee-too-high"
            );
            require(_configurations[i].liquidationIncentive >= Constants.MIN_LIQUIDATION_INCENTIVE_MULTIPLIER, "li-too-low");
            require(_configurations[i].liquidationIncentive <= Constants.MAX_LIQUIDATION_INCENTIVE_MULTIPLIER, "li-too-high");

            // Save to state
            scdp().krAsset[enabledKrAsset] = _configurations[i];
            scdp().krAssets.push(enabledKrAsset);

            // Enable the asset if it's not enabled. eg. if it's already a collateral.
            if (!scdp().isEnabled[enabledKrAsset]) {
                scdp().collaterals.push(enabledKrAsset); // Swap deposits count as collateral.
                scdp().isEnabled[enabledKrAsset] = true;
            }
        }
    }

    /// @inheritdoc ISCDPConfigFacet
    function updateKrAssetSCDP(address _asset, SCDPKrAsset memory _configuration) external onlyRole(Role.ADMIN) {
        require(_configuration.liquidationIncentive >= Constants.MIN_LIQUIDATION_INCENTIVE_MULTIPLIER, "li-too-low");
        require(_configuration.liquidationIncentive <= Constants.MAX_LIQUIDATION_INCENTIVE_MULTIPLIER, "li-too-high");
        scdp().krAsset[_asset] = _configuration;
    }

    /// @inheritdoc ISCDPConfigFacet
    function updateDepositLimitSCDP(address _asset, uint256 _newDepositLimit) external onlyRole(Role.ADMIN) {
        scdp().collateral[_asset].depositLimit = _newDepositLimit;
    }

    /// @inheritdoc ISCDPConfigFacet
    function enableAssetsSCDP(address[] calldata _enabledAssets, bool enableDeposits) external onlyRole(Role.ADMIN) {
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
                    if (enableDeposits) {
                        require(scdp().collateral[enabledAsset].decimals != 0, "not-deposit-asset");
                        scdp().isDepositEnabled[enabledAsset] = true;
                    }
                    didEnable = true;
                }
            }
        }

        require(didEnable, "asset-enable-not-found");
    }

    /// @inheritdoc ISCDPConfigFacet
    function disableAssetsSCDP(address[] calldata _disabledAssets, bool onlyDeposits) external onlyRole(Role.ADMIN) {
        require(_disabledAssets.length > 0, "krasset-disable-length-0");
        address[] memory enabledAssets = scdp().collaterals;
        bool didDisable;
        // Loopdy by disabled assets in.
        for (uint256 i; i < _disabledAssets.length; i++) {
            address disabledAsset = _disabledAssets[i];
            // Remove the assets from enabled list.
            for (uint256 j; j < enabledAssets.length; j++) {
                if (disabledAsset == enabledAssets[j]) {
                    scdp().isDepositEnabled[disabledAsset] = false;
                    if (!onlyDeposits) {
                        scdp().isEnabled[disabledAsset] = false;
                    }
                    didDisable = true;
                }
            }
        }
        require(didDisable, "asset-disable-not-found");
    }

    /// @inheritdoc ISCDPConfigFacet
    function removeCollateralsSCDP(address[] calldata _removedAssets) external onlyRole(Role.ADMIN) {
        require(_removedAssets.length > 0, "collateral-remove-length-0");
        address[] memory enabledCollaterals = scdp().collaterals;
        bool didRemove;
        // Loopdy by disabled assets in.
        for (uint256 i; i < _removedAssets.length; i++) {
            address removedAsset = _removedAssets[i];
            // Remove the assets from enabled list.
            for (uint256 j; j < enabledCollaterals.length; j++) {
                if (removedAsset == enabledCollaterals[j]) {
                    require(scdp().userDepositAmount(removedAsset) == 0, "remove-collateral-has-deposits");
                    scdp().collaterals.removeAddress(removedAsset, j);
                    scdp().isEnabled[removedAsset] = false;
                    scdp().isDepositEnabled[removedAsset] = false;
                    delete scdp().collateral[removedAsset];
                    didRemove = true;
                }
            }
        }
        require(didRemove, "collateral-remove-not-found");
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
                    require(scdp().debt[removedAsset] == 0, "remove-krasset-has-debt");
                    scdp().krAssets.removeAddress(removedAsset, j);
                    scdp().isEnabled[removedAsset] = false;
                    scdp().isDepositEnabled[removedAsset] = false;
                    delete scdp().krAsset[removedAsset];
                    didRemove = true;
                }
            }
        }
        require(didRemove, "krasset-remove-not-found");
    }

    /* -------------------------------------------------------------------------- */
    /*                                    Swap                                    */
    /* -------------------------------------------------------------------------- */
    /// @inheritdoc ISCDPConfigFacet
    function setSwapFee(
        address _krAsset,
        uint256 _openFee,
        uint256 _closeFee,
        uint256 _protocolFee
    ) external onlyRole(Role.ADMIN) {
        scdp().krAsset[_krAsset].openFee = _openFee;
        scdp().krAsset[_krAsset].closeFee = _closeFee;
        scdp().krAsset[_krAsset].protocolFee = _protocolFee;
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
