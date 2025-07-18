'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { MyLinks } from '@/components/MyLinks'
import { SimplePaymentLink } from '@/components/SimplePaymentLink'
import { SimplePaymentProcessor } from '@/components/SimplePaymentProcessor'

export default function Home() {
  const [activeTab, setActiveTab] = useState<'create' | 'pay' | 'history'>('create')

  useEffect(() => {
    // Check for payment ID in URL on component mount
    const urlParams = new URLSearchParams(window.location.search)
    const payParam = urlParams.get('pay')
    
    if (payParam && payParam.trim()) {
      // If there's a payment ID, switch to Pay tab
      setActiveTab('pay')
    } else {
      // Default to Create tab if no payment ID
      setActiveTab('create')
    }
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-lg text-muted-foreground">
              Create instant payment links powered by Neon EVM for Solana users
            </p>
          </div>

          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex space-x-1 mb-6 overflow-x-auto">
              <button
                onClick={() => setActiveTab('create')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'create'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                Create Link
              </button>
              <button
                onClick={() => setActiveTab('pay')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'pay'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                Pay
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'history'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                History
              </button>
            </div>

            {activeTab === 'create' && <SimplePaymentLink />}
            {activeTab === 'pay' && <SimplePaymentProcessor />}
            {activeTab === 'history' && <MyLinks />}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}