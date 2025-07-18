# Solana-Native UX for EVM dApps: Swap Integration with Neon EVM

## Overview

This project demonstrates how to build a cross-chain decentralized exchange (DEX) that combines the best of both Ethereum and Solana ecosystems. By leveraging Neon EVM's Solana Native SDK, we've created a swap application that:

- Uses Solana wallets (like Phantom) for authentication
- Executes swaps via PancakeSwap smart contracts on Neon EVM
- Provides a seamless Solana-native user experience
- Eliminates the need for MetaMask or asset bridging

## Key Features

### 1. Solana Wallet Integration

Users can connect with Phantom or any Solana wallet, maintaining the familiar Solana UX while interacting with EVM contracts.

### 2. Cross-Chain Swap Execution

- Token approvals handled via Solana transactions
- Swap logic executed on Neon EVM
- All operations completed atomically

### 3. Token System

We've deployed two versions of custom tokens:
- **MIDE/CODE (V1)**: With different decimal configurations (9 and 12)
- **MIDE/CODE (V2)**: Standardized to 9 decimals each

## Architecture

### Smart Contract Deployment

```javascript
{
  "tokensV1": [
    {
      "address": "0x61587Ad9047b3C38b1eF54B1c7bccc62bA790f58",
      "address_spl": "5ydpPHz2W2isUb7QNxEkU3JFKzs8xMB5zvnNev4NDy22",
      "name": "MIDE",
      "symbol": "MIDE",
      "decimals": 9
    },
    {
      "address": "0xdd5957D0642Cf8925579E18Fea3c51B0daa79295",
      "address_spl": "Hz7GXdTBnF7QiuN4WJfVD9Lg2AQi1aoQe2B7x4f1sGwh",
      "name": "CODE",
      "symbol": "CODE",
      "decimals": 12
    }
  ],
  "tokensV2": [
    {
      "address": "0xb15EeaF49D538eb7d2DC3de5dD224ef7EFFad8B8",
      "address_spl": "BGRJXn3VphDQ3VUSazMdZFqxQRZ8pBBbAKMAVTQhjCLv",
      "name": "MIDE (v2)",
      "symbol": "TOKEN_Av2",
      "decimals": 9
    },
    {
      "address": "0xF53043d20Ec1EE75664a60067a5B85DfBc7384E6",
      "address_spl": "Gask1W3yPuPAQX9tpeMnMKWEkFPzBdV4NH3Y9CRvVPqp",
      "name": "CODE (v2)",
      "symbol": "TOKEN_Bv2",
      "decimals": 9
    }
  ]
}
```

### Liquidity Pools

We've established multiple trading pairs:

```javascript
"swap": {
  "pairs": {
    "wneon/mide": {
      "pair": "0x0000000000000000000000000000000000000000",
      "a": "0x61587Ad9047b3C38b1eF54B1c7bccc62bA790f58",
      "b": "0xca18Fb7E5C182d95a1a2945cBeF4c5Df8F686A03"
    },
    // Additional pairs...
  }
}
```

## Conclusion

This implementation showcases the powerful combination of Solana's user experience with Ethereum's robust smart contract ecosystem through Neon EVM. Developers can use this as a foundation to build more complex cross-chain applications that leverage the strengths of both networks.
