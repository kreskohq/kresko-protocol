// SPDX-License-Identifier: BUSL-1.1
pragma solidity <=0.8.20;

import {Lever} from "./Lever.sol";
import {ILeverPositions} from "./ILeverPositions.sol";
import {ONFT721Upgradeable} from "./lz/ONFT721Upgradeable.sol";

contract LeverPositions is ILeverPositions, Lever, ONFT721Upgradeable {
    uint256 public currentId;

    modifier minted(uint256 _id) {
        _requireMinted(_id);
        _;
    }

    function initialize(
        string memory _name,
        string memory _symbol,
        address _kresko,
        uint256 _minGasToTransfer,
        address _lzEndpoint
    ) external initializer {
        __ONFT721Upgradeable_init(_name, _symbol, _minGasToTransfer, _lzEndpoint);
        __Lever_init(_kresko, 5e18, 0.5e18);
    }

    /// @inheritdoc ILeverPositions
    function isLiquidatable(uint256[] calldata _ids) public view returns (bool[] memory results) {
        results = new bool[](_ids.length);
        for (uint256 i; i < _ids.length; i++) {
            results[i] = _isLiquidatableSafe(_ids[i]);
        }
    }

    /// @inheritdoc ILeverPositions
    function createPosition(Create calldata _params) external onlyKresko returns (uint256 positionId) {
        positionId = currentId++;

        _safeMint(_params.account, positionId);
        _createPosition(positionId, _params);
    }

    /// @inheritdoc ILeverPositions
    function closePosition(uint256 _id) external override minted(_id) {
        _closePosition(_id);
        _burn(_id);
    }

    /// @inheritdoc ILeverPositions
    function liquidate(uint256 _id) external override minted(_id) {
        // _liquidate(_id);
    }

    /// @inheritdoc ILeverPositions
    function deposit(uint256 _id, uint256 _collateralAmount) external override minted(_id) {
        _adjustIn(_id, _collateralAmount, 0);
    }

    /// @inheritdoc ILeverPositions
    function repay(uint256 _id, uint256 _repayAmount) external override minted(_id) {
        _adjustIn(_id, 0, _repayAmount);
    }

    /// @inheritdoc ILeverPositions
    function withdraw(uint256 _id, uint256 _collateralAmount) external override minted(_id) {
        _adjustOut(_id, _collateralAmount, 0);
    }

    /// @inheritdoc ILeverPositions
    function borrow(uint256 _id, uint256 _borrowAmount) external override minted(_id) {
        _adjustOut(_id, 0, _borrowAmount);
    }
}
