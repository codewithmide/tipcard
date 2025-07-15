# TipCard: One-Click Crypto Payment Links

**Making crypto payments as simple as sharing a link - powered by Neon EVM's Solana composability**

## 🎯 Overview

TipCard enables users to create shareable payment links for instant SOL payments on Solana. Built with Neon EVM's composability features, it offers ultra-low fees and native Solana integration while providing the familiar Ethereum development experience.

### The Problem

- Sending crypto payments requires complex wallet addresses
- High gas fees make small payments uneconomical  
- Cross-chain payments require complicated bridging
- Poor user experience for crypto newcomers

### The Solution

TipCard makes crypto payments as simple as sharing a link:

1. **Create**: Connect wallet, set amount, generate payment link
2. **Share**: Copy link and share anywhere - social media, messaging, QR codes
3. **Pay**: Recipients click link, connect Solana wallet, pay instantly with SOL

## 🚀 Quick Start

### Prerequisites

```bash
npm install
```

### Deploy Contract

```bash
npx hardhat run scripts/deploy-solana-tipcard.js --network neondevnet
```

### Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:3000` to use the application.

### Run Tests

```bash
npx hardhat test test/solana-tipcard.test.js --network neondevnet
```

## ⚡ Neon Composability Integration

### Precompiles Used

The contract leverages Neon EVM's powerful precompiles for direct Solana integration:

| Precompile | Address | Purpose |
|------------|---------|---------|
| **ISPLTokenProgram** | `0xFf00000000000000000000000000000000000004` | Direct SPL token operations |
| **ISolanaNative** | `0xfF00000000000000000000000000000000000007` | Solana address conversion |
| **ICallSolana** | `0xFF00000000000000000000000000000000000006` | Advanced Solana calls |

### How It Works

```solidity
// Convert EVM address to Solana address
bytes32 solanaAddr = SOLANA_NATIVE.solanaAddress(evmAddress);

// Direct SOL transfers on Solana (simplified for SOL-only)
_transferSOL(fromAccount, toAccount, amount);
```

## 📁 Project Structure

```
├── contracts/
│   ├── SolanaTipCard.sol           # Main contract with Neon composability
│   ├── precompiles/                # Neon precompile interfaces
│   │   ├── ISPLTokenProgram.sol
│   │   ├── ISolanaNative.sol
│   │   └── ICallSolana.sol
│   └── utils/                      # Helper libraries
├── frontend/                       # Next.js frontend application
│   ├── app/                        # Next.js 14 app directory
│   ├── components/                 # React components
│   └── package.json
├── scripts/
│   └── deploy-solana-tipcard.js    # Contract deployment
├── test/
│   └── solana-tipcard.test.js      # Comprehensive tests
└── types/                          # TypeScript contract types
```

## 🛠 Smart Contract Features

### Core Functionality

- **SOL-Only Payments**: Simplified to only support native SOL for better UX
- **Flexible Amounts**: Fixed or user-determined payment amounts
- **Link Management**: Create, activate, deactivate payment links
- **Cross-Chain Architecture**: EVM contract orchestrating Solana operations
- **Real-time Updates**: Track payments and statistics

### Contract Architecture

```solidity
struct SolanaPaymentLink {
    address evmCreator;           // EVM address of creator
    bytes32 solanaCreator;        // Solana address of creator (bytes32)
    uint64 amount;                // Amount in SOL lamports
    bool isFlexible;              // Allow flexible payment amounts
    bool isActive;                // Link activation status
    uint64 totalReceived;         // Total SOL received
    uint32 paymentCount;          // Number of payments
    string description;           // Payment description
}
```

## 🖥 Frontend Application

### Features

- **Modern UI**: Next.js 14 with Tailwind CSS and Neon EVM theming
- **Wallet Integration**: Solana Wallet Adapter (Phantom, Solflare)
- **Payment Management**: Create, view, and process payment links
- **Real-time Updates**: Live payment status and statistics
- **Responsive Design**: Works on desktop and mobile

### Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS with custom Neon EVM theme
- **Blockchain**: Ethers.js for contract interaction
- **Wallets**: Solana Wallet Adapter for Phantom/Solflare
- **Icons**: Lucide React

## 🧪 Testing

### Comprehensive Test Suite

```bash
# Run all tests
npx hardhat test test/solana-tipcard.test.js --network neondevnet

# Test coverage includes:
✅ Contract deployment and initialization
✅ Payment link creation with SOL
✅ Solana payment processing  
✅ Link management (activate/deactivate)
✅ Error handling and validation
✅ Neon composability integration
```

### Deployed Contract

| Network | Address |
|---------|---------|
| **Neon Devnet** | `0xa5Faf19C61CA722873987Fa9D7F9f434cf15c674` |

## 💡 Usage Examples

### Creating Payment Links

