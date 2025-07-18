import { Connection, PublicKey, Keypair } from '@solana/web3.js'
import { NeonProxyRpcApi, createBalanceAccountInstruction, SolanaNeonAccount } from '@neonevm/solana-sign'
import { ethers, hexlify, zeroPadValue } from 'ethers'
import ContractABI from './contractABI.json'

// Use the actual deployed contract ABI
const SOLANA_TIPCARD_ABI = ContractABI

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_TIPCARD_CONTRACT_ADDRESS || '0xCFE03c7c67456D094C0162F9030393FC2cCc40Cb'
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
  private chainId: number | null = null
  private contract: ethers.Contract | null = null

  constructor() {
    this.connection = new Connection(SOLANA_RPC_URL, 'confirmed')
    this.proxyApi = new NeonProxyRpcApi(NEON_PROXY_RPC_URL)
  }


  /**
   * Initialize with Solana wallet using the recommended SolanaNeonAccount approach
   */
  async initWithSolanaWallet(walletAdapter: any): Promise<void> {
    if (!walletAdapter.publicKey) {
      throw new Error('Wallet not connected')
    }

    try {

      // Use proxyApi.init with just the public key (like demo)
      const {
        chainId,
        solanaUser
      } = await this.proxyApi.init(walletAdapter.publicKey)


      // Store the result with wallet adapter for signing
      this.chainId = chainId
      this.solanaUser = {
        ...solanaUser,
        walletAdapter: walletAdapter // Add wallet adapter for signing
      }

      // Create balance address if it doesn't exist (using SolanaNeonAccount approach)
      if (!this.solanaUser.balanceAddress) {
        const { SolanaNeonAccount } = await import('@neonevm/solana-sign')
        const account = new SolanaNeonAccount(
          this.solanaUser.publicKey,
          this.solanaUser.neonEvmProgram,
          this.solanaUser.tokenMint,
          this.solanaUser.chainId
        )
        this.solanaUser.balanceAddress = account.balanceAddress
      }

      // Verify they match
      if (walletAdapter.publicKey.toBase58() === this.solanaUser.publicKey.toBase58()) {
        // Wallet public keys match correctly
      } else {
      }

      // Create contract instance
      const readOnlyProvider = new ethers.JsonRpcProvider(NEON_CORE_RPC_URL)
      this.contract = new ethers.Contract(CONTRACT_ADDRESS, SOLANA_TIPCARD_ABI, readOnlyProvider)

      try {
        // Check if this EVM address has been used before (has transaction history)
        const txCount = await readOnlyProvider.getTransactionCount(this.solanaUser.neonWallet)

        if (txCount > 0) {
          // This EVM address has transaction history - it exists on-chain
        } else {
          // This EVM address is new (no transaction history yet)
          // The address will be registered on-chain when first transaction is made
        }
      } catch (verifyError) {
        // Could not verify EVM address
      }

      // Verify contract is deployed at this address
      try {
        const code = await readOnlyProvider.getCode(CONTRACT_ADDRESS)
        if (code === '0x') {
          // No contract code found at address
        }
      } catch (verifyError) {
        // Failed to verify contract
      }

    } catch (error) {
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

    // Convert SOL to lamports using ethers for precision (1 SOL = 1e9 lamports)
    const amountLamports = ethers.parseUnits(suggestedAmountSOL.toString(), 9)
    let signature: string = ''

    try {
      // Get current nonce (exactly like working examples)
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
      let { scheduledTransaction } = await this.proxyApi.createScheduledTransaction({
        transactionGas,
        transactionData,
        nonce
      })

      // Check if balance account exists, if not create it
      const account = await this.connection.getAccountInfo(this.solanaUser.balanceAddress)
      if (account === null) {
        scheduledTransaction.instructions.unshift(
          createBalanceAccountInstruction(
            this.solanaUser.neonEvmProgram,
            this.solanaUser.publicKey,
            this.solanaUser.neonWallet,
            this.chainId!
          )
        )
      }

      // Sign and send transaction using exact test pattern
      const { blockhash } = await this.connection.getLatestBlockhash()
      scheduledTransaction.recentBlockhash = blockhash
      scheduledTransaction.feePayer = this.solanaUser.publicKey

      const signedTransaction = await this.solanaUser.walletAdapter.signTransaction(scheduledTransaction)

      signature = await this.connection.sendRawTransaction(signedTransaction.serialize())


      // Wait for Solana confirmation first (like the test)
      await this.connection.confirmTransaction({
        signature: signature,
        ...(await this.connection.getLatestBlockhash())
      });

      // Wait additional time for Neon processing (like the test)
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 more seconds like test

      // Check transaction status
      try {

        const neonTxResponse = await fetch('https://devnet.neonevm.org/sol', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: "neon_getTransactionBySenderNonce",
            params: [this.solanaUser.neonWallet, nonce],
            id: 1,
            jsonrpc: "2.0"
          })
        });

        const neonTxResult = await neonTxResponse.json();

        if (neonTxResult.result && neonTxResult.result.hash) {
          const neonTxHash = neonTxResult.result.hash;

          // Retry getting the transaction receipt with proper waiting
          let actualLinkId: string | null = null;
          
          for (let attempt = 1; attempt <= 5; attempt++) {
            
            try {
              const receiptResponse = await fetch('https://devnet.neonevm.org/sol', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  method: "eth_getTransactionReceipt",
                  params: [neonTxHash],
                  id: 1,
                  jsonrpc: "2.0"
                })
              });
              
              const receiptResult = await receiptResponse.json();
              
              if (receiptResult.result && receiptResult.result.logs) {
                
                // Look for SolanaLinkCreated event to extract the actual link ID
                for (const log of receiptResult.result.logs) {
                  try {
                    const iface = new ethers.Interface(SOLANA_TIPCARD_ABI);
                    const decoded = iface.parseLog(log);
                    if (decoded && decoded.name === 'SolanaLinkCreated') {
                      actualLinkId = decoded.args.linkId;
                      return {
                        linkId: actualLinkId ?? neonTxHash,  // Ensure linkId is always a string
                        txHash: neonTxHash    // Keep transaction hash for reference
                      };
                    }
                  } catch (parseError) {
                    // Not our event, continue
                  }
                }
                
                break; // Receipt exists but no event - don't retry
              } else {
                if (attempt < 5) {
                  await new Promise(resolve => setTimeout(resolve, 5000));
                }
              }
            } catch (receiptError: any) {
              if (attempt < 5) {
                await new Promise(resolve => setTimeout(resolve, 5000));
              }
            }
          }

          // Fallback to transaction hash if we can't find the event
          return {
            linkId: neonTxHash,
            txHash: neonTxHash
          };
        }

      } catch (neonError) {
        // Could not get Neon payment details
      }

    } catch (confirmError) {
      // Payment confirmation check error
    }

    // Return signature as fallback
    return {
      linkId: signature,
      txHash: signature
    };
  } catch(error: any) {
    throw error;
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

      const paymentLink = {
        evmCreator: result.evmCreator,
        solanaCreator: result.solanaCreator,
        amount: result.amount,
        isFlexible: result.isFlexible,
        isActive: result.isActive,
        totalReceived: result.totalReceived,
        paymentCount: Number(result.paymentCount),
        description: result.description
      }


      return paymentLink
    } catch (error) {
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


    // First, get the payment link details to find the recipient
    const linkData = await this.getPaymentLink(linkId)

    if (!linkData.isActive) {
      throw new Error('Payment link is no longer active')
    }

    // Convert SOL to lamports using ethers for precision
    const amountLamports = ethers.parseUnits(amountSOL.toString(), 9)

    let transferSignature: string | undefined

    try {
      // Step 1: Perform the actual SOL transfer first

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


      // Create the SOL transfer transaction
      const { SystemProgram, Transaction } = await import('@solana/web3.js')

      // Create transfer instruction
      const transferIx = SystemProgram.transfer({
        fromPubkey: this.solanaUser.publicKey,
        toPubkey: recipientPubkey,
        lamports: Number(amountLamports)
      })

      // Create transaction
      const transferTx = new Transaction().add(transferIx)

      // Get fresh recent blockhash right before signing
      const { blockhash } = await this.connection.getLatestBlockhash('confirmed')

      transferTx.recentBlockhash = blockhash
      transferTx.feePayer = this.solanaUser.publicKey

      // Sign and send the SOL transfer immediately
      const signedTransferTx = await this.solanaUser.walletAdapter.signTransaction(transferTx)
      transferSignature = await this.connection.sendRawTransaction(signedTransferTx.serialize())

      // Wait for transfer confirmation using the modern API
      await this.connection.confirmTransaction({
        signature: transferSignature,
        ...(await this.connection.getLatestBlockhash())
      })
      // Step 2: Record the payment in the contract

      // Convert Solana PublicKey to bytes32
      const payerSolanaBytes32 = zeroPadValue(hexlify(this.solanaUser.publicKey.toBytes()), 32)

      // Get current nonce
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
      let { scheduledTransaction } = await this.proxyApi.createScheduledTransaction({
        transactionGas,
        transactionData,
        nonce
      })

      // Get fresh recent blockhash right before signing
      const { blockhash: contractBlockhash } = await this.connection.getLatestBlockhash('confirmed')

      scheduledTransaction.recentBlockhash = contractBlockhash
      scheduledTransaction.feePayer = this.solanaUser.publicKey

      // Sign with wallet adapter (frontend approach)
      const signedTx = await this.solanaUser.walletAdapter.signTransaction(scheduledTransaction)

      // Send transaction immediately
      await this.connection.sendRawTransaction(signedTx.serialize())

      // Wait for transaction execution on Neon EVM
      const transactionStatus = await this.proxyApi.waitTransactionTreeExecution(
        this.solanaUser.neonWallet,
        nonce,
        60000
      )

      if (transactionStatus.length === 0 || transactionStatus[0].status !== 'Success') {
        // Contract payment recording failed, but SOL transfer succeeded
        // Don't throw error - the payment went through even if recording failed
      }

      return {
        txHash: transactionStatus[0]?.transactionHash || 'contract-recording-failed',
        transferSignature
      }
    } catch (error: any) {
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
      // Get current nonce
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
      let { scheduledTransaction } = await this.proxyApi.createScheduledTransaction({
        transactionGas,
        transactionData,
        nonce
      })

      // Get fresh recent blockhash right before signing
      const { blockhash } = await this.connection.getLatestBlockhash('confirmed')

      scheduledTransaction.recentBlockhash = blockhash
      scheduledTransaction.feePayer = this.solanaUser.publicKey

      // Sign with wallet adapter (frontend approach)
      const signedTx = await this.solanaUser.walletAdapter.signTransaction(scheduledTransaction)

      // Send transaction immediately
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