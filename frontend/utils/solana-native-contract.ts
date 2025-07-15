import { Connection, PublicKey, Keypair } from '@solana/web3.js'
import { NeonProxyRpcApi, createBalanceAccountInstruction } from '@neonevm/solana-sign'
import { ethers, hexlify, zeroPadValue } from 'ethers'

// Contract ABI - only the functions we need
const SOLANA_TIPCARD_ABI = [
  "function createSolanaPaymentLink(uint64 _suggestedAmount, bool _isFlexible, string memory _description) external returns (bytes32)",
  "function getSolanaPaymentLink(bytes32 _linkId) external view returns (tuple(address evmCreator, bytes32 solanaCreator, uint64 amount, bool isFlexible, bool isActive, uint64 totalReceived, uint32 paymentCount, string description))",
  "function getUserSolanaLinks(address _user) external view returns (bytes32[] memory)",
  "function paySolanaLink(bytes32 _linkId, uint64 _amount, bytes32 _payerSolanaAccount) external",
  "function deactivateSolanaLink(bytes32 _linkId) external",
  "function getSolanaUserAddress(address _evmAddress) external view returns (bytes32)",
  "function isSolanaUser(address _evmAddress) external view returns (bool)",
  "event SolanaLinkCreated(bytes32 indexed linkId, address indexed evmCreator, bytes32 indexed solanaCreator, uint64 amount, bool isFlexible, string description)",
  "event SolanaPaymentReceived(bytes32 indexed linkId, bytes32 indexed payerSolana, bytes32 indexed recipientSolana, uint64 amount)"
]

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_TIPCARD_CONTRACT_ADDRESS || '0x388Ed79FE1A0A05fa5adC14863EB153a31E4e469'
const NEON_CORE_RPC_URL = process.env.NEXT_PUBLIC_NEON_RPC_URL || 'https://devnet.neonevm.org'
const NEON_PROXY_RPC_URL = `${NEON_CORE_RPC_URL}/sol`
const SOLANA_RPC_URL = 'https://api.devnet.solana.com'

export interface PaymentLink {
  evmCreator: string
  solanaCreator: string
  amount: bigint
  isFlexible: boolean
  isActive: boolean
  totalReceived: bigint
  paymentCount: number
  description: string
}

export class SolanaNativeContract {
  private connection: Connection
  private proxyApi: NeonProxyRpcApi
  private solanaUser: any
  private provider: any
  private programAddress: PublicKey | null = null
  private chainId: number | null = null
  private contract: ethers.Contract | null = null

  constructor() {
    this.connection = new Connection(SOLANA_RPC_URL, 'confirmed')
    this.proxyApi = new NeonProxyRpcApi(NEON_PROXY_RPC_URL)
  }

