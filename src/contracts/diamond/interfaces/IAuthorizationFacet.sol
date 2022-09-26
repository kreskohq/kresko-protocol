// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;

interface IAuthorizationFacet {
    function getRoleAdmin(bytes32 role) external view returns (bytes32);

    function grantRole(bytes32 role, address account) external;

    function hasRole(bytes32 role, address account) external view returns (bool);

    function renounceRole(bytes32 role, address account) external;

    function revokeRole(bytes32 role, address account) external;
}
