// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19;

contract Deployer {
    function getAddress(bytes32 salt) external view returns (address) {
        return CREATE3.getDeployed(salt);
    }

    function deploy(bytes32 _salt, bytes memory _creationCode) external returns (address) {
        return CREATE3.deploy(_salt, _creationCode, 0);
    }

    function deployCreate2(uint256 _salt, bytes memory _creationCode) external returns (address addr, bytes32 codehash) {
        assembly {
            addr := create2(0, add(_creationCode, 0x20), mload(_creationCode), _salt)
            if iszero(extcodesize(addr)) {
                revert(0, 0)
            }
            codehash := extcodehash(addr)
        }
    }

    function getCreate2Address(uint256 _salt, bytes memory _creationCode) public view returns (address) {
        bytes32 hash = keccak256(abi.encodePacked(bytes1(0xff), address(this), _salt, keccak256(_creationCode)));

        // NOTE: cast last 20 bytes of hash to address
        return address(uint160(uint(hash)));
    }
}
