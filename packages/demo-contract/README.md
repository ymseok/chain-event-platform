# Demo Contract

Sample smart contracts for testing the Chain Event Platform. Includes an ERC20 token contract that emits `Transfer` and `Approval` events.

## Overview

This package contains Foundry-based smart contracts used for:

- **Local Testing**: Deploy contracts on Anvil for end-to-end testing
- **Event Generation**: Trigger blockchain events to test the event pipeline
- **ABI Source**: Provide contract ABIs for program registration

## Tech Stack

- **Framework**: Foundry (Forge, Anvil, Cast)
- **Language**: Solidity 0.8.x
- **Testing**: Forge test framework

## Project Structure

```
demo-contract/
├── src/
│   └── SampleToken.sol       # ERC20 token contract
├── script/
│   └── SampleToken.s.sol     # Deployment script
├── test/
│   └── SampleToken.t.sol     # Contract tests
├── ext_script/
│   ├── transfer.sh           # Test transfer event script
│   └── approve.sh            # Test approval event script
├── out/                      # Compiled artifacts (ABI, bytecode)
├── lib/                      # Dependencies (forge-std)
└── foundry.toml              # Foundry configuration
```

## Prerequisites

### Install Foundry

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash

# Run foundryup to install the latest version
foundryup

# Verify installation
forge --version
anvil --version
cast --version
```

## Getting Started

### Build Contracts

```bash
# Compile contracts
pnpm build
# or
forge build
```

### Run Tests

```bash
# Run all tests
pnpm test

# Verbose output
pnpm test:v    # -vvv
pnpm test:vv   # -vvvv
```

### Start Local Blockchain

```bash
# Start Anvil local node
pnpm anvil

# Anvil runs with:
# - RPC URL: http://127.0.0.1:8545
# - Chain ID: 31337
# - Block time: instant (or use --block-time 2 for 2 second blocks)
# - Pre-funded accounts with 10,000 ETH each
```

### Deploy Contract

```bash
# Deploy to local Anvil
pnpm deploy:local

# Deploy with verbose output
pnpm deploy:local:verify

# Expected output:
# SampleToken deployed at: 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm build` | Compile contracts |
| `pnpm clean` | Clean build artifacts |
| `pnpm test` | Run tests |
| `pnpm test:v` | Run tests with verbose output |
| `pnpm test:vv` | Run tests with very verbose output |
| `pnpm coverage` | Run test coverage |
| `pnpm fmt` | Format Solidity code |
| `pnpm fmt:check` | Check formatting |
| `pnpm anvil` | Start local blockchain |
| `pnpm deploy:local` | Deploy to local Anvil |
| `pnpm snapshot` | Generate gas snapshot |

## SampleToken Contract

A standard ERC20 token implementation with the following features:

### Events

```solidity
event Transfer(address indexed from, address indexed to, uint256 value);
event Approval(address indexed owner, address indexed spender, uint256 value);
```

### Functions

```solidity
function transfer(address to, uint256 amount) external returns (bool);
function approve(address spender, uint256 amount) external returns (bool);
function transferFrom(address from, address to, uint256 amount) external returns (bool);
function balanceOf(address account) external view returns (uint256);
function allowance(address owner, address spender) external view returns (uint256);
```

## Test Scripts

The `ext_script/` directory contains shell scripts for generating test events:

### transfer.sh

Executes a token transfer to trigger a `Transfer` event.

```bash
cd ext_script
./transfer.sh

# Transfers 1 token (10^18 wei) from account[0] to account[1]
# Default contract: 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

### approve.sh

Executes a token approval to trigger an `Approval` event.

```bash
cd ext_script
./approve.sh

# Approves account[1] to spend 1 token on behalf of account[0]
```

### Script Configuration

Both scripts use default Anvil values:

| Variable | Default Value |
|----------|---------------|
| `PRIVATE_KEY` | Anvil account[0] private key |
| `RPC_URL` | `http://127.0.0.1:8545` |
| `CONTRACT_ADDRESS` | `0x5FbDB2315678afecb367f032d93F642f64180aa3` |
| `RECIPIENT/SPENDER` | Anvil account[1] address |
| `AMOUNT` | 1 token (18 decimals) |

Modify these variables in the scripts if needed.

## Using Contract ABI

After building, the ABI is available at:

```
out/SampleToken.sol/SampleToken.json
```

### Register in Chain Event Platform

1. Build the contract: `pnpm build`
2. Navigate to Admin UI > Programs
3. Click "Register Program"
4. Upload: `out/SampleToken.sol/SampleToken.json`
5. Enter contract address: `0x5FbDB2315678afecb367f032d93F642f64180aa3`

## Anvil Test Accounts

Anvil provides 10 pre-funded accounts. The first two are commonly used for testing:

| Index | Address | Private Key |
|-------|---------|-------------|
| 0 | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` |
| 1 | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` |

## Cast Commands

Use Cast to interact with deployed contracts:

```bash
# Check token balance
cast call $CONTRACT_ADDRESS "balanceOf(address)" $ACCOUNT --rpc-url http://127.0.0.1:8545

# Check allowance
cast call $CONTRACT_ADDRESS "allowance(address,address)" $OWNER $SPENDER --rpc-url http://127.0.0.1:8545

# Get current block number
cast block-number --rpc-url http://127.0.0.1:8545

# Get transaction receipt
cast receipt $TX_HASH --rpc-url http://127.0.0.1:8545
```

## Development

### Adding New Contracts

1. Create contract in `src/`
2. Create deployment script in `script/`
3. Create tests in `test/`
4. Build and deploy

### Formatting

```bash
# Format Solidity files
pnpm fmt

# Check formatting
pnpm fmt:check
```

## Related Components

- [blockchain-event-ingestor](../blockchain-event-ingestor) - Ingests events from this contract
- [admin-api](../admin-api) - Registers contract ABI
- [admin-ui](../admin-ui) - UI for program registration
