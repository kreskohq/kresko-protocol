// SPDX-License-Identifier: BUSL-1.1
pragma solidity <=0.8.20;
import {NewPosition, Position} from "../state/PositionsStorage.sol";

interface IPositionsFacet {
    /// @notice approves kresko to spend `_asset`
    function getApprovalFor(address _asset) external;

    /// @notice removes approval for kresko to spend `_asset`
    function removeApprovalFor(address _asset) external;

    /**
     * @notice Creates a new lever position
     * @param _position The parameters of the new position
     * @return id The ID of the new position
     */
    function createPosition(NewPosition memory _position) external returns (uint256 id);

    /**
     * @notice Close a lever position
     * @param _id The ID of the position to close
     */
    function closePosition(uint256 _id) external;

    /**
     * @notice Deposit collateral into a lever position.
     * @param _id The ID of the position to deposit collateral into.
     * @param _depositAmount The amount of collateral to deposit.
     */
    function deposit(uint256 _id, uint256 _depositAmount) external;

    /**
     * @notice Withdraw collateral from a lever position
     * @param _id The ID of the position to withdraw collateral from
     * @param _withdrawAmount The amount of collateral to withdraw
     */
    function withdraw(uint256 _id, uint256 _withdrawAmount) external;

    /**
     * @notice Borrow more of the borrowed asset from a lever position
     * @param _id The ID of the position to borrow more from
     * @param _borrowAmount The amount of borrowed asset to borrow
     */
    function borrow(uint256 _id, uint256 _borrowAmount) external;

    /**
     * @notice Repay borrowed asset to a lever position
     * @param _id The ID of the position to repay borrowed asset to
     * @param _repayAmount The amount of borrowed asset to repay
     */
    function repay(uint256 _id, uint256 _repayAmount) external;

    /// @notice returns the info of a position for `_id`
    function getPosition(uint256 _id) external view returns (Position memory);

    /**
     * @notice Get the liquidatable status of a lever positions
     * @param _ids The IDs of the positions
     * @return array of liquidatable results
     */
    function isLiquidatable(uint256[] calldata _ids) external view returns (bool[] memory);

    /// @notice returns the closable status for positions
    function isClosable(uint256[] calldata _ids) external view returns (bool[] memory);
}
