// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {SafeERC20, IERC20Permit} from "../../../shared/SafeERC20.sol";
import {MinterModifiers} from "../../../minter/MinterModifiers.sol";
import {DiamondModifiers, Role} from "../../../diamond/DiamondModifiers.sol";
import {ms} from "../../MinterStorage.sol";
import {cps} from "../CollateralPoolState.sol";
import {Constants} from "../../MinterTypes.sol";
import {Arrays} from "../../../libs/Arrays.sol";
import {WadRay} from "../../../libs/WadRay.sol";
import {ICollateralPoolConfigFacet, PoolCollateral, PoolKrAsset} from "../interfaces/ICollateralPoolConfigFacet.sol";

contract CollateralPoolConfigFacet is ICollateralPoolConfigFacet, DiamondModifiers, MinterModifiers {
    using SafeERC20 for IERC20Permit;
    using Arrays for address[];

    /// @inheritdoc ICollateralPoolConfigFacet
    function initialize(CollateralPoolConfig memory _config) external onlyOwner {
        require(_config.mcr >= Constants.MIN_COLLATERALIZATION_RATIO, "mcr-too-low");
        require(_config.lt >= Constants.MIN_COLLATERALIZATION_RATIO, "lt-too-low");
        require(_config.lt <= _config.mcr, "lt-too-high");
        require(_config.swapFeeRecipient != address(0), "invalid-fee-receiver");
        require(address(_config.positions) != address(0), "invalid-positions");

        cps().minimumCollateralizationRatio = _config.mcr;
        cps().liquidationThreshold = _config.lt;
        cps().swapFeeRecipient = _config.swapFeeRecipient;
        cps().positions = _config.positions;
    }

    /// @inheritdoc ICollateralPoolConfigFacet
    function getCollateralPoolConfig() external view override returns (CollateralPoolConfig memory) {
        return
            CollateralPoolConfig({
                swapFeeRecipient: cps().swapFeeRecipient,
                mcr: cps().minimumCollateralizationRatio,
                lt: cps().liquidationThreshold,
                positions: cps().positions
            });
    }

    /// @inheritdoc ICollateralPoolConfigFacet
    function setPoolMinimumCollateralizationRatio(uint256 _mcr) external onlyRole(Role.ADMIN) {
        require(_mcr >= Constants.MIN_COLLATERALIZATION_RATIO, "mcr-too-low");
        cps().minimumCollateralizationRatio = _mcr;
    }

    /// @inheritdoc ICollateralPoolConfigFacet
    function setPoolLiquidationThreshold(uint256 _lt) external onlyRole(Role.ADMIN) {
        require(_lt >= Constants.MIN_COLLATERALIZATION_RATIO, "mcr-too-low");
        require(_lt <= cps().minimumCollateralizationRatio, "lt-too-high");
        cps().liquidationThreshold = _lt;
    }

    /// @inheritdoc ICollateralPoolConfigFacet
    function enablePoolCollaterals(
        address[] calldata _enabledCollaterals,
        PoolCollateral[] memory _configurations
    ) external onlyRole(Role.ADMIN) {
        require(_enabledCollaterals.length == _configurations.length, "collateral-length-mismatch");
        for (uint256 i; i < _enabledCollaterals.length; i++) {
            // Checks
            require(ms().collateralAssets[_enabledCollaterals[i]].uintPrice() != 0, "collateral-no-price");
            require(
                _configurations[i].liquidationIncentive >= Constants.MIN_LIQUIDATION_INCENTIVE_MULTIPLIER,
                "li-too-low"
            );
            require(
                _configurations[i].liquidationIncentive <= Constants.MAX_LIQUIDATION_INCENTIVE_MULTIPLIER,
                "li-too-high"
            );
            require(cps().poolCollateral[_enabledCollaterals[i]].liquidityIndex == 0, "collateral-already-enabled");

            // We don't care what values are set for decimals or liquidityIndex. Overriding.
            _configurations[i].decimals = IERC20Permit(_enabledCollaterals[i]).decimals();
            _configurations[i].liquidityIndex = uint128(WadRay.RAY);

            // Save to state
            cps().poolCollateral[_enabledCollaterals[i]] = _configurations[i];
            cps().isEnabled[_enabledCollaterals[i]] = true;
            cps().collaterals.push(_enabledCollaterals[i]);
        }
    }

    /// @inheritdoc ICollateralPoolConfigFacet
    function enablePoolKrAssets(
        address[] calldata _enabledKrAssets,
        PoolKrAsset[] memory _configurations
    ) external onlyRole(Role.ADMIN) {
        require(_enabledKrAssets.length == _configurations.length, "krasset-length-mismatch");
        for (uint256 i; i < _enabledKrAssets.length; i++) {
            // Checks
            require(ms().kreskoAssets[_enabledKrAssets[i]].uintPrice() != 0, "krasset-no-price");
            require(cps().poolKrAsset[_enabledKrAssets[i]].supplyLimit == 0, "krasset-already-enabled");
            require(_configurations[i].supplyLimit > 0, "krasset-supply-limit-zero");
            require(
                _configurations[i].protocolFee <= Constants.MAX_COLLATERAL_POOL_PROTOCOL_FEE,
                "krasset-protocol-fee-too-high"
            );

            // Save to state
            cps().poolKrAsset[_enabledKrAssets[i]] = _configurations[i];
            cps().isEnabled[_enabledKrAssets[i]] = true;
            cps().krAssets.push(_enabledKrAssets[i]);
        }
    }

    /// @inheritdoc ICollateralPoolConfigFacet
    function updatePoolKrAsset(address _asset, PoolKrAsset calldata _configuration) external onlyRole(Role.ADMIN) {
        cps().poolKrAsset[_asset] = _configuration;
    }

    /// @inheritdoc ICollateralPoolConfigFacet
    function updatePoolCollateral(address _asset, uint256 _newLiquiditationIncentive) external onlyRole(Role.ADMIN) {
        require(_newLiquiditationIncentive >= Constants.MIN_LIQUIDATION_INCENTIVE_MULTIPLIER, "li-too-low");
        require(_newLiquiditationIncentive <= Constants.MAX_LIQUIDATION_INCENTIVE_MULTIPLIER, "li-too-high");
        cps().poolCollateral[_asset].liquidationIncentive = _newLiquiditationIncentive;
    }

    /// @inheritdoc ICollateralPoolConfigFacet
    function disablePoolCollaterals(address[] calldata _disabledAssets) external onlyRole(Role.ADMIN) {
        require(_disabledAssets.length > 0, "collateral-disable-length-0");
        address[] memory enabledCollaterals = cps().collaterals;
        bool didDisable;
        // Loopdy by disabled assets in.
        for (uint256 i; i < _disabledAssets.length; i++) {
            address disabledAsset = _disabledAssets[i];
            // Remove the assets from enabled list.
            for (uint256 j; j < enabledCollaterals.length; j++) {
                if (disabledAsset == enabledCollaterals[j]) {
                    cps().isEnabled[disabledAsset] = false;
                    didDisable = true;
                }
            }
        }
        require(didDisable, "collateral-disable-not-found");
    }

    /// @inheritdoc ICollateralPoolConfigFacet
    function disablePoolKrAssets(address[] calldata _disabledAssets) external onlyRole(Role.ADMIN) {
        require(_disabledAssets.length > 0, "krasset-disable-length-0");
        address[] memory enabledKrAssets = cps().krAssets;
        bool didDisable;
        // Loopdy by disabled assets in.
        for (uint256 i; i < _disabledAssets.length; i++) {
            address disabledAsset = _disabledAssets[i];
            // Remove the assets from enabled list.
            for (uint256 j; j < enabledKrAssets.length; j++) {
                if (disabledAsset == enabledKrAssets[j]) {
                    cps().isEnabled[disabledAsset] = false;
                    didDisable = true;
                }
            }
        }
        require(didDisable, "krasset-disable-not-found");
    }

    /// @inheritdoc ICollateralPoolConfigFacet
    function removePoolCollaterals(address[] calldata _removedAssets) external onlyRole(Role.ADMIN) {
        require(_removedAssets.length > 0, "collateral-remove-length-0");
        address[] memory enabledCollaterals = cps().collaterals;
        bool didRemove;
        // Loopdy by disabled assets in.
        for (uint256 i; i < _removedAssets.length; i++) {
            address removedAsset = _removedAssets[i];
            // Remove the assets from enabled list.
            for (uint256 j; j < enabledCollaterals.length; j++) {
                if (removedAsset == enabledCollaterals[j]) {
                    require(cps().totalDeposits[removedAsset] == 0, "remove-collateral-has-deposits");
                    cps().isEnabled[removedAsset] = false;
                    cps().collaterals.removeAddress(removedAsset, j);
                    didRemove = true;
                }
            }
        }
        require(didRemove, "collateral-remove-not-found");
    }

    /// @inheritdoc ICollateralPoolConfigFacet
    function removePoolKrAssets(address[] calldata _removedAssets) external onlyRole(Role.ADMIN) {
        require(_removedAssets.length > 0, "krasset-disable-length-0");
        address[] memory enabledKrAssets = cps().krAssets;
        bool didRemove;
        // Loopdy by disabled assets in.
        for (uint256 i; i < _removedAssets.length; i++) {
            address removedAsset = _removedAssets[i];
            cps().isEnabled[removedAsset] = false;
            // Remove the assets from enabled list.
            for (uint256 j; j < enabledKrAssets.length; j++) {
                if (removedAsset == enabledKrAssets[j]) {
                    // Make sure the asset has no debt.
                    require(cps().debt[removedAsset] == 0, "remove-krasset-has-debt");
                    cps().krAssets.removeAddress(removedAsset, j);
                    didRemove = true;
                }
            }
        }
        require(didRemove, "krasset-remove-not-found");
    }

    /* -------------------------------------------------------------------------- */
    /*                                    Swap                                    */
    /* -------------------------------------------------------------------------- */
    /// @inheritdoc ICollateralPoolConfigFacet
    function setFees(
        address _krAsset,
        uint256 _openFee,
        uint256 _closeFee,
        uint256 _protocolFee
    ) external onlyRole(Role.ADMIN) {
        cps().poolKrAsset[_krAsset].openFee = _openFee;
        cps().poolKrAsset[_krAsset].closeFee = _closeFee;
        cps().poolKrAsset[_krAsset].protocolFee = _protocolFee;
        emit FeeSet(_krAsset, _openFee, _closeFee, _protocolFee);
    }

    /// @inheritdoc ICollateralPoolConfigFacet
    function setSwapPairs(PairSetter[] calldata _pairs) external onlyRole(Role.ADMIN) {
        for (uint256 i; i < _pairs.length; i++) {
            cps().isSwapEnabled[_pairs[i].assetIn][_pairs[i].assetOut] = _pairs[i].enabled;
            cps().isSwapEnabled[_pairs[i].assetOut][_pairs[i].assetIn] = _pairs[i].enabled;
            emit PairSet(_pairs[i].assetIn, _pairs[i].assetOut, _pairs[i].enabled);
            emit PairSet(_pairs[i].assetOut, _pairs[i].assetIn, _pairs[i].enabled);
        }
    }

    /// @inheritdoc ICollateralPoolConfigFacet
    function setSwapPairsSingle(PairSetter calldata _pair) external onlyRole(Role.ADMIN) {
        cps().isSwapEnabled[_pair.assetIn][_pair.assetOut] = _pair.enabled;
        emit PairSet(_pair.assetIn, _pair.assetOut, _pair.enabled);
    }
}
