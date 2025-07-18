'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Copy, CheckCircle, ExternalLink, DollarSign, User, Clock, Trash2, RefreshCw } from 'lucide-react'
import { solanaNativeContract, PaymentLink } from '@/utils/solana-native-contract'
import { useToast } from '@/components/Toast'

interface DisplayLink extends PaymentLink {
  id: string
  url: string
}

interface CachedDisplayLink {
  id: string
  url: string
  evmCreator: string
  solanaCreator: string
  amount: string // BigInt stored as string
  isFlexible: boolean
  isActive: boolean
  totalReceived: string // BigInt stored as string
  paymentCount: number
  description: string
}

interface CachedData {
  links: CachedDisplayLink[]
  timestamp: number
  userAddress: string
  solanaPublicKey: string
}

export const MyLinks = () => {
  const { publicKey, wallet } = useWallet()
  const { showToast } = useToast()
  const [links, setLinks] = useState<DisplayLink[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Cache duration: 5 minutes
  const CACHE_DURATION = 5 * 60 * 1000

  // Helper functions to handle BigInt serialization
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

  useEffect(() => {
    if (publicKey) {
      // Try to load from cache first without wallet initialization
      loadLinksFromCacheFirst()
    }
  }, [publicKey])

  const loadLinksFromCacheFirst = async () => {
    if (!publicKey) return

    const publicKeyStr = publicKey.toBase58()
    
    // Look for cached data by Solana public key
    const addressMappingKey = `evm_address_${publicKeyStr}`
    const cachedEvmAddress = localStorage.getItem(addressMappingKey)
    
    if (cachedEvmAddress) {
      // We have the EVM address, check for cached links
      const cacheKey = getCacheKey(cachedEvmAddress)
      const cachedData = loadFromCache(cachedEvmAddress)
      
      if (cachedData && isCacheValid(cachedData, cachedEvmAddress) && cachedData.solanaPublicKey === publicKeyStr) {
        // Found valid cache, load it
        const displayLinks = cachedData.links.map(linkFromCache)
        setLinks(displayLinks)
        setLastUpdated(new Date(cachedData.timestamp))
        return // Don't fetch from contract
      }
    }

    // No valid cache found, proceed with wallet initialization and fetch
    await loadLinksWithCache()
  }

  const getCacheKey = useCallback((userAddress: string) => {
    return `payment_links_${userAddress}`
  }, [])

  const loadFromCache = useCallback((userAddress: string): CachedData | null => {
    try {
      const cached = localStorage.getItem(getCacheKey(userAddress))
      if (cached) {
        const data: CachedData = JSON.parse(cached)
        return data
      }
    } catch (error) {
      console.warn('Error loading from cache:', error)
    }
    return null
  }, [getCacheKey])

  const saveToCache = useCallback((userAddress: string, links: DisplayLink[]) => {
    if (!publicKey) return
    
    try {
      const publicKeyStr = publicKey.toBase58()
      const cacheData: CachedData = {
        links: links.map(linkToCache),
        timestamp: Date.now(),
        userAddress,
        solanaPublicKey: publicKeyStr
      }
      
      // Save the links cache
      localStorage.setItem(getCacheKey(userAddress), JSON.stringify(cacheData))
      
      // Save the EVM address mapping for quick lookup
      localStorage.setItem(`evm_address_${publicKeyStr}`, userAddress)
      
      setLastUpdated(new Date())
    } catch (error) {
      console.warn('Error saving to cache:', error)
    }
  }, [getCacheKey, publicKey])

  const isCacheValid = useCallback((cachedData: CachedData, userAddress: string): boolean => {
    if (!cachedData || cachedData.userAddress !== userAddress) {
      return false
    }
    const now = Date.now()
    return (now - cachedData.timestamp) < CACHE_DURATION
  }, [CACHE_DURATION])

  const loadLinksWithCache = async (forceRefresh = false) => {
    if (!publicKey) return

    setIsLoading(true)
    try {
      // Initialize Solana Native SDK to get EVM address
      let userAddress = null
      try {
        await solanaNativeContract.initWithSolanaWallet(wallet?.adapter)
        userAddress = solanaNativeContract.getUserEVMAddress()
      } catch (error) {
        console.warn('Could not initialize Solana Native SDK:', error)
      }

      if (!userAddress) {
        setLinks([])
        return
      }

      // Check cache first unless forced refresh
      if (!forceRefresh) {
        const cachedData = loadFromCache(userAddress)
        if (cachedData && isCacheValid(cachedData, userAddress)) {
          const displayLinks = cachedData.links.map(linkFromCache)
          setLinks(displayLinks)
          setLastUpdated(new Date(cachedData.timestamp))
          setIsLoading(false)
          return
        }
      }

      // Fetch from contract
      await fetchFromContract(userAddress)
    } catch (error) {
      console.error('Error loading links:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchFromContract = async (userAddress: string) => {
    try {
      // Get user's payment links from contract
      const linkIds = await solanaNativeContract.getUserLinks(userAddress)
      const userLinks: DisplayLink[] = []

      // Fetch details for each link
      for (const linkId of linkIds) {
        try {
          const linkData = await solanaNativeContract.getPaymentLink(linkId)
          const url = solanaNativeContract.createPaymentURL(linkId)
          
          userLinks.push({
            ...linkData,
            id: linkId,
            url: url
          })
        } catch (error) {
          console.error(`Error fetching link ${linkId}:`, error)
        }
      }

      const sortedLinks = userLinks.reverse() // Show newest first
      setLinks(sortedLinks)
      saveToCache(userAddress, sortedLinks)
    } catch (error) {
      console.error('Error fetching from contract:', error)
      throw error
    }
  }

  const handleRefresh = async () => {
    if (!publicKey) return
    
    setIsRefreshing(true)
    try {
      await loadLinksWithCache(true) // Force refresh
      showToast('success', 'Refreshed', 'Payment history updated successfully')
    } catch (error) {
      showToast('error', 'Refresh Failed', 'Could not update payment history')
    } finally {
      setIsRefreshing(false)
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
      await solanaNativeContract.deactivateLink(linkId)
      showToast('success', 'Link Deactivated', 'Payment link deactivated successfully!')
      
      // Invalidate cache and refresh
      await loadLinksWithCache(true)
    } catch (error) {
      console.error('Error deactivating link:', error)
      showToast('error', 'Deactivation Failed', error instanceof Error ? error.message : 'Unknown error')
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
        <div>
          <h2 className="text-xl font-semibold">My Payment Links</h2>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground mt-1">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading || isRefreshing}
          className="bg-secondary hover:bg-secondary/80 text-secondary-foreground font-medium py-2 px-4 rounded-lg transition-colors flex items-center space-x-2"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{isLoading ? 'Loading...' : isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
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