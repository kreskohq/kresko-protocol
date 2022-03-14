// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "./interfaces/IERC3156FlashBorrower.sol";

contract MockWETH10 {
    uint8 public constant decimals = 18;
    string public constant name = "Wrapped Ether";
    string public constant symbol = "WETH";
    bytes32 public immutable CALLBACK_SUCCESS = keccak256("ERC3156FlashBorrower.onFlashLoan");

    /// @dev Current amount of flash-minted WETH10 token.
    uint256 public flashMinted;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) private _allowances;

    /// @dev Returns the total supply of WETH10 token as the ETH held in this contract.
    function totalSupply() external view returns (uint256) {
        return address(this).balance + flashMinted;
    }

    /// @dev Flash lends `value` WETH10 token to the receiver address.
    /// By the end of the transaction, `value` WETH10 token will be burned from the receiver.
    /// The flash-minted WETH10 token is not backed by real ETH
    /// but can be withdrawn as such up to the ETH balance of this contract.
    /// Arbitrary data can be passed as a bytes calldata parameter.
    /// Emits {Approval} event to reflect reduced allowance `value`
    /// for this contract to spend from receiver account (`receiver`),
    /// unless allowance is set to `type(uint256).max`
    /// Returns boolean value indicating whether operation succeeded.
    /// Requirements:
    ///   - `value` must be less or equal to type(uint112).max.
    function flashLoan(
        IERC3156FlashBorrower receiver,
        address token,
        uint256 value,
        bytes calldata data
    ) external returns (bool) {
        require(token == address(this), "WETH: flash mint only WETH10");
        require(value <= type(uint112).max, "WETH: individual loan limit exceeded");

        balanceOf[address(receiver)] += value;
        require(
            receiver.onFlashLoan(msg.sender, address(this), value, 0, data) == CALLBACK_SUCCESS,
            "WETH: flash loan failed"
        );

        uint256 balance = balanceOf[address(receiver)];
        require(balance >= value, "WETH: burn amount exceeds balance");
        balanceOf[address(receiver)] = balance - value;
        return true;
    }

    function transfer(address to, uint256 value) external returns (bool) {
        uint256 balance = balanceOf[msg.sender];
        require(balance >= value, "WETH: transfer amount exceeds balance");

        balanceOf[msg.sender] = balance - value;
        balanceOf[to] += value;
        return true;
    }

    function transferFrom(
        address from,
        address to,
        uint256 value
    ) external returns (bool) {
        uint256 balance = balanceOf[from];
        require(balance >= value, "WETH: transfer amount exceeds balance");

        balanceOf[from] = balance - value;
        balanceOf[to] += value;
        return true;
    }

    // allow arbitrary values
    function deposit(uint256 _amount) external {
        balanceOf[msg.sender] += _amount;
    }

    function withdraw(uint256 _amount) external {
        balanceOf[msg.sender] -= _amount;
    }

    /**
     * @dev See {IERC20-allowance}.
     */
    function allowance(address owner, address spender) public view returns (uint256) {
        return _allowances[owner][spender];
    }

    /**
     * @dev See {IERC20-approve}.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     */
    function approve(address spender, uint256 amount) public returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }

    function _approve(
        address owner,
        address spender,
        uint256 amount
    ) internal virtual {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");

        _allowances[owner][spender] = amount;
    }
}