  /**
   * Initialize with Solana wallet using the Native SDK
   */
  async initWithSolanaWallet(walletAdapter: any): Promise<void> {
    if (!walletAdapter.publicKey) {
      throw new Error('Wallet not connected')
    }

    try {
      // Initialize the Neon Proxy API with the wallet's public key
      const initResult = await this.proxyApi.init(walletAdapter.publicKey)
      
      this.chainId = initResult.chainId
      this.programAddress = initResult.programAddress
      this.provider = initResult.provider
      this.solanaUser = initResult.solanaUser
      
      // Add wallet adapter to the solana user for signing
      this.solanaUser.walletAdapter = walletAdapter

      // Create contract instance
      this.contract = new ethers.Contract(CONTRACT_ADDRESS, SOLANA_TIPCARD_ABI, this.provider)
      
      // Verify contract is deployed at this address
      try {
        console.log('Verifying contract at address:', CONTRACT_ADDRESS)
        const code = await this.provider.getCode(CONTRACT_ADDRESS)
        console.log('Contract code length:', code.length)
        if (code === '0x') {
          console.warn('⚠️ No contract code found at address:', CONTRACT_ADDRESS)
          console.log('This might mean the contract is not deployed or address is incorrect')
        } else {
          console.log('✅ Contract found at address')
          
          // Check if user's Solana address is registered with Neon EVM
          console.log('Checking Solana user registration...')
          console.log('User EVM address:', this.solanaUser.neonWallet)
          console.log('User Solana address:', this.solanaUser.publicKey.toBase58())
          
          // Get the Solana address that Neon EVM has registered for this user
          const registeredSolanaAddr = await this.contract.getSolanaUserAddress(this.solanaUser.neonWallet)
          console.log('Registered Solana address (from contract):', registeredSolanaAddr)
          
          const isUserRegistered = await this.contract.isSolanaUser(this.solanaUser.neonWallet)
          console.log('Is user registered with contract:', isUserRegistered)
          
          if (!isUserRegistered) {
            console.warn('⚠️ User is not registered as Solana user with Neon EVM')
            console.log('This may happen if the Solana Native SDK initialization did not complete properly')
            console.log('The SDK should automatically register the user during init() call')
            console.log('Attempting to create balance account to complete registration...')
            
            // Try to create the balance account which should register the user
            try {
              const account = await this.connection.getAccountInfo(this.solanaUser.balanceAddress)
              if (account === null) {
                console.log('Balance account does not exist, will create it on first transaction')
              } else {
                console.log('Balance account exists, user should be registered')
              }
            } catch (balanceError) {
              console.log('Could not check balance account:', balanceError)
            }
          } else {
            console.log('✅ User is properly registered')
          }
        }
      } catch (verifyError) {
        console.warn('Failed to verify contract:', verifyError)
      }
      
    } catch (error) {
      console.error('Failed to initialize Solana Native SDK:', error)
      throw error
    }
  }

