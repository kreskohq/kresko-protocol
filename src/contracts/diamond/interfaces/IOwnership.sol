// SPDX-License-Identifier: MIT
pragma solidity 0.8.14;

/// @title Contract Ownership
interface IOwnership {
    /// @dev Pending contract ownership transfer is initiated.
    event PendingOwnershipTransfer(address indexed previousOwner, address indexed newOwner);
    /// @dev Ownership of a contract is transferred
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /// @notice Get the address of the owner
    /// @return owner_ The address of the owner.
    function owner() external view returns (address owner_);

    /// @notice Get the address of pending owner
    /// @return pendingOwner_ The address of the pending owner.
    function pendingOwner() external view returns (address pendingOwner_);

    /// @notice Set the address of the new pending owner of the contract
    /// @param _newOwner The address of the pending owner
    function transferOwnership(address _newOwner) external;

    /// @notice Change the ownership of the contract to the pending owner
    function acceptOwnership() external;
}