```javascript
// Create fixed SOL payment link
const linkId = await solanaTipCard.createSolanaPaymentLink(
    solanaCreatorBytes32,    // 32-byte Solana address
    5000000000,             // 5 SOL in lamports
    false,                  // Fixed amount
    "Coffee tip"
);

// Create flexible payment link
const flexibleLink = await solanaTipCard.createSolanaPaymentLink(
    solanaCreatorBytes32,
    0,                      // No fixed amount
    true,                   // Flexible
    "Support our project"
);
```

### Processing Payments

```javascript
// Pay fixed amount
await solanaTipCard.paySolanaLink(
    linkId,
    0,                      // Amount ignored for fixed links
    payerSolanaBytes32
);

// Pay flexible amount
await solanaTipCard.paySolanaLink(
    flexibleLinkId,
    10000000000,            // 10 SOL in lamports
    payerSolanaBytes32
);
```

## 🎯 Use Cases

### Content Creators

- **Social Media Tips**: Share payment links on Twitter, Discord
- **Live Stream Donations**: QR codes for instant viewer tips
- **Content Monetization**: Direct supporter payments

### Businesses

- **Service Tips**: Restaurant, delivery, service industry
- **Freelancer Payments**: Quick invoice and payment collection
- **E-commerce**: Instant payment processing

### DeFi & Communities

- **DAO Contributions**: Member dues and donations
- **Group Expenses**: Split bills and shared costs
- **Yield Farming**: Collect management and performance fees

## ⚡ Benefits

### Ultra-Low Fees

- Solana transaction fees: ~$0.0001
- No bridging or wrapping costs
- Viable for micro-payments and tips

### Lightning Fast

- Solana's ~400ms block times
- Instant payment confirmation
- No cross-chain delays

### Developer Experience

- Familiar Ethereum/Solidity development
- Rich TypeScript support
- Comprehensive testing framework

### User Experience

- Simple link-based payments
- Works with any Solana wallet
- No technical knowledge required

## 🔐 Security Features

- **Input Validation**: SOL amount and address verification
- **Access Control**: Creator-only link management
- **State Management**: Proper active/inactive controls
- **Error Handling**: Custom errors with clear messages
- **Audit Trail**: Complete event logging for transparency

## 🔧 Development Setup

### Environment Configuration

1. **Install Dependencies**:

   ```bash
   npm install
   cd frontend && npm install
   ```

2. **Configure Secrets**:

   ```bash
   # Set up Hardhat keystore (recommended)
   npx hardhat keystore set PRIVATE_KEY_OWNER
   npx hardhat keystore set PRIVATE_KEY_SOLANA
   
   # Or use .env file (not recommended for production)
   cp .env.example .env
   # Add your private keys to .env
   ```

3. **Deploy Contract**:

   ```bash
   npx hardhat run scripts/deploy-solana-tipcard.js --network neondevnet
   ```

4. **Update Frontend Config**:

   ```bash
   # Update CONTRACT_ADDRESS in frontend components with deployed address
   ```

5. **Run Frontend**:

   ```bash
   cd frontend
   npm run dev
   ```

### Neon EVM Configuration

The project is configured for Neon EVM Devnet:

```javascript
// hardhat.config.js
networks: {
  neondevnet: {
    url: "https://devnet.neonevm.org",
    accounts: [/* keystore accounts */],
    chainId: 245022926,
    allowUnlimitedContractSize: false,
    timeout: 1000000,
  }
}
```

## 🚀 Future Enhancements

### Planned Features

- **Multi-token Support**: Extend beyond SOL to SPL tokens
- **Subscription Payments**: Recurring payment links
- **Analytics Dashboard**: Payment insights and reporting
- **Mobile App**: React Native version
- **API Integration**: REST API for external integrations

### Integration Opportunities

- **Social Platforms**: Twitter/Discord bot integration
- **E-commerce**: Shopify/WooCommerce plugins
- **Payment Processors**: Stripe-like API
- **DeFi Protocols**: Integration with lending/yield platforms

## 📚 Documentation

### Smart Contract Reference

- [SolanaTipCard.sol](./contracts/SolanaTipCard.sol) - Main contract
- [Precompiles](./contracts/precompiles/) - Neon EVM interfaces
- [Test Suite](./test/solana-tipcard.test.js) - Comprehensive tests

### Frontend Documentation

- [Components](./frontend/components/) - React components
- [Pages](./frontend/app/) - Next.js pages
- [Configuration](./frontend/tailwind.config.js) - Styling setup

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Make changes and add tests
4. Commit changes: `git commit -m 'Add amazing feature'`
5. Push to branch: `git push origin feature/amazing-feature`
6. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Neon EVM Team** - For composability precompiles and infrastructure
- **Solana Foundation** - For the underlying blockchain technology
- **Next.js Team** - For the incredible React framework

---

**Built with ❤️ for the Solana ecosystem using Neon EVM's composability features**

*Making crypto payments as simple as sharing a link.*