  /**
   * Create a payment link using Solana Native SDK
   */
  async createPaymentLink(
    suggestedAmountSOL: number,
    isFlexible: boolean,
    description: string
  ): Promise<{ linkId: string; txHash: string }> {
    if (!this.solanaUser || !this.contract) {
      throw new Error('Please connect wallet first')
    }

    // Convert SOL to lamports (1 SOL = 1e9 lamports)
    const amountLamports = Math.floor(suggestedAmountSOL * 1e9)

    try {
      // Get nonce
      const nonce = Number(await this.proxyApi.getTransactionCount(this.solanaUser.neonWallet))

      // Prepare contract call data
      const iface = new ethers.Interface(SOLANA_TIPCARD_ABI)
      const data = iface.encodeFunctionData('createSolanaPaymentLink', [
        amountLamports,
        isFlexible,
        description
      ])

      // Create transaction data
      const transactionData = {
        from: this.solanaUser.neonWallet,
        to: CONTRACT_ADDRESS,
        data: data
      }

      // Estimate gas
      const transactionGas = await this.proxyApi.estimateScheduledTransactionGas({
        solanaPayer: this.solanaUser.publicKey,
        transactions: [transactionData],
      })

      // Create scheduled transaction
      const { scheduledTransaction } = await this.proxyApi.createScheduledTransaction({
        transactionGas,
        transactionData,
        nonce
      })

      // Check if balance account exists, if not create it
      const account = await this.connection.getAccountInfo(this.solanaUser.balanceAddress)
      if (account === null) {
        scheduledTransaction.instructions.unshift(
          createBalanceAccountInstruction(
            this.programAddress!,
            this.solanaUser.publicKey,
            this.solanaUser.neonWallet,
            this.chainId!
          )
        )
      }

      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash()
      scheduledTransaction.recentBlockhash = blockhash
      scheduledTransaction.feePayer = this.solanaUser.publicKey

      // Sign with wallet adapter
      const signedTx = await this.solanaUser.walletAdapter.signTransaction(scheduledTransaction)
      
      // Send transaction
      await this.connection.sendRawTransaction(signedTx.serialize())

      // Wait for transaction execution on Neon EVM
      const transactionStatus = await this.proxyApi.waitTransactionTreeExecution(
        this.solanaUser.neonWallet, 
        nonce, 
        60000 // 60 second timeout
      )

      console.log('Transaction status:', transactionStatus)

      if (transactionStatus.length === 0 || transactionStatus[0].status !== 'Success') {
        throw new Error('Transaction failed to execute on Neon EVM')
      }

      const txHash = transactionStatus[0].transactionHash
      console.log('Transaction hash:', txHash)

      // Get the link ID from transaction receipt
      const receipt = await this.proxyApi.getTransactionReceipt(txHash)
      console.log('Full transaction receipt:', JSON.stringify(receipt, null, 2))
      
      let linkId = ''
      
      // Check if the transaction was successful
      if (receipt.result?.status !== '0x1') {
        throw new Error('Transaction failed - status: ' + receipt.result?.status)
      }

      // Enhanced debugging of the receipt structure
      console.log('Receipt status:', receipt.result?.status)
      console.log('Receipt logs array:', receipt.result?.logs)
      console.log('Receipt logs length:', receipt.result?.logs?.length)
      console.log('Receipt logsBloom:', receipt.result?.logsBloom)
      console.log('Receipt contractAddress:', receipt.result?.contractAddress)
      console.log('Receipt gasUsed:', receipt.result?.gasUsed)
      console.log('Receipt effectiveGasPrice:', receipt.result?.effectiveGasPrice)

      // Check if there's a different location for logs
      console.log('Raw transaction data:', receipt.result?.neonRawTransaction)
      
      // Note: getTransaction method not available on NeonProxyRpcApi
      // The transaction receipt already contains the necessary information

      // Extract all neonLogs from solanaTransactions
      const allNeonLogs: any[] = []
      if (receipt.result?.solanaTransactions) {
        for (const solTx of receipt.result.solanaTransactions) {
          if (solTx.solanaInstructions) {
            for (const instruction of solTx.solanaInstructions) {
              if (instruction.neonLogs && instruction.neonLogs.length > 0) {
                allNeonLogs.push(...instruction.neonLogs)
              }
            }
          }
        }
      }

      console.log('Found', allNeonLogs.length, 'neonLogs to parse')

      // Try to parse logs for the SolanaLinkCreated event
      if (allNeonLogs.length > 0) {
        for (const log of allNeonLogs) {
          try {
            console.log('Trying to parse neonLog:', log)
            
            // Check if this log is from our contract
            if (log.address.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()) {
              console.log('Log is from our contract, parsing...')
              
              // Convert the log to the format expected by ethers
              const ethersLog = {
                address: log.address,
                data: log.data,
                topics: log.topics
              }
              
              const parsedLog = iface.parseLog(ethersLog)
              console.log('Parsed log:', parsedLog)
              
              if (parsedLog?.name === 'SolanaLinkCreated') {
                linkId = parsedLog.args.linkId
                console.log('✅ Found link ID from SolanaLinkCreated event:', linkId)
                break
              }
            } else {
              console.log('Log from different contract:', log.address)
            }
          } catch (e) {
            console.log('Failed to parse neonLog:', e)
            // Skip logs that can't be parsed
          }
        }
      } else {
        console.warn('No neonLogs found in transaction receipt!')
        console.log('This might indicate:')
        console.log('1. The contract call failed silently')
        console.log('2. The contract is not at the expected address')
        console.log('3. The contract function call reverted')
        console.log('4. Events are not being emitted properly')
        
        // Try calling the contract read method to see if data was actually stored
        try {
          console.log('Attempting to read payment link using transaction hash as ID...')
          const testData = await this.contract!.getSolanaPaymentLink(txHash)
          console.log('Contract read result:', testData)
        } catch (readError) {
          console.log('Contract read failed:', readError)
        }
      }

      // If we couldn't extract from logs, investigate further
      if (!linkId) {
        console.error('Could not extract link ID from transaction events!')
        console.log('This suggests the contract call may have failed silently')
        
        // Check if the transaction actually reverted
        console.log('Checking for revert data...')
        if (receipt.result?.neonRevertData) {
          console.log('Revert data found:', receipt.result.neonRevertData)
          try {
            // Try to decode the revert reason
            const revertReason = ethers.toUtf8String(receipt.result.neonRevertData)
            console.log('Revert reason:', revertReason)
            throw new Error(`Contract call reverted: ${revertReason}`)
          } catch (decodeError) {
            console.log('Could not decode revert reason:', decodeError)
            throw new Error('Contract call reverted with unknown reason')
          }
        }
        
        // Let's try to understand why the event wasn't emitted
        console.log('Analyzing function call...')
        console.log('Contract address:', CONTRACT_ADDRESS)
        console.log('From address:', this.solanaUser.neonWallet)
        console.log('Function data in raw tx:', receipt.result?.neonRawTransaction)
        
        // Check if user is registered
        try {
          const isRegistered = await this.contract!.isSolanaUser(this.solanaUser.neonWallet)
          console.log('Is user registered as Solana user:', isRegistered)
          
          if (!isRegistered) {
            throw new Error('User is not registered as a Solana user with the contract. This is required to create payment links.')
          }
        } catch (registrationError) {
          console.error('Failed to check user registration:', registrationError)
          throw registrationError
        }
        
        // If we get here, something else went wrong
        throw new Error('Payment link creation failed: Contract call executed but no event was emitted. The transaction may have failed silently.')
      }

      return {
        linkId,
        txHash
      }
    } catch (error: any) {
      console.error('Error creating payment link:', error)
      throw error
    }
  }

