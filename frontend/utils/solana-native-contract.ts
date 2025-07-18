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
      // console.log('🔧 Using recommended SolanaNeonAccount approach...')
      // console.log('Wallet public key:', walletAdapter.publicKey.toBase58())

      // Use proxyApi.init with just the public key (like demo)
      const {
        provider,
        chainId,
        solanaUser,
        tokenMintAddress,
        programAddress
      } = await this.proxyApi.init(walletAdapter.publicKey)

      // console.log('- Chain ID:', chainId)
      // console.log('- Neon EVM Program:', programAddress.toBase58())

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
        // console.log('✅ Wallet public keys match correctly!')
      } else {
        console.error('❌ MISMATCH: Wallet adapter and solana user have different public keys!')
        console.error('Wallet adapter:', walletAdapter.publicKey.toBase58())
        console.error('Solana user:', this.solanaUser.publicKey.toBase58())
      }
      // console.log('💰 Final balance address:', this.solanaUser.balanceAddress?.toBase58() || 'Still not available')

      // Create contract instance
      const readOnlyProvider = new ethers.JsonRpcProvider(NEON_CORE_RPC_URL)
      this.contract = new ethers.Contract(CONTRACT_ADDRESS, SOLANA_TIPCARD_ABI, readOnlyProvider)

      try {
        // Check if this EVM address has been used before (has transaction history)
        const txCount = await readOnlyProvider.getTransactionCount(this.solanaUser.neonWallet)
        // console.log('📊 EVM address transaction count:', txCount)

        if (txCount > 0) {
          // console.log('✅ This EVM address has transaction history - it exists on-chain!')
        } else {
          // console.log('ℹ️ This EVM address is new (no transaction history yet)')
          // console.log('ℹ️ The address will be registered on-chain when first transaction is made')
        }
      } catch (verifyError) {
        console.log('⚠️ Could not verify EVM address:', verifyError)
      }

      // Verify contract is deployed at this address
      try {
        const code = await readOnlyProvider.getCode(CONTRACT_ADDRESS)
        if (code === '0x') {
          console.warn('⚠️ No contract code found at address:', CONTRACT_ADDRESS)
          console.log('This might mean the contract is not deployed or address is incorrect')
        } else {
          // console.log('✅ Contract found at address')
          // console.log('✅ Contract found and ready for transactions')
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

    // Convert SOL to lamports using ethers for precision (1 SOL = 1e9 lamports)
    const amountLamports = ethers.parseUnits(suggestedAmountSOL.toString(), 9)
    let signature: string = ''

    try {
      // Get current nonce (exactly like working examples)
      const nonce = Number(await this.proxyApi.getTransactionCount(this.solanaUser.neonWallet))
      // console.log('Current nonce:', nonce)

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

      // console.log('Submitting transaction...')
      signature = await this.connection.sendRawTransaction(signedTransaction.serialize())

      // console.log('🔗 Signature:', signature)

      // Wait for Solana confirmation first (like the test)
      console.log(`Processing payment link...`);
      await this.connection.confirmTransaction({
        signature: signature,
        ...(await this.connection.getLatestBlockhash())
      });
      // console.log(`✅ Solana transaction confirmed`);

      // Wait additional time for Neon processing (like the test)
      // console.log(`Waiting for Neon EVM processing...`);
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 more seconds like test

      // Check transaction status
      try {
        // console.log(`Getting Neon EVM transaction details...`);

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
        // console.log("Neon EVM txn result: ", neonTxResult);

        if (neonTxResult.result && neonTxResult.result.hash) {
          const neonTxHash = neonTxResult.result.hash;
          // console.log(`✅ Neon EVM payment hash: ${neonTxHash}`);

          // Retry getting the transaction receipt with proper waiting
          let actualLinkId: string | null = null;
          
          for (let attempt = 1; attempt <= 5; attempt++) {
            // console.log(`Getting transaction receipt (attempt ${attempt}/5)...`);
            
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
                // console.log(`📋 Transaction receipt found with ${receiptResult.result.logs.length} logs`);
                
                // Look for SolanaLinkCreated event to extract the actual link ID
                for (const log of receiptResult.result.logs) {
                  try {
                    const iface = new ethers.Interface(SOLANA_TIPCARD_ABI);
                    const decoded = iface.parseLog(log);
                    if (decoded && decoded.name === 'SolanaLinkCreated') {
                      actualLinkId = decoded.args.linkId;
                      console.log(`Payment link created successfully!`);
                      // console.log(`   Actual Link ID: ${actualLinkId}`);
                      // console.log(`   Creator: ${decoded.args.evmCreator}`);
                      // console.log(`   Amount: ${ethers.formatUnits(decoded.args.amount, 9)} SOL`);
                      // console.log(`   Description: "${decoded.args.description}"`);
                      
                      return {
                        linkId: actualLinkId ?? neonTxHash,  // Ensure linkId is always a string
                        txHash: neonTxHash    // Keep transaction hash for reference
                      };
                    }
                  } catch (parseError) {
                    // Not our event, continue
                  }
                }
                
                console.log(`⚠️ SolanaLinkCreated event not found in transaction logs`);
                break; // Receipt exists but no event - don't retry
              } else {
                console.log(`⚠️ No transaction receipt found yet (attempt ${attempt}/5)`);
                if (attempt < 5) {
                  console.log(`Waiting 5 seconds before next attempt...`);
                  await new Promise(resolve => setTimeout(resolve, 5000));
                }
              }
            } catch (receiptError: any) {
              console.log(`⚠️ Receipt fetch error (attempt ${attempt}/5): ${receiptError.message}`);
              if (attempt < 5) {
                await new Promise(resolve => setTimeout(resolve, 5000));
              }
            }
          }

          // Fallback to transaction hash if we can't find the event
          console.log(`Using transaction hash as fallback link ID`);
          return {
            linkId: neonTxHash,
            txHash: neonTxHash
          };
        } else {
          console.log(`ℹ️ Neon EVM payment transaction not found yet (may still be processing)`);
        }

      } catch (neonError) {
        console.log(`ℹ️ Could not get Neon payment details: ${(neonError as Error).message}`);
      }

    } catch (confirmError) {
      console.log(`ℹ️ Payment confirmation check: ${(confirmError as Error).message}`);
    }

    console.log(`🎉 Payment transaction completed!`);

    // Return signature as fallback
    return {
      linkId: signature,
      txHash: signature
    };
  } catch(error: any) {
    console.error('Error creating payment link:', error);
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

    console.log('Getting payment link with ID:', linkId)
    console.log('Contract address:', CONTRACT_ADDRESS)

    try {
      const result = await this.contract!.getSolanaPaymentLink(linkId)
      console.log('Raw contract result:', result)

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

      // Check if this looks like an empty/non-existent link (transaction not processed yet)
      if (result.evmCreator === '0x0000000000000000000000000000000000000000' &&
        result.amount === BigInt(0) &&
        !result.isActive) {
        console.warn('Payment link appears to be empty/non-existent')

        // If this looks like a transaction hash (66 chars, starts with 0x), provide helpful info
        if (linkId.length === 66 && linkId.startsWith('0x')) {
          console.log('💡 This appears to be a transaction hash - the payment link may still be processing')
          console.log('💡 Neon operators will eventually process this transaction and create the payment link')
          console.log('💡 You can bookmark this link and try again in a few minutes')

          // For now, don't throw an error - let the UI handle the empty data gracefully
          console.log('Returning empty payment link data - transaction may still be processing')
        }
      }

      return paymentLink
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

    // Convert SOL to lamports using ethers for precision
    const amountLamports = ethers.parseUnits(amountSOL.toString(), 9)

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
        lamports: Number(amountLamports)
      })

      // Create transaction
      const transferTx = new Transaction().add(transferIx)

      // Get fresh recent blockhash right before signing
      console.log('Getting fresh blockhash for SOL transfer...')
      const { blockhash, lastValidBlockHeight: transferBlockHeight } = await this.connection.getLatestBlockhash('confirmed')
      console.log('Fresh SOL transfer blockhash:', blockhash)
      console.log('Last valid block height:', transferBlockHeight)

      transferTx.recentBlockhash = blockhash
      transferTx.feePayer = this.solanaUser.publicKey

      // Sign and send the SOL transfer immediately
      console.log('Signing and sending SOL transfer with fresh blockhash...')
      const signedTransferTx = await this.solanaUser.walletAdapter.signTransaction(transferTx)
      transferSignature = await this.connection.sendRawTransaction(signedTransferTx.serialize())

      console.log('SOL transfer sent:', transferSignature)

      // Wait for transfer confirmation using the modern API
      await this.connection.confirmTransaction({
        signature: transferSignature,
        ...(await this.connection.getLatestBlockhash())
      })
      console.log('SOL transfer confirmed')

      // Step 2: Record the payment in the contract
      console.log('Step 2: Recording payment in contract...')

      // Convert Solana PublicKey to bytes32
      const payerSolanaBytes32 = zeroPadValue(hexlify(this.solanaUser.publicKey.toBytes()), 32)

      // Get current nonce
      const nonce = Number(await this.proxyApi.getTransactionCount(this.solanaUser.neonWallet))
      console.log('Current nonce:', nonce)

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
      console.log('Getting fresh blockhash for contract call...')
      const { blockhash: contractBlockhash, lastValidBlockHeight: contractBlockHeight } = await this.connection.getLatestBlockhash('confirmed')
      console.log('Fresh contract call blockhash:', contractBlockhash)
      console.log('Last valid block height:', contractBlockHeight)

      scheduledTransaction.recentBlockhash = contractBlockhash
      scheduledTransaction.feePayer = this.solanaUser.publicKey

      // Sign with wallet adapter (frontend approach)
      console.log('Signing contract call with fresh blockhash...')
      const signedTx = await this.solanaUser.walletAdapter.signTransaction(scheduledTransaction)

      // Send transaction immediately
      console.log('Sending contract call transaction immediately...')
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
      // Get current nonce
      const nonce = Number(await this.proxyApi.getTransactionCount(this.solanaUser.neonWallet))
      console.log('Current nonce:', nonce)

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
      console.log('Getting fresh blockhash for deactivate transaction...')
      const { blockhash, lastValidBlockHeight: deactivateBlockHeight } = await this.connection.getLatestBlockhash('confirmed')
      console.log('Fresh deactivate blockhash:', blockhash)
      console.log('Last valid block height:', deactivateBlockHeight)

      scheduledTransaction.recentBlockhash = blockhash
      scheduledTransaction.feePayer = this.solanaUser.publicKey

      // Sign with wallet adapter (frontend approach)
      console.log('Signing deactivate transaction with fresh blockhash...')
      const signedTx = await this.solanaUser.walletAdapter.signTransaction(scheduledTransaction)

      // Send transaction immediately
      console.log('Sending deactivate transaction immediately...')
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