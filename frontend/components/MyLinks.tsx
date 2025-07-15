'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Copy, CheckCircle, ExternalLink, DollarSign, User, Clock, Trash2 } from 'lucide-react'
import { solanaTipCardContract, PaymentLink } from '@/utils/contract'

interface DisplayLink extends PaymentLink {
  id: string
  url: string
}

export const MyLinks = () => {
  const { publicKey } = useWallet()
  const [links, setLinks] = useState<DisplayLink[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    if (publicKey) {
      fetchMyLinks()
    }
  }, [publicKey])

  const fetchMyLinks = async () => {
    if (!publicKey) return

    setIsLoading(true)
    try {
      // Connect to wallet for EVM address if available
      let userAddress = null
      if ((window as any).ethereum) {
        try {
          await solanaTipCardContract.connectWallet((window as any).ethereum)
          const accounts = await (window as any).ethereum.request({ method: 'eth_accounts' })
          userAddress = accounts[0]
        } catch (error) {
          console.warn('Could not connect to EVM wallet:', error)
        }
      }

      if (!userAddress) {
        // If no EVM wallet connected, show empty state with instruction
        setLinks([])
        return
      }

      // Get user's payment links from contract
      const linkIds = await solanaTipCardContract.getUserLinks(userAddress)
      const userLinks: DisplayLink[] = []

      // Fetch details for each link
      for (const linkId of linkIds) {
        try {
          const linkData = await solanaTipCardContract.getPaymentLink(linkId)
          const url = solanaTipCardContract.createPaymentURL(linkId)
          
          userLinks.push({
            ...linkData,
            id: linkId,
            url: url
          })
        } catch (error) {
          console.error(`Error fetching link ${linkId}:`, error)
        }
      }

      setLinks(userLinks.reverse()) // Show newest first
    } catch (error) {
      console.error('Error fetching links:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = async (url: string, linkId: string) => {
    await navigator.clipboard.writeText(url)
    setCopiedId(linkId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const deactivateLink = async (linkId: string) => {
    if (!confirm('Are you sure you want to deactivate this payment link?')) {
      return
    }

    try {
      await solanaTipCardContract.deactivateLink(linkId)
      alert('Payment link deactivated successfully!')
      fetchMyLinks() // Refresh the list
    } catch (error) {
      console.error('Error deactivating link:', error)
      alert(`Failed to deactivate link: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 8)}...${address.slice(-8)}`
  }

  if (!publicKey) {
    return (
      <div className="text-center py-8">
        <div className="bg-secondary/50 rounded-lg p-6 max-w-md mx-auto">
          <h3 className="text-lg font-semibold mb-2">Connect Your Wallet</h3>
          <p className="text-muted-foreground">
            Please connect your Solana wallet to view your payment links.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">My Payment Links</h2>
        <button
          onClick={fetchMyLinks}
          disabled={isLoading}
          className="bg-secondary hover:bg-secondary/80 text-secondary-foreground font-medium py-2 px-4 rounded-lg transition-colors"
        >
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Loading your payment links...</p>
        </div>
      ) : links.length === 0 ? (
        <div className="text-center py-8">
          <div className="bg-secondary/50 rounded-lg p-6 max-w-md mx-auto">
            <h3 className="text-lg font-semibold mb-2">No Payment Links Yet</h3>
            <p className="text-muted-foreground">
              Create your first payment link to start receiving payments.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {links.map((link) => (
            <div key={link.id} className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-neon-400 to-neon-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-xs font-mono">{link.id.slice(-4)}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold">
                      {link.description || 'Payment Request'}
                    </h3>
                    <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                      <span className={`w-2 h-2 rounded-full ${link.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span>{link.isActive ? 'Active' : 'Inactive'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => copyToClipboard(link.url, link.id)}
                    className="p-2 hover:bg-accent rounded-lg transition-colors"
                    title="Copy payment link"
                  >
                    {copiedId === link.id ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  
                  <a
                    href={`?pay=${link.id}`}
                    className="p-2 hover:bg-accent rounded-lg transition-colors"
                    title="Open payment link"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>

                  {link.isActive && (
                    <button
                      onClick={() => deactivateLink(link.id)}
                      className="p-2 hover:bg-accent rounded-lg transition-colors text-red-500"
                      title="Deactivate payment link"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Recipient:</span>
                  <span className="font-mono">{formatAddress(link.solanaCreator)}</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-semibold">
                    {link.isFlexible ? 'Flexible' : `${(Number(link.amount) / 1e9).toFixed(4)} SOL`}
                  </span>
                </div>
              </div>

              {link.paymentCount > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-muted-foreground">Payments received:</span>
                      <span className="font-semibold">{link.paymentCount}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <DollarSign className="w-4 h-4 text-green-500" />
                      <span className="text-muted-foreground">Total received:</span>
                      <span className="font-semibold text-green-500">{(Number(link.totalReceived) / 1e9).toFixed(4)} SOL</span>
                    </div>
                  </div>
                </div>
              )}

              {copiedId === link.id && (
                <div className="mt-4 bg-green-500/10 border border-green-500/20 rounded-lg p-2">
                  <p className="text-sm text-green-500">Payment link copied to clipboard!</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}