  /**
   * Initialize read-only contract access (without wallet)
   */
  private async initReadOnlyContract(): Promise<void> {
    if (!this.contract) {
      // Create a simple JSON RPC provider for read operations
      const readOnlyProvider = new ethers.JsonRpcProvider(NEON_CORE_RPC_URL)
      this.contract = new ethers.Contract(CONTRACT_ADDRESS, SOLANA_TIPCARD_ABI, readOnlyProvider)
    }
  }

  /**
   * Get payment link details
   */
  async getPaymentLink(linkId: string): Promise<PaymentLink> {
    // Initialize contract if not already done
    if (!this.contract) {
      await this.initReadOnlyContract()
    }

    try {
      const result = await this.contract!.getSolanaPaymentLink(linkId)
      
      return {
        evmCreator: result.evmCreator,
        solanaCreator: result.solanaCreator,
        amount: result.amount,
        isFlexible: result.isFlexible,
        isActive: result.isActive,
        totalReceived: result.totalReceived,
        paymentCount: Number(result.paymentCount),
        description: result.description
      }
    } catch (error) {
      console.error('Contract call error:', error)
      throw new Error('Payment link not found or contract error')
    }
  }

  /**
   * Get user's payment links
   */
  async getUserLinks(userEVMAddress: string): Promise<string[]> {
    // Initialize contract if not already done
    if (!this.contract) {
      await this.initReadOnlyContract()
    }

    try {
      return await this.contract!.getUserSolanaLinks(userEVMAddress)
    } catch (error) {
      console.error('Error getting user links:', error)
      return []
    }
  }

