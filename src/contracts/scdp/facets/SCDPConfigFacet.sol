// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {SafeERC20, IERC20Permit} from "common/SafeERC20.sol";
import {Arrays} from "common/libs/Arrays.sol";
import {WadRay} from "common/libs/WadRay.sol";

import {MinterModifiers} from "minter/MinterModifiers.sol";
import {ms} from "minter/MinterStorage.sol";
import {Constants} from "minter/MinterTypes.sol";
import {DiamondModifiers, Role} from "diamond/DiamondModifiers.sol";

import {scdp} from "../SCDPStorage.sol";
import {ISCDPConfigFacet, PoolCollateral, PoolKrAsset} from "../interfaces/ISCDPConfigFacet.sol";

contract SCDPConfigFacet is ISCDPConfigFacet, DiamondModifiers, MinterModifiers {
    using SafeERC20 for IERC20Permit;
    using Arrays for address[];

    /// @inheritdoc ISCDPConfigFacet
    function initialize(CollateralPoolConfig memory _config) external onlyOwner {
        require(_config.mcr >= Constants.MIN_COLLATERALIZATION_RATIO, "mcr-too-low");
        require(_config.lt >= Constants.MIN_COLLATERALIZATION_RATIO, "lt-too-low");
        require(_config.lt <= _config.mcr, "lt-too-high");
        require(_config.swapFeeRecipient != address(0), "invalid-fee-receiver");

        scdp().minimumCollateralizationRatio = _config.mcr;
        scdp().liquidationThreshold = _config.lt;
        scdp().swapFeeRecipient = _config.swapFeeRecipient;
    }

    /// @inheritdoc ISCDPConfigFacet
    function getCollateralPoolConfig() external view override returns (CollateralPoolConfig memory) {
        return
            CollateralPoolConfig({
                swapFeeRecipient: scdp().swapFeeRecipient,
                mcr: scdp().minimumCollateralizationRatio,
                lt: scdp().liquidationThreshold
            });
    }

    /// @inheritdoc ISCDPConfigFacet
    function setPoolMinimumCollateralizationRatio(uint256 _mcr) external onlyRole(Role.ADMIN) {
        require(_mcr >= Constants.MIN_COLLATERALIZATION_RATIO, "mcr-too-low");
        scdp().minimumCollateralizationRatio = _mcr;
    }

    /// @inheritdoc ISCDPConfigFacet
    function setPoolLiquidationThreshold(uint256 _lt) external onlyRole(Role.ADMIN) {
        require(_lt >= Constants.MIN_COLLATERALIZATION_RATIO, "mcr-too-low");
        require(_lt <= scdp().minimumCollateralizationRatio, "lt-too-high");
        scdp().liquidationThreshold = _lt;
    }

    /// @inheritdoc ISCDPConfigFacet
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
            require(_configurations[i].depositLimit > 0, "krasset-supply-limit-zero");
            require(
                _configurations[i].liquidationIncentive <= Constants.MAX_LIQUIDATION_INCENTIVE_MULTIPLIER,
                "li-too-high"
            );
            require(scdp().poolCollateral[_enabledCollaterals[i]].liquidityIndex == 0, "collateral-already-enabled");

            // We don't care what values are set for decimals or liquidityIndex. Overriding.
            _configurations[i].decimals = IERC20Permit(_enabledCollaterals[i]).decimals();
            _configurations[i].liquidityIndex = uint128(WadRay.RAY);

            // Save to state
            scdp().poolCollateral[_enabledCollaterals[i]] = _configurations[i];
            scdp().isEnabled[_enabledCollaterals[i]] = true;
            scdp().collaterals.push(_enabledCollaterals[i]);
        }
    }

    /// @inheritdoc ISCDPConfigFacet
    function enablePoolKrAssets(
        address[] calldata _enabledKrAssets,
        PoolKrAsset[] memory _configurations
    ) external onlyRole(Role.ADMIN) {
        require(_enabledKrAssets.length == _configurations.length, "krasset-length-mismatch");
        for (uint256 i; i < _enabledKrAssets.length; i++) {
            // Checks
            require(ms().kreskoAssets[_enabledKrAssets[i]].uintPrice() != 0, "krasset-no-price");
            require(scdp().poolKrAsset[_enabledKrAssets[i]].supplyLimit == 0, "krasset-already-enabled");
            require(_configurations[i].supplyLimit > 0, "krasset-supply-limit-zero");
            require(
                _configurations[i].protocolFee <= Constants.MAX_COLLATERAL_POOL_PROTOCOL_FEE,
                "krasset-protocol-fee-too-high"
            );

            // Save to state
            scdp().poolKrAsset[_enabledKrAssets[i]] = _configurations[i];
            scdp().isEnabled[_enabledKrAssets[i]] = true;
            scdp().krAssets.push(_enabledKrAssets[i]);
        }
    }

    /// @inheritdoc ISCDPConfigFacet
    function updatePoolKrAsset(address _asset, PoolKrAsset calldata _configuration) external onlyRole(Role.ADMIN) {
        scdp().poolKrAsset[_asset] = _configuration;
    }

    /// @inheritdoc ISCDPConfigFacet
    function updatePoolCollateral(
        address _asset,
        uint256 _newLiquiditationIncentive,
        uint256 _newDepositLimit
    ) external onlyRole(Role.ADMIN) {
        require(_newLiquiditationIncentive >= Constants.MIN_LIQUIDATION_INCENTIVE_MULTIPLIER, "li-too-low");
        require(_newLiquiditationIncentive <= Constants.MAX_LIQUIDATION_INCENTIVE_MULTIPLIER, "li-too-high");
        scdp().poolCollateral[_asset].liquidationIncentive = _newLiquiditationIncentive;
        scdp().poolCollateral[_asset].depositLimit = _newDepositLimit;
    }

    /// @inheritdoc ISCDPConfigFacet
    function disablePoolCollaterals(address[] calldata _disabledAssets) external onlyRole(Role.ADMIN) {
        require(_disabledAssets.length > 0, "collateral-disable-length-0");
        address[] memory enabledCollaterals = scdp().collaterals;
        bool didDisable;
        // Loopdy by disabled assets in.
        for (uint256 i; i < _disabledAssets.length; i++) {
            address disabledAsset = _disabledAssets[i];
            // Remove the assets from enabled list.
            for (uint256 j; j < enabledCollaterals.length; j++) {
                if (disabledAsset == enabledCollaterals[j]) {
                    scdp().isEnabled[disabledAsset] = false;
                    didDisable = true;
                }
            }
        }
        require(didDisable, "collateral-disable-not-found");
    }

    /// @inheritdoc ISCDPConfigFacet
    function disablePoolKrAssets(address[] calldata _disabledAssets) external onlyRole(Role.ADMIN) {
        require(_disabledAssets.length > 0, "krasset-disable-length-0");
        address[] memory enabledKrAssets = scdp().krAssets;
        bool didDisable;
        // Loopdy by disabled assets in.
        for (uint256 i; i < _disabledAssets.length; i++) {
            address disabledAsset = _disabledAssets[i];
            // Remove the assets from enabled list.
            for (uint256 j; j < enabledKrAssets.length; j++) {
                if (disabledAsset == enabledKrAssets[j]) {
                    scdp().isEnabled[disabledAsset] = false;
                    didDisable = true;
                }
            }
        }
        require(didDisable, "krasset-disable-not-found");
    }

    /// @inheritdoc ISCDPConfigFacet
    function removePoolCollaterals(address[] calldata _removedAssets) external onlyRole(Role.ADMIN) {
        require(_removedAssets.length > 0, "collateral-remove-length-0");
        address[] memory enabledCollaterals = scdp().collaterals;
        bool didRemove;
        // Loopdy by disabled assets in.
        for (uint256 i; i < _removedAssets.length; i++) {
            address removedAsset = _removedAssets[i];
            // Remove the assets from enabled list.
            for (uint256 j; j < enabledCollaterals.length; j++) {
                if (removedAsset == enabledCollaterals[j]) {
                    require(scdp().totalDeposits[removedAsset] == 0, "remove-collateral-has-deposits");
                    scdp().isEnabled[removedAsset] = false;
                    scdp().collaterals.removeAddress(removedAsset, j);
                    didRemove = true;
                }
            }
        }
        require(didRemove, "collateral-remove-not-found");
    }

    /// @inheritdoc ISCDPConfigFacet
    function removePoolKrAssets(address[] calldata _removedAssets) external onlyRole(Role.ADMIN) {
        require(_removedAssets.length > 0, "krasset-disable-length-0");
        address[] memory enabledKrAssets = scdp().krAssets;
        bool didRemove;
        // Loopdy by disabled assets in.
        for (uint256 i; i < _removedAssets.length; i++) {
            address removedAsset = _removedAssets[i];
            scdp().isEnabled[removedAsset] = false;
            // Remove the assets from enabled list.
            for (uint256 j; j < enabledKrAssets.length; j++) {
                if (removedAsset == enabledKrAssets[j]) {
                    // Make sure the asset has no debt.
                    require(scdp().debt[removedAsset] == 0, "remove-krasset-has-debt");
                    scdp().krAssets.removeAddress(removedAsset, j);
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
    function setFees(
        address _krAsset,
        uint256 _openFee,
        uint256 _closeFee,
        uint256 _protocolFee
    ) external onlyRole(Role.ADMIN) {
        scdp().poolKrAsset[_krAsset].openFee = _openFee;
        scdp().poolKrAsset[_krAsset].closeFee = _closeFee;
        scdp().poolKrAsset[_krAsset].protocolFee = _protocolFee;
        emit FeeSet(_krAsset, _openFee, _closeFee, _protocolFee);
    }

    /// @inheritdoc ISCDPConfigFacet
    function setSwapPairs(PairSetter[] calldata _pairs) external onlyRole(Role.ADMIN) {
        for (uint256 i; i < _pairs.length; i++) {
            scdp().isSwapEnabled[_pairs[i].assetIn][_pairs[i].assetOut] = _pairs[i].enabled;
            scdp().isSwapEnabled[_pairs[i].assetOut][_pairs[i].assetIn] = _pairs[i].enabled;
            emit PairSet(_pairs[i].assetIn, _pairs[i].assetOut, _pairs[i].enabled);
            emit PairSet(_pairs[i].assetOut, _pairs[i].assetIn, _pairs[i].enabled);
        }
    }

    /// @inheritdoc ISCDPConfigFacet
    function setSwapPairsSingle(PairSetter calldata _pair) external onlyRole(Role.ADMIN) {
        scdp().isSwapEnabled[_pair.assetIn][_pair.assetOut] = _pair.enabled;
        emit PairSet(_pair.assetIn, _pair.assetOut, _pair.enabled);
    }
}
