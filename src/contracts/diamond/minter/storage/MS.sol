// SPDX-License-Identifier: MIT
pragma solidity =0.8.11;

import "../../../libraries/FixedPoint.sol";
import "../../../libraries/FixedPointMath.sol";
import "../../../libraries/Arrays.sol";

import {CollateralAsset, KrAsset} from "./MinterTypes.sol";

/* solhint-disable no-inline-assembly */
/* solhint-disable state-visibility */

struct MinterStorage {
    /* -------------------------------------------------------------------------- */
    /*                               Initialization                               */
    /* -------------------------------------------------------------------------- */

    /// @notice Is initialized to the main diamond

    bool initialized;
    /// @notice Current version
    uint8 version;
    /// @notice Domain field separator
    bytes32 domainSeparator;
    /* -------------------------------------------------------------------------- */

    /* -------------------------------------------------------------------------- */
    /*                           Configurable Parameters                          */
    /* -------------------------------------------------------------------------- */

    /// @notice The recipient of burn fees.
    address feeRecipient;
    /// @notice The percent fee imposed upon the value of burned krAssets, taken as collateral and sent to feeRecipient.
    FixedPoint.Unsigned burnFee;
    /// @notice The factor used to calculate the incentive a liquidator receives in the form of seized collateral.
    FixedPoint.Unsigned liquidationIncentiveMultiplier;
    /// @notice The absolute minimum ratio of collateral value to debt value used to calculate collateral requirements.
    FixedPoint.Unsigned minimumCollateralizationRatio;
    /// @notice The minimum USD value of an individual synthetic asset debt position.
    FixedPoint.Unsigned minimumDebtValue;
    /** @dev Old mapping for trusted addresses */
    mapping(address => bool) trustedContracts;
    /* -------------------------------------------------------------------------- */

    /* -------------------------------------------------------------------------- */
    /*                              Collateral Assets                             */
    /* -------------------------------------------------------------------------- */

    /// @notice Mapping of collateral asset token address to information on the collateral asset.
    mapping(address => CollateralAsset) collateralAssets;
    /**
     * @notice Mapping of account address to a mapping of collateral asset token address to the amount of the collateral
     * asset the account has deposited.
     * @dev Collateral assets must not rebase.
     */
    mapping(address => mapping(address => uint256)) collateralDeposits;
    /// @notice Mapping of account address to an array of the addresses of each collateral asset the account
    /// has deposited.
    mapping(address => address[]) depositedCollateralAssets;
    /* -------------------------------------------------------------------------- */
    /*                                Kresko Assets                               */
    /* -------------------------------------------------------------------------- */

    /// @notice Mapping of Kresko asset token address to information on the Kresko asset.
    mapping(address => KrAsset) kreskoAssets;
    /// @notice Mapping of Kresko asset symbols to whether the symbol is used by an existing Kresko asset.
    mapping(string => bool) kreskoAssetSymbols;
    /// @notice Mapping of account address to a mapping of Kresko asset token address to the amount of the Kresko asset
    /// the account has minted and therefore owes to the protocol.
    mapping(address => mapping(address => uint256)) kreskoAssetDebt;
    /// @notice Mapping of account address to an array of the addresses of each Kresko asset the account has minted.
    mapping(address => address[]) mintedKreskoAssets;
}

library MS {
    bytes32 constant MINTER_STORAGE_POSITION = keccak256("kresko.minter.storage");

    function s() internal pure returns (MinterStorage storage ms_) {
        bytes32 position = MINTER_STORAGE_POSITION;
        assembly {
            ms_.slot := position
        }
    }
}

contract MSModifiers {
    /**
     * @notice Reverts if a collateral asset does not exist within the protocol.
     * @param _collateralAsset The address of the collateral asset.
     */
    modifier collateralAssetExists(address _collateralAsset) {
        require(MS.s().collateralAssets[_collateralAsset].exists, "KR: !collateralExists");
        _;
    }

    /**
     * @notice Reverts if a collateral asset already exists within the protocol.
     * @param _collateralAsset The address of the collateral asset.
     */
    modifier collateralAssetDoesNotExist(address _collateralAsset) {
        require(!MS.s().collateralAssets[_collateralAsset].exists, "KR: collateralExists");
        _;
    }

    /**
     * @notice Reverts if a Kresko asset does not exist within the protocol or is not mintable.
     * @param _kreskoAsset The address of the Kresko asset.
     */
    modifier kreskoAssetExistsAndMintable(address _kreskoAsset) {
        MinterStorage storage ms = MS.s();
        require(ms.kreskoAssets[_kreskoAsset].exists, "KR: !krAssetExist");
        require(ms.kreskoAssets[_kreskoAsset].mintable, "KR: !krAssetMintable");
        _;
    }

    /**
     * @notice Reverts if a Kresko asset does not exist within the protocol. Does not revert if
     * the Kresko asset is not mintable.
     * @param _kreskoAsset The address of the Kresko asset.
     */
    modifier kreskoAssetExistsMaybeNotMintable(address _kreskoAsset) {
        require(MS.s().kreskoAssets[_kreskoAsset].exists, "KR: !krAssetExist");
        _;
    }

    /**
     * @notice Reverts if the symbol of a Kresko asset already exists within the protocol.
     * @param _kreskoAsset The address of the Kresko asset.
     * @param _symbol The symbol of the Kresko asset.
     */
    modifier kreskoAssetDoesNotExist(address _kreskoAsset, string calldata _symbol) {
        MinterStorage storage ms = MS.s();
        require(!ms.kreskoAssets[_kreskoAsset].exists, "KR: krAssetExists");
        require(!ms.kreskoAssetSymbols[_symbol], "KR: symbolExists");
        _;
    }

    /**
     * @notice Reverts if provided string is empty.
     * @param _str The string to ensure is not empty.
     */
    modifier nonNullString(string calldata _str) {
        require(bytes(_str).length > 0, "KR: !string");
        _;
    }
}
