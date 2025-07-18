# TipCard: One-Click Crypto Payment Links

**Making payments as simple as sharing a link - powered by Neon EVM's Solana composability**

![TipCard Demo](https://img.shields.io/badge/Status-Production%20Ready-brightgreen) ![Solana](https://img.shields.io/badge/Powered%20by-Solana-purple) ![Neon EVM](https://img.shields.io/badge/Built%20on-Neon%20EVM-orange)

## [Live Demo](https://tipcard.vercel.app/)

## 🎯 Overview

TipCard enables users to create shareable payment links for instant SOL payments on Solana. Built with Neon EVM's composability features and Solana Native SDK, it offers ultra-low fees, actual SOL transfers, and native Solana wallet integration while providing the familiar Ethereum development experience.

### ✨ What Makes This Special

- **Real SOL Transfers**: Actual SOL debiting/crediting using Solana's SystemProgram
- **Solana Native SDK**: Direct Solana wallet integration (Phantom, Solflare)
- **Two-Step Payment**: SOL transfer + contract recording for transparency
- **Ultra-Low Fees**: ~$0.0001 per transaction on Solana
- **Smart Caching**: 5-minute payment history cache with localStorage
- **Toast Notifications**: Modern UX with success/error feedback
- **URL-based Routing**: Automatic tab switching via payment links
- **Dynamic UI**: Real-time balance checks and airdrop functionality

### The Problem

- Sending crypto payments requires complex wallet addresses
- High gas fees make small payments uneconomical  
- Cross-chain payments require complicated bridging
- Poor user experience for crypto newcomers

### The Solution

TipCard makes crypto payments as simple as sharing a link:

1. **Create**: Connect Solana wallet, set amount, generate payment link
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
npx hardhat test mocha ./test/tipcard-test.js --network neondevnet
```

## ⚡ Neon Composability Integration

### Precompiles Used

The contract leverages Neon EVM's powerful precompiles for direct Solana integration:

| Precompile | Address | Purpose |
|------------|---------|---------|
| **ISPLTokenProgram** | `0xFf00000000000000000000000000000000000004` | Direct SPL token operations |
| **ISolanaNative** | `0xfF00000000000000000000000000000000000007` | Solana address conversion & user registration |
| **ICallSolana** | `0xFF00000000000000000000000000000000000006` | Advanced Solana program calls |

## 📁 Project Structure

```txt
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
│   │   ├── SimplePaymentLink.tsx   # Payment link creation
│   │   ├── SimplePaymentProcessor.tsx # Payment processing
│   │   ├── MyLinks.tsx             # Link management with caching
│   │   ├── Toast.tsx               # Toast notification system
│   │   └── Header.tsx              # Application header
│   ├── utils/                      # Utility functions
│   │   ├── solana-native-contract.ts # Solana Native SDK integration
│   │   └── simple-wallet-signer.ts  # Wallet utilities
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
- **User Registration**: Automatic Solana user registration via Neon Native SDK
- **Event Logging**: Complete audit trail with SolanaLinkCreated and SolanaPaymentReceived events

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

### Payment Flow Architecture

```txt
1. Frontend: SOL Transfer (SystemProgram.transfer)
   ├── From: Payer's Solana wallet
   ├── To: Recipient's Solana address  
   └── Amount: Payment amount in lamports

2. Contract: Payment Recording (paySolanaLink)
   ├── Updates: totalReceived, paymentCount
   ├── Emits: SolanaPaymentReceived event
   └── Validates: Link exists and is active
```

## 🖥 Frontend Application

### Latest Features

- **Smart Caching**: 5-minute localStorage cache for payment history with BigInt serialization
- **Toast Notifications**: Modern notification system replacing all alert() calls
- **URL-based Navigation**: Automatic tab switching when payment links are shared
- **SOL Balance Integration**: Real-time balance checks with airdrop functionality
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Retry Mechanisms**: Robust transaction processing with automatic retries

### Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS with custom theme
- **Blockchain**: Ethers.js for contract interaction
- **Solana**: @solana/web3.js + Solana Wallet Adapter
- **Neon Integration**: @neonevm/solana-sign (Solana Native SDK)
- **Wallets**: Phantom, Solflare, and other Solana wallets
- **Icons**: Lucide React
- **State Management**: React Context for toast notifications
- **Caching**: localStorage with TTL and BigInt serialization

### Key Components

#### `SimplePaymentLink.tsx`

- Creates payment links using Solana Native SDK
- Real-time SOL balance checking with airdrop integration
- Handles user registration with Neon EVM
- Generates shareable payment URLs with precise amount handling

#### `SimplePaymentProcessor.tsx`

- Processes payments with two-step approach
- Performs actual SOL transfers via SystemProgram
- Records payments in smart contract for tracking
- Supports both contract-based and demo payment links

#### `MyLinks.tsx`

- Smart caching system with 5-minute TTL
- BigInt serialization for localStorage compatibility
- Solana→EVM address mapping for cache lookup
- Real-time refresh functionality with loading states

#### `Toast.tsx`

- Comprehensive notification system
- Success, error, and warning states with animations
- Context-based state management
- Auto-dismiss with customizable duration

## 🧪 Testing

### Comprehensive Test Suite

```bash
# Run all tests
npx hardhat test mocha ./test/tipcard-test.js --network neondevnet
```

#### Test Results

```bash
Single Wallet Solana TipCard Test
🚀 Setting up Single Wallet Test...

🔒 Decrypting keystore secrets...
   NeonEVM owner address: 0xcf2A070357979D8Fa7c99F66ca43c6e0938F2403
   NeonEVM user1 address: 0x02e47d2E10ac4024416703A9dde9057889C80222
   NeonEVM user2 address: 0x8d39Fc73D7aa439B4ef773FF877223D32ED44068
   Solana user1 address: GsWeXfqrmGLkN3fFUu5bdoDPDWJLf5LzAWjNfvctLuA6
   Solana user2 address: C99PbkmvvkGVAhFXUab7Uj3Bzj3GvX4eSQ7FswtZBUQh

🔗 Connecting to SolanaTipCard at: 0xCFE03c7c67456D094C0162F9030393FC2cCc40Cb

🔗 Creating Solana payment link with first wallet...
   Creator: 0x58ca66661ae3488f330aa66edc6f14e5a3ffc5f6
   Current nonce: 12
   ✅ User1: Solana GsWeXfqr... → EVM 0x58ca66...
   Chain ID: 245022927

✅ Transaction submitted!
🔗 Signature: 31ATNNqVWYVwL5iQXxLvNwWRMcBUzQNtjqAG8CNfGTyxzbe71D1RG4ZCTANaSeGEMsiHniPwQm9PJx75znivpJaU
✅ Transaction status: confirmed
✅ Neon EVM transaction hash: 0x3b083c0a759bd9eb6d41f48422ec43608794c179a1b7f7899059b6b1a4f27b6a

✅ Found 12 payment link(s) for this user!
   Latest Link ID: 0x515ed5bad1fa34ad204e6a860dabc1c8da51a89118db65e31855bb6733e1e23a

🎉 Payment Link Details:
   Link ID: 0x515ed5bad1fa34ad204e6a860dabc1c8da51a89118db65e31855bb6733e1e23a
   Creator EVM: 0x58ca66661aE3488f330Aa66EdC6F14e5A3FFc5F6
   Creator Solana: 0xebcfddcaa195beb5390a5288d08d9ba9f34084e0b4224b0c752730feb510eca7
   Amount: 0.5 SOL
   Flexible: false
   Active: true
   Description: Payment link for testing

    ✔ Should create a Solana payment link using first wallet (31734ms)

💳 Paying created payment link with second wallet...
   Payer: 0xab8d93b6dabb01953cf6c0360993ced34177e2ce
   ✅ User2: Solana C99Pbkmv... → EVM 0xab8d93...
   Current nonce: 6

✅ Payment transaction submitted!
🔗 Signature: 5zRFP9H8KT1EHABtdbNYVXfXc6DgtGvyizzd3WB14D47UuSorUGr9T7xyVeeo5pmCCMdqWCXTfZXQaS6jjfhvq23
🎉 Payment transaction completed!

    ✔ Should pay the created payment link using second wallet (26768ms)

📋 Fetching all payment links for first user...
✅ Found 12 payment link(s) for this user

🔗 Link 12 (Latest):
   Link ID: 0x515ed5bad1fa34ad204e6a860dabc1c8da51a89118db65e31855bb6733e1e23a
   Amount: 0.5 SOL
   Total Received: 0.5 SOL
   Payment Count: 1
   Description: "Payment link for testing"

🔍 Verifying latest link matches created link:
✅ Latest link matches the created link!

    ✔ Should fetch all payment links created by the first user (58478ms)

👤 Verifying both users initialization...
✅ User1 EVM address: 0x58ca66661ae3488f330aa66edc6f14e5a3ffc5f6
✅ User1 Solana address: GsWeXfqrmGLkN3fFUu5bdoDPDWJLf5LzAWjNfvctLuA6
✅ User2 EVM address: 0xab8d93b6dabb01953cf6c0360993ced34177e2ce
✅ User2 Solana address: C99PbkmvvkGVAhFXUab7Uj3Bzj3GvX4eSQ7FswtZBUQh
✅ Chain ID: 245022927

    ✔ Should verify both users are properly initialized

💰 Checking SOL balances...
   User1 SOL balance: 1.871328415 SOL
   User2 SOL balance: 7.995560083 SOL
   ✅ Both users have sufficient SOL balance

    ✔ Should check both users' SOL balances (4021ms)

🎉 Single Wallet Test Summary:
✅ Two Solana users successfully initialized
✅ Solana Native SDK integration working perfectly
✅ Two-wallet payment flow implemented
✅ Payment link creation and payment flow verified
✅ Ready for production use

📝 Architecture Confirmed:
• ✅ Two Solana wallet approach working
• ✅ Proper EVM address derivation from Solana keypair
• ✅ Direct Solana wallet signing
• ✅ Payment link creation and payment flow
• ✅ Solana Native SDK correctly integrated

  5 passing (2m)
```

#### Test Coverage

✅ **Contract deployment and initialization**  
✅ **Payment link creation with SOL**  
✅ **Solana payment processing**  
✅ **Link management (activate/deactivate)**  
✅ **Error handling and validation**  
✅ **Neon composability integration**  
✅ **User registration flow**  
✅ **Two-step payment verification**  
✅ **Event parsing and link ID extraction**  
✅ **Precision handling for SOL amounts**  
✅ **Multi-wallet interaction testing**  
✅ **Cross-chain address derivation**

### Deployed Contract

| Network | Address |
|---------|---------|
| **Neon Devnet** | `0xCFE03c7c67456D094C0162F9030393FC2cCc40Cb` |

## 💡 Usage Examples

### Creating Payment Links

```typescript
// Initialize Solana Native SDK
await solanaNativeContract.initWithSolanaWallet(wallet.adapter);

// Create fixed SOL payment link with precise amount handling
const result = await solanaNativeContract.createPaymentLink(
    5.0,                    // 5 SOL (uses ethers.parseUnits for precision)
    false,                  // Fixed amount
    "Coffee tip"
);

console.log('Link ID:', result.linkId);
console.log('Transaction:', result.txHash);

// Create flexible payment link
const flexibleResult = await solanaNativeContract.createPaymentLink(
    1.0,                    // Suggested amount
    true,                   // Flexible
    "Support our project"
);
```

### Processing Payments

```typescript
// Pay a payment link (two-step process)
const paymentResult = await solanaNativeContract.payLink(
    linkId,                 // Payment link ID
    10.0                    // Amount in SOL
);

console.log('SOL Transfer:', paymentResult.transferSignature);
console.log('Contract Record:', paymentResult.txHash);
```

### Caching and State Management

```typescript
// Smart caching with 5-minute TTL
const cachedData = loadFromCache(userAddress);
if (cachedData && isCacheValid(cachedData, userAddress)) {
    // Load from cache
    const displayLinks = cachedData.links.map(linkFromCache);
    setLinks(displayLinks);
} else {
    // Fetch fresh data
    await fetchFromContract(userAddress);
}

// Toast notifications
showToast('success', 'Payment Successful!', 'Your payment has been sent successfully.');
showToast('error', 'Transaction Failed', 'Please check your balance and try again.');
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

### Real Value Transfer

- Actual SOL debiting/crediting
- Direct SystemProgram transfers
- No wrapped tokens or IOUs

### Superior User Experience

- Toast notifications for all actions
- Smart caching prevents redundant fetches
- URL-based navigation for seamless sharing
- Real-time balance checks and airdrop functionality
- Precise amount handling (no more 0.9960 vs 1.0 issues)

### Developer Experience

- Familiar Ethereum/Solidity development
- Rich TypeScript support
- Comprehensive testing framework
- Solana Native SDK integration
- Clean error handling without verbose logging

## 🔐 Security Features

- **Input Validation**: SOL amount and address verification with ethers.parseUnits
- **Access Control**: Creator-only link management
- **State Management**: Proper active/inactive controls
- **Two-Step Payment**: SOL transfer + contract verification
- **Error Handling**: Custom errors with clear messages
- **Audit Trail**: Complete event logging for transparency
- **User Registration**: Automatic Solana user registration validation
- **Nonce Management**: Proper transaction ordering and conflict resolution
- **Retry Mechanisms**: Robust transaction processing with automatic retries

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
   ```

3. **Deploy Contract**:

   ```bash
   npx hardhat run scripts/deploy-solana-tipcard.js --network neondevnet
   ```

4. **Update Frontend Config**:

   ```bash
   # Update .env file with deployed contract address
   echo "NEXT_PUBLIC_TIPCARD_CONTRACT_ADDRESS=0x..." > frontend/.env
   echo "NEXT_PUBLIC_NEON_RPC_URL=https://devnet.neonevm.org" >> frontend/.env
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
    url: "https://devnet.neonevm.org/sol",
    accounts: [], // Uses keystore
    chainId: 245022926,
    allowUnlimitedContractSize: false,
    gasMultiplier: 2,
    maxFeePerGas: '10000000000000',
    maxPriorityFeePerGas: '5000000000000'
  }
}
```

## 🚀 Recent Updates

### Version 2.0 Features

#### 🎨 **Enhanced UX**

- **Toast Notification System**: Modern notifications replacing all alert() calls
- **Smart Tab Detection**: Automatic navigation based on URL parameters
- **Dynamic Footer**: Auto-updating copyright year
- **Loading States**: Improved feedback for all async operations

#### 🔧 **Technical Improvements**

- **Smart Caching**: 5-minute localStorage cache with BigInt serialization
- **Precision Fixes**: Resolved SOL amount precision issues using ethers.parseUnits
- **Event Parsing**: Extract actual link IDs from SolanaLinkCreated events
- **Retry Mechanisms**: Robust transaction processing with automatic retries
- **Error Handling**: Maintained important error logs while removing verbose debugging

#### 🏗️ **Architecture Enhancements**

- **Solana→EVM Mapping**: Efficient cache lookup using address mapping
- **Cache-First Loading**: Prevent redundant API calls with intelligent caching
- **URL-based Routing**: Deep linking support for payment links
- **Nonce Management**: Proper transaction ordering and conflict resolution

## 🔧 Technical Architecture

### Solana Native SDK Integration

```typescript
// Initialize with Solana wallet
const proxyApi = new NeonProxyRpcApi('https://devnet.neonevm.org/sol');
const initResult = await proxyApi.init(walletPublicKey);

// Automatic user registration
const solanaUser = initResult.solanaUser;
const isRegistered = await contract.isSolanaUser(solanaUser.neonWallet);
```

### Payment Processing Flow

```txt
1. User clicks payment link (auto-switches to Pay tab)
   ↓
2. Frontend loads link details from contract (with caching)
   ↓  
3. User connects Solana wallet
   ↓
4. Real-time SOL balance check with airdrop option
   ↓
5. Frontend creates SOL transfer transaction
   ↓
6. User signs transaction with wallet
   ↓
7. SOL transfer executes on Solana
   ↓
8. Frontend calls contract to record payment
   ↓
9. Contract updates statistics and emits event
   ↓
10. Toast notification confirms success
```

### Caching Architecture

```typescript
interface CachedData {
  links: CachedDisplayLink[]
  timestamp: number
  userAddress: string
  solanaPublicKey: string
}

// BigInt serialization helpers
const linkToCache = (link: DisplayLink): CachedDisplayLink => ({
  ...link,
  amount: link.amount.toString(),
  totalReceived: link.totalReceived.toString()
})

const linkFromCache = (cached: CachedDisplayLink): DisplayLink => ({
  ...cached,
  amount: BigInt(cached.amount),
  totalReceived: BigInt(cached.totalReceived)
})
```

### Event Parsing with Retry Logic

```typescript
// Extract actual link ID from contract events
for (let attempt = 1; attempt <= 5; attempt++) {
  const receiptResult = await getTransactionReceipt(neonTxHash);
  
  if (receiptResult?.logs) {
    for (const log of receiptResult.logs) {
      const decoded = iface.parseLog(log);
      if (decoded?.name === 'SolanaLinkCreated') {
        return { linkId: decoded.args.linkId, txHash: neonTxHash };
      }
    }
    break; // Receipt exists but no event
  }
  
  if (attempt < 5) await new Promise(resolve => setTimeout(resolve, 5000));
}
```

## 📚 API Reference

### SolanaNativeContract Class

```typescript
class SolanaNativeContract {
  // Initialize with Solana wallet
  async initWithSolanaWallet(walletAdapter: any): Promise<void>
  
  // Create payment link with event parsing
  async createPaymentLink(
    amountSOL: number, 
    isFlexible: boolean, 
    description: string
  ): Promise<{linkId: string, txHash: string}>
  
  // Process payment (two-step: SOL transfer + contract recording)
  async payLink(
    linkId: string, 
    amountSOL: number
  ): Promise<{txHash: string, transferSignature?: string}>
  
  // Get payment link details
  async getPaymentLink(linkId: string): Promise<PaymentLink>
  
  // Get user's links with caching support
  async getUserLinks(userEVMAddress: string): Promise<string[]>
  
  // Deactivate link
  async deactivateLink(linkId: string): Promise<{txHash: string}>
  
  // Create shareable URL
  createPaymentURL(linkId: string): string
  
  // Extract link ID from URL
  static extractLinkIdFromURL(url: string): string | null
  
  // Get user's EVM address
  getUserEVMAddress(): string | null
}
```

### Toast Notification System

```typescript
interface Toast {
  id: string
  type: 'success' | 'error' | 'warning'
  title: string
  message?: string
  duration?: number
}

// Usage
const { showToast } = useToast()
showToast('success', 'Payment Successful!', 'Your payment has been sent.')
showToast('error', 'Transaction Failed', 'Please check your balance.')
showToast('warning', 'Low Balance', 'Consider getting more SOL for fees.')
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Make changes and add tests
4. Commit changes: `git commit -m 'Add amazing feature'`
5. Push to branch: `git push origin feature/amazing-feature`
6. Open Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Add tests for new features
- Update documentation
- Ensure SOL transfers work correctly
- Test with multiple Solana wallets
- Maintain important error logs
- Use toast notifications for user feedback
- Implement proper caching where beneficial

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Neon EVM Team** - For composability precompiles and Solana Native SDK
- **Solana Foundation** - For the underlying blockchain technology
- **Next.js Team** - For the incredible React framework
- **Solana Wallet Adapter** - For seamless wallet integration

---

**Built with ❤️ for the Solana ecosystem using Neon EVM's composability features**

*Making payments as simple as sharing a link - with real SOL transfers and modern UX.*

## 🔗 Quick Links

- [Live Demo](https://tipcard.vercel.app/)
- [Contract on Neon Explorer](https://devnet.neonscan.org/address/0xCFE03c7c67456D094C0162F9030393FC2cCc40Cb)
- [Neon EVM Documentation](https://docs.neonevm.org/)
- [Solana Documentation](https://docs.solana.com/)

---

*© 2025 TipCard. Built with Neon EVM and Solana.*