  /**
   * Pay a payment link using Solana Native SDK
   */
  async payLink(
    linkId: string,
    amountSOL: number
  ): Promise<{ txHash: string; transferSignature?: string }> {
    if (!this.solanaUser || !this.contract) {
      throw new Error('Please connect wallet first')
    }

    console.log('Starting payment process...')
    console.log('Link ID:', linkId)
    console.log('Amount SOL:', amountSOL)

    // First, get the payment link details to find the recipient
    const linkData = await this.getPaymentLink(linkId)
    console.log('Payment link data:', linkData)

    if (!linkData.isActive) {
      throw new Error('Payment link is no longer active')
    }

    // Convert SOL to lamports
    const amountLamports = Math.floor(amountSOL * 1e9)
    
    let transferSignature: string | undefined

    try {
      // Step 1: Perform the actual SOL transfer first
      console.log('Step 1: Performing SOL transfer...')
      console.log('From:', this.solanaUser.publicKey.toBase58())
      console.log('To recipient bytes32:', linkData.solanaCreator)
      console.log('Amount lamports:', amountLamports)

      // Convert recipient Solana address from bytes32 to PublicKey
      // Remove '0x' prefix if present
      const hexString = linkData.solanaCreator.startsWith('0x') 
        ? linkData.solanaCreator.slice(2) 
        : linkData.solanaCreator
      
      // Convert hex string to byte array
      const bytes = new Uint8Array(hexString.match(/.{2}/g)?.map(byte => parseInt(byte, 16)) || [])
      
      // For bytes32 from Solana addresses, we need to find the actual 32-byte public key
      // The bytes32 should contain the 32-byte Solana public key, possibly with leading zeros
      let recipientPubkey
      
      if (bytes.length === 32) {
        // Direct conversion from 32 bytes
        recipientPubkey = new (await import('@solana/web3.js')).PublicKey(bytes)
      } else if (bytes.length > 32) {
        // Take the last 32 bytes if it's longer
        const last32Bytes = bytes.slice(-32)
        recipientPubkey = new (await import('@solana/web3.js')).PublicKey(last32Bytes)
      } else {
        // Pad with leading zeros if shorter
        const paddedBytes = new Uint8Array(32)
        paddedBytes.set(bytes, 32 - bytes.length)
        recipientPubkey = new (await import('@solana/web3.js')).PublicKey(paddedBytes)
      }

      console.log('Recipient PublicKey:', recipientPubkey.toBase58())

      // Create the SOL transfer transaction
      const { SystemProgram, Transaction } = await import('@solana/web3.js')

      // Create transfer instruction
      const transferIx = SystemProgram.transfer({
        fromPubkey: this.solanaUser.publicKey,
        toPubkey: recipientPubkey,
        lamports: amountLamports
      })

      // Create transaction
      const transferTx = new Transaction().add(transferIx)
      
      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash()
      transferTx.recentBlockhash = blockhash
      transferTx.feePayer = this.solanaUser.publicKey

      // Sign and send the SOL transfer
      const signedTransferTx = await this.solanaUser.walletAdapter.signTransaction(transferTx)
      transferSignature = await this.connection.sendRawTransaction(signedTransferTx.serialize())
      
      console.log('SOL transfer sent:', transferSignature)
      
      // Wait for transfer confirmation
      await this.connection.confirmTransaction(transferSignature, 'confirmed')
      console.log('SOL transfer confirmed')

      // Step 2: Record the payment in the contract
      console.log('Step 2: Recording payment in contract...')
      
      // Convert Solana PublicKey to bytes32
      const payerSolanaBytes32 = zeroPadValue(hexlify(this.solanaUser.publicKey.toBytes()), 32)

      // Get nonce
      const nonce = Number(await this.proxyApi.getTransactionCount(this.solanaUser.neonWallet))

      // Prepare contract call data
      const iface = new ethers.Interface(SOLANA_TIPCARD_ABI)
      const data = iface.encodeFunctionData('paySolanaLink', [
        linkId,
        amountLamports,
        payerSolanaBytes32
      ])

      // Create transaction data
      const transactionData = {
        from: this.solanaUser.neonWallet,
        to: CONTRACT_ADDRESS,
        data: data
      }

      // Estimate gas
      const transactionGas = await this.proxyApi.estimateScheduledTransactionGas({
        solanaPayer: this.solanaUser.publicKey,
        transactions: [transactionData],
      })

      // Create scheduled transaction
      const { scheduledTransaction } = await this.proxyApi.createScheduledTransaction({
        transactionGas,
        transactionData,
        nonce
      })

      // Get recent blockhash
      const contractBlockhash = await this.connection.getLatestBlockhash()
      scheduledTransaction.recentBlockhash = contractBlockhash.blockhash
      scheduledTransaction.feePayer = this.solanaUser.publicKey

      // Sign with wallet adapter
      const signedTx = await this.solanaUser.walletAdapter.signTransaction(scheduledTransaction)
      
      // Send transaction
      await this.connection.sendRawTransaction(signedTx.serialize())

      // Wait for transaction execution on Neon EVM
      const transactionStatus = await this.proxyApi.waitTransactionTreeExecution(
        this.solanaUser.neonWallet, 
        nonce, 
        60000
      )

      if (transactionStatus.length === 0 || transactionStatus[0].status !== 'Success') {
        console.warn('Contract payment recording failed, but SOL transfer succeeded')
        console.log('Transfer signature:', transferSignature)
        // Don't throw error - the payment went through even if recording failed
      }

      console.log('Payment completed successfully!')
      console.log('SOL transfer:', transferSignature)
      console.log('Contract record:', transactionStatus[0]?.transactionHash)

      return {
        txHash: transactionStatus[0]?.transactionHash || 'contract-recording-failed',
        transferSignature
      }
    } catch (error: any) {
      console.error('Error paying link:', error)
      if (transferSignature) {
        console.log('Note: SOL transfer may have succeeded:', transferSignature)
      }
      throw error
    }
  }

