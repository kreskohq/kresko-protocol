//SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

interface IERC1155 {
    function balanceOf(address account, uint256 id) external view returns (uint256);

    function balanceOfBatch(address[] memory accounts, uint256[] memory ids) external view returns (uint256[] memory balances);

    function setApprovalForAll(address operator, bool approved) external;

    function uri(uint256) external view returns (string memory);

    function contractURI() external view returns (string memory);

    function isApprovedForAll(address account, address operator) external view returns (bool);

    function storeGetByKey(uint256 _tokenId, address _account, bytes32 _key) external view returns (bytes32[] memory);

    function storeGetByIndex(uint256 _tokenId, address _account, bytes32 _key, uint256 _idx) external view returns (bytes32);

    function storeCreateValue(uint256 _tokenId, address _account, bytes32 _key, bytes32 _value) external returns (bytes32);

    function storeAppendValue(uint256 _tokenId, address _account, bytes32 _key, bytes32 _value) external returns (bytes32);

    function storeUpdateValue(uint256 _tokenId, address _account, bytes32 _key, bytes32 _value) external returns (bytes32);

    function storeClearKey(uint256 _tokenId, address _account, bytes32 _key) external returns (bool);

    function storeClearKeys(uint256 _tokenId, address _account, bytes32[] memory _keys) external returns (bool);

    function safeTransferFrom(address from, address to, uint256 id, uint256 value, bytes memory data) external;

    function mint(address _to, uint256 _tokenId, uint256 _amount, bytes memory) external;

    function mint(address _to, uint256 _tokenId, uint256 _amount) external;

    function burn(address _to, uint256 _tokenId, uint256 _amount) external;
}
