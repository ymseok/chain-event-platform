// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {Counter} from "../src/Counter.sol";

contract CounterTest is Test {
    Counter public counter;

    event SetNumber(uint256 newNumber);
    event Increment(uint256 newNumber);

    function setUp() public {
        counter = new Counter();
    }

    // ============ Initial State Tests ============

    function test_InitialState_NumberIsZero() public view {
        assertEq(counter.number(), 0);
    }

    // ============ SetNumber Tests ============

    function test_SetNumber_Success() public {
        counter.setNumber(42);
        assertEq(counter.number(), 42);
    }

    function test_SetNumber_EmitsSetNumberEvent() public {
        vm.expectEmit(false, false, false, true);
        emit SetNumber(42);

        counter.setNumber(42);
    }

    function test_SetNumber_ZeroValue() public {
        counter.setNumber(100);
        assertEq(counter.number(), 100);

        counter.setNumber(0);
        assertEq(counter.number(), 0);
    }

    function test_SetNumber_MaxUint256() public {
        counter.setNumber(type(uint256).max);
        assertEq(counter.number(), type(uint256).max);
    }

    function test_SetNumber_OverwritesPreviousValue() public {
        counter.setNumber(10);
        assertEq(counter.number(), 10);

        counter.setNumber(20);
        assertEq(counter.number(), 20);
    }

    // ============ Increment Tests ============

    function test_Increment_FromZero() public {
        counter.increment();
        assertEq(counter.number(), 1);
    }

    function test_Increment_FromNonZero() public {
        counter.setNumber(5);
        counter.increment();
        assertEq(counter.number(), 6);
    }

    function test_Increment_EmitsIncrementEvent() public {
        counter.setNumber(10);

        vm.expectEmit(false, false, false, true);
        emit Increment(11);

        counter.increment();
    }

    function test_Increment_MultipleIncrements() public {
        counter.increment();
        counter.increment();
        counter.increment();
        assertEq(counter.number(), 3);
    }

    function test_Increment_EmitsCorrectValueAfterSet() public {
        counter.setNumber(99);

        vm.expectEmit(false, false, false, true);
        emit Increment(100);

        counter.increment();
        assertEq(counter.number(), 100);
    }

    // ============ Combined Operation Tests ============

    function test_SetThenIncrement() public {
        counter.setNumber(50);
        counter.increment();
        assertEq(counter.number(), 51);
    }

    function test_IncrementThenSet() public {
        counter.increment();
        counter.increment();
        assertEq(counter.number(), 2);

        counter.setNumber(0);
        assertEq(counter.number(), 0);
    }

    // ============ Fuzz Tests ============

    function testFuzz_SetNumber(uint256 x) public {
        counter.setNumber(x);
        assertEq(counter.number(), x);
    }

    function testFuzz_SetNumberEmitsEvent(uint256 x) public {
        vm.expectEmit(false, false, false, true);
        emit SetNumber(x);

        counter.setNumber(x);
    }

    function testFuzz_IncrementAfterSet(uint256 x) public {
        x = bound(x, 0, type(uint256).max - 1);

        counter.setNumber(x);
        counter.increment();
        assertEq(counter.number(), x + 1);
    }

    function testFuzz_IncrementEmitsCorrectValue(uint256 x) public {
        x = bound(x, 0, type(uint256).max - 1);

        counter.setNumber(x);

        vm.expectEmit(false, false, false, true);
        emit Increment(x + 1);

        counter.increment();
    }
}