  /**
   * Deactivate a payment link
   */
  async deactivateLink(linkId: string): Promise<{ txHash: string }> {
    if (!this.solanaUser || !this.contract) {
      throw new Error('Please connect wallet first')
    }

    try {
      // Get nonce
      const nonce = Number(await this.proxyApi.getTransactionCount(this.solanaUser.neonWallet))

      // Prepare contract call data
      const iface = new ethers.Interface(SOLANA_TIPCARD_ABI)
      const data = iface.encodeFunctionData('deactivateSolanaLink', [linkId])

      // Create transaction data
      const transactionData = {
        from: this.solanaUser.neonWallet,
        to: CONTRACT_ADDRESS,
        data: data
      }

      // Estimate gas
      const transactionGas = await this.proxyApi.estimateScheduledTransactionGas({
        solanaPayer: this.solanaUser.publicKey,
        transactions: [transactionData],
      })

      // Create scheduled transaction
      const { scheduledTransaction } = await this.proxyApi.createScheduledTransaction({
        transactionGas,
        transactionData,
        nonce
      })

      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash()
      scheduledTransaction.recentBlockhash = blockhash
      scheduledTransaction.feePayer = this.solanaUser.publicKey

      // Sign with wallet adapter
      const signedTx = await this.solanaUser.walletAdapter.signTransaction(scheduledTransaction)
      
      // Send transaction
      await this.connection.sendRawTransaction(signedTx.serialize())

      // Wait for transaction execution
      const transactionStatus = await this.proxyApi.waitTransactionTreeExecution(
        this.solanaUser.neonWallet, 
        nonce, 
        60000
      )

      if (transactionStatus.length === 0 || transactionStatus[0].status !== 'Success') {
        throw new Error('Deactivation transaction failed to execute on Neon EVM')
      }

      return {
        txHash: transactionStatus[0].transactionHash
      }
    } catch (error: any) {
      throw error
    }
  }

  /**
   * Create a shareable URL for a payment link
   */
  createPaymentURL(linkId: string): string {
    return `${window.location.origin}?pay=${linkId}`
  }

  /**
   * Extract link ID from URL
   */
  static extractLinkIdFromURL(url: string): string | null {
    try {
      const urlObj = new URL(url)
      return urlObj.searchParams.get('pay')
    } catch {
      return null
    }
  }

  /**
   * Get the user's EVM address derived from Solana public key
   */
  getUserEVMAddress(): string | null {
    return this.solanaUser?.neonWallet || null
  }
}

// Export singleton instance
export const solanaNativeContract = new SolanaNativeContract()