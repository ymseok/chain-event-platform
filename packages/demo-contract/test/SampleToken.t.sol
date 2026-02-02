// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {SampleToken} from "../src/SampleToken.sol";

contract SampleTokenTest is Test {
    SampleToken public token;

    address public owner;
    address public alice;
    address public bob;

    uint256 public constant INITIAL_SUPPLY = 1_000_000 ether;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    function setUp() public {
        owner = makeAddr("owner");
        alice = makeAddr("alice");
        bob = makeAddr("bob");

        vm.prank(owner);
        token = new SampleToken("Sample Token", "SAMPLE", INITIAL_SUPPLY);
    }

    // ============ Constructor Tests ============

    function test_Constructor_SetsNameCorrectly() public view {
        assertEq(token.name(), "Sample Token");
    }

    function test_Constructor_SetsSymbolCorrectly() public view {
        assertEq(token.symbol(), "SAMPLE");
    }

    function test_Constructor_SetsDecimalsCorrectly() public view {
        assertEq(token.decimals(), 18);
    }

    function test_Constructor_SetsTotalSupplyCorrectly() public view {
        assertEq(token.totalSupply(), INITIAL_SUPPLY);
    }

    function test_Constructor_MintsInitialSupplyToOwner() public view {
        assertEq(token.balanceOf(owner), INITIAL_SUPPLY);
    }

    function test_Constructor_SetsOwnerCorrectly() public view {
        assertEq(token.owner(), owner);
    }

    // ============ Transfer Tests ============

    function test_Transfer_Success() public {
        uint256 amount = 100 ether;

        vm.prank(owner);
        bool success = token.transfer(alice, amount);

        assertTrue(success);
        assertEq(token.balanceOf(owner), INITIAL_SUPPLY - amount);
        assertEq(token.balanceOf(alice), amount);
    }

    function test_Transfer_EmitsTransferEvent() public {
        uint256 amount = 100 ether;

        vm.expectEmit(true, true, false, true);
        emit Transfer(owner, alice, amount);

        vm.prank(owner);
        token.transfer(alice, amount);
    }

    function test_Transfer_RevertsWhenInsufficientBalance() public {
        uint256 amount = INITIAL_SUPPLY + 1;

        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(
                SampleToken.ERC20InsufficientBalance.selector,
                owner,
                INITIAL_SUPPLY,
                amount
            )
        );
        token.transfer(alice, amount);
    }

    function test_Transfer_RevertsWhenToZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(SampleToken.ERC20InvalidReceiver.selector, address(0))
        );
        token.transfer(address(0), 100 ether);
    }

    function test_Transfer_ZeroAmount() public {
        vm.prank(owner);
        bool success = token.transfer(alice, 0);

        assertTrue(success);
        assertEq(token.balanceOf(owner), INITIAL_SUPPLY);
        assertEq(token.balanceOf(alice), 0);
    }

    // ============ Approve Tests ============

    function test_Approve_Success() public {
        uint256 amount = 100 ether;

        vm.prank(owner);
        bool success = token.approve(alice, amount);

        assertTrue(success);
        assertEq(token.allowance(owner, alice), amount);
    }

    function test_Approve_EmitsApprovalEvent() public {
        uint256 amount = 100 ether;

        vm.expectEmit(true, true, false, true);
        emit Approval(owner, alice, amount);

        vm.prank(owner);
        token.approve(alice, amount);
    }

    function test_Approve_RevertsWhenSpenderIsZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(SampleToken.ERC20InvalidSpender.selector, address(0))
        );
        token.approve(address(0), 100 ether);
    }

    function test_Approve_CanUpdateAllowance() public {
        vm.startPrank(owner);
        token.approve(alice, 100 ether);
        assertEq(token.allowance(owner, alice), 100 ether);

        token.approve(alice, 200 ether);
        assertEq(token.allowance(owner, alice), 200 ether);
        vm.stopPrank();
    }

    // ============ TransferFrom Tests ============

    function test_TransferFrom_Success() public {
        uint256 approveAmount = 100 ether;
        uint256 transferAmount = 50 ether;

        vm.prank(owner);
        token.approve(alice, approveAmount);

        vm.prank(alice);
        bool success = token.transferFrom(owner, bob, transferAmount);

        assertTrue(success);
        assertEq(token.balanceOf(owner), INITIAL_SUPPLY - transferAmount);
        assertEq(token.balanceOf(bob), transferAmount);
        assertEq(token.allowance(owner, alice), approveAmount - transferAmount);
    }

    function test_TransferFrom_EmitsTransferEvent() public {
        uint256 amount = 50 ether;

        vm.prank(owner);
        token.approve(alice, 100 ether);

        vm.expectEmit(true, true, false, true);
        emit Transfer(owner, bob, amount);

        vm.prank(alice);
        token.transferFrom(owner, bob, amount);
    }

    function test_TransferFrom_RevertsWhenInsufficientAllowance() public {
        uint256 approveAmount = 50 ether;
        uint256 transferAmount = 100 ether;

        vm.prank(owner);
        token.approve(alice, approveAmount);

        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(
                SampleToken.ERC20InsufficientAllowance.selector,
                alice,
                approveAmount,
                transferAmount
            )
        );
        token.transferFrom(owner, bob, transferAmount);
    }

    function test_TransferFrom_MaxAllowanceDoesNotDecrease() public {
        vm.prank(owner);
        token.approve(alice, type(uint256).max);

        vm.prank(alice);
        token.transferFrom(owner, bob, 100 ether);

        assertEq(token.allowance(owner, alice), type(uint256).max);
    }

    // ============ Mint Tests ============

    function test_Mint_Success() public {
        uint256 amount = 100 ether;

        vm.prank(owner);
        token.mint(alice, amount);

        assertEq(token.balanceOf(alice), amount);
        assertEq(token.totalSupply(), INITIAL_SUPPLY + amount);
    }

    function test_Mint_EmitsTransferEvent() public {
        uint256 amount = 100 ether;

        vm.expectEmit(true, true, false, true);
        emit Transfer(address(0), alice, amount);

        vm.prank(owner);
        token.mint(alice, amount);
    }

    function test_Mint_RevertsWhenNotOwner() public {
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(SampleToken.OwnableUnauthorizedAccount.selector, alice)
        );
        token.mint(alice, 100 ether);
    }

    function test_Mint_RevertsWhenToZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(SampleToken.ERC20InvalidReceiver.selector, address(0))
        );
        token.mint(address(0), 100 ether);
    }

    // ============ Burn Tests ============

    function test_Burn_Success() public {
        uint256 amount = 100 ether;

        vm.prank(owner);
        token.burn(amount);

        assertEq(token.balanceOf(owner), INITIAL_SUPPLY - amount);
        assertEq(token.totalSupply(), INITIAL_SUPPLY - amount);
    }

    function test_Burn_EmitsTransferEvent() public {
        uint256 amount = 100 ether;

        vm.expectEmit(true, true, false, true);
        emit Transfer(owner, address(0), amount);

        vm.prank(owner);
        token.burn(amount);
    }

    function test_Burn_RevertsWhenInsufficientBalance() public {
        uint256 amount = INITIAL_SUPPLY + 1;

        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(
                SampleToken.ERC20InsufficientBalance.selector,
                owner,
                INITIAL_SUPPLY,
                amount
            )
        );
        token.burn(amount);
    }

    // ============ Fuzz Tests ============

    function testFuzz_Transfer(uint256 amount) public {
        amount = bound(amount, 0, INITIAL_SUPPLY);

        vm.prank(owner);
        token.transfer(alice, amount);

        assertEq(token.balanceOf(owner), INITIAL_SUPPLY - amount);
        assertEq(token.balanceOf(alice), amount);
    }

    function testFuzz_Approve(uint256 amount) public {
        vm.prank(owner);
        token.approve(alice, amount);

        assertEq(token.allowance(owner, alice), amount);
    }

    function testFuzz_TransferFrom(uint256 approveAmount, uint256 transferAmount) public {
        approveAmount = bound(approveAmount, 0, INITIAL_SUPPLY);
        transferAmount = bound(transferAmount, 0, approveAmount);

        vm.prank(owner);
        token.approve(alice, approveAmount);

        vm.prank(alice);
        token.transferFrom(owner, bob, transferAmount);

        assertEq(token.balanceOf(bob), transferAmount);
    }

    function testFuzz_MintAndBurn(uint256 mintAmount, uint256 burnAmount) public {
        mintAmount = bound(mintAmount, 0, type(uint128).max);
        burnAmount = bound(burnAmount, 0, mintAmount);

        vm.startPrank(owner);
        token.mint(alice, mintAmount);
        vm.stopPrank();

        vm.prank(alice);
        token.burn(burnAmount);

        assertEq(token.balanceOf(alice), mintAmount - burnAmount);
        assertEq(token.totalSupply(), INITIAL_SUPPLY + mintAmount - burnAmount);
    }
}
