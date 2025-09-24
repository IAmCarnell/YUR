/**
 * Pay App - DeFi wallet integration and payments interface
 */

import React, { useState, useEffect } from 'react'
import { ethWallet, WalletInfo, TokenInfo, createMockWallet, formatAddress, formatTokenAmount, NETWORKS } from '../../lib/eth-wallet'
import { triggerAction } from '../../lib/rewards'

interface PayAppProps {
  isVisible: boolean
  onClose: () => void
}

export const PayApp: React.FC<PayAppProps> = ({ isVisible, onClose }) => {
  const [wallet, setWallet] = useState<WalletInfo | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [view, setView] = useState<'wallet' | 'send' | 'receive' | 'defi'>('wallet')
  const [tokens, setTokens] = useState<TokenInfo[]>([])
  const [sendForm, setSendForm] = useState({
    to: '',
    amount: '',
    token: 'ETH'
  })
  const [transactions, setTransactions] = useState([
    { id: '1', type: 'received', amount: '0.5 ETH', from: '0x123...abc', timestamp: Date.now() - 3600000 },
    { id: '2', type: 'sent', amount: '100 USDC', to: '0x456...def', timestamp: Date.now() - 7200000 },
    { id: '3', type: 'defi', amount: '0.25 ETH', protocol: 'Uniswap', timestamp: Date.now() - 86400000 }
  ])
  const [isDemo, setIsDemo] = useState(false)

  // Initialize wallet connection
  useEffect(() => {
    if (isVisible) {
      triggerAction('app_launch')
      
      // Check if already connected
      if (ethWallet.isConnected()) {
        setWallet(ethWallet.getWallet())
      }

      // Set up event listeners
      ethWallet.on('connected', (walletInfo) => {
        setWallet(walletInfo)
        setIsConnecting(false)
      })

      ethWallet.on('disconnected', () => {
        setWallet(null)
      })

      ethWallet.on('error', (error) => {
        console.error('Wallet error:', error)
        setIsConnecting(false)
      })
    }
  }, [isVisible])

  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      await ethWallet.connect()
    } catch (error) {
      console.error('Failed to connect wallet:', error)
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    await ethWallet.disconnect()
    setWallet(null)
  }

  const handleDemoMode = () => {
    const mockWallet = createMockWallet()
    setWallet(mockWallet)
    setIsDemo(true)
    setTokens([
      { symbol: 'USDC', name: 'USD Coin', address: '0xa0b86a33e6417c7d6d5d2dd268b252b8d36ef67e', decimals: 6, balance: '1,234.56' },
      { symbol: 'DAI', name: 'Dai Stablecoin', address: '0x6b175474e89094c44da98b954eedeac495271d0f', decimals: 18, balance: '567.89' },
      { symbol: 'YUR', name: 'YUR Token', address: '0x1234567890abcdef1234567890abcdef12345678', decimals: 18, balance: '10,000' }
    ])
  }

  const handleSendTransaction = async () => {
    if (!wallet) return

    try {
      if (isDemo) {
        // Simulate transaction for demo
        const newTx = {
          id: Date.now().toString(),
          type: 'sent' as const,
          amount: `${sendForm.amount} ${sendForm.token}`,
          to: sendForm.to,
          timestamp: Date.now()
        }
        setTransactions(prev => [newTx, ...prev])
        setSendForm({ to: '', amount: '', token: 'ETH' })
        alert('Demo transaction sent!')
      } else {
        // Real transaction (simplified)
        const txHash = await ethWallet.sendTransaction({
          to: sendForm.to,
          value: sendForm.token === 'ETH' ? sendForm.amount : undefined
        })
        console.log('Transaction sent:', txHash)
      }
    } catch (error) {
      console.error('Transaction failed:', error)
      alert('Transaction failed: ' + (error as Error).message)
    }
  }

  if (!isVisible) return null

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '90%',
      maxWidth: '800px',
      height: '85%',
      background: 'rgba(26, 26, 46, 0.95)',
      backdropFilter: 'blur(15px)',
      borderRadius: '20px',
      border: '1px solid rgba(0, 188, 212, 0.3)',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '20px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h2 style={{ 
            margin: '0 0 8px 0', 
            color: 'white', 
            fontSize: '24px',
            fontWeight: '600'
          }}>
            💎 YUR Pay
          </h2>
          <p style={{ margin: 0, color: '#888', fontSize: '14px' }}>
            DeFi wallet and payments for the metaverse
          </p>
        </div>

        <button
          onClick={onClose}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            padding: '8px 12px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          ✕ Close
        </button>
      </div>

      {!wallet ? (
        /* Wallet Connection Screen */
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px'
        }}>
          <div style={{ fontSize: '80px', marginBottom: '20px' }}>👛</div>
          <h3 style={{ color: 'white', fontSize: '24px', marginBottom: '16px' }}>
            Connect Your Wallet
          </h3>
          <p style={{ color: '#888', fontSize: '16px', marginBottom: '40px', textAlign: 'center' }}>
            Connect your Ethereum wallet to start making payments, trading, and accessing DeFi features
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '300px' }}>
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              style={{
                background: 'linear-gradient(135deg, #f6933a 0%, #e86632 100%)',
                border: 'none',
                borderRadius: '12px',
                color: 'white',
                padding: '16px 24px',
                cursor: isConnecting ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                opacity: isConnecting ? 0.6 : 1
              }}
            >
              <span>🦊</span>
              {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
            </button>

            <button
              onClick={handleDemoMode}
              style={{
                background: 'rgba(0, 188, 212, 0.2)',
                border: '1px solid #00bcd4',
                borderRadius: '12px',
                color: 'white',
                padding: '16px 24px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              🎮 Demo Mode
            </button>
          </div>

          <div style={{
            marginTop: '40px',
            padding: '20px',
            background: 'rgba(255, 152, 0, 0.1)',
            borderRadius: '12px',
            border: '1px solid rgba(255, 152, 0, 0.3)',
            maxWidth: '400px'
          }}>
            <h4 style={{ color: '#ff9800', margin: '0 0 8px 0', fontSize: '16px' }}>
              ⚠️ Security Notice
            </h4>
            <p style={{ color: '#ccc', fontSize: '12px', lineHeight: '1.4', margin: 0 }}>
              Only connect wallets you trust. YUR Pay will never ask for your seed phrase or private keys.
              Always verify transaction details before confirming.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Wallet Info Header */}
          <div style={{
            padding: '20px',
            background: 'rgba(76, 175, 80, 0.1)',
            borderBottom: '1px solid rgba(76, 175, 80, 0.3)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: '#4caf50'
                }} />
                <span style={{ color: 'white', fontWeight: '600' }}>
                  {formatAddress(wallet.address)}
                </span>
                {isDemo && (
                  <span style={{
                    background: 'rgba(255, 152, 0, 0.2)',
                    color: '#ff9800',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '10px',
                    fontWeight: '600'
                  }}>
                    DEMO
                  </span>
                )}
              </div>
              <div style={{ color: '#888', fontSize: '12px' }}>
                Chain: {NETWORKS.ETHEREUM.name} • Balance: {formatTokenAmount(wallet.balance)} ETH
              </div>
            </div>

            <button
              onClick={handleDisconnect}
              style={{
                background: 'rgba(244, 67, 54, 0.2)',
                border: '1px solid #f44336',
                borderRadius: '8px',
                color: '#f44336',
                padding: '6px 12px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '600'
              }}
            >
              Disconnect
            </button>
          </div>

          {/* Navigation Tabs */}
          <div style={{
            padding: '20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            gap: '10px'
          }}>
            {[
              { key: 'wallet', label: '👛 Wallet' },
              { key: 'send', label: '📤 Send' },
              { key: 'receive', label: '📥 Receive' },
              { key: 'defi', label: '🔄 DeFi' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setView(key as any)}
                style={{
                  background: view === key ? 'rgba(0, 188, 212, 0.2)' : 'transparent',
                  border: view === key ? '1px solid #00bcd4' : '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: 'white',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: view === key ? '600' : '400'
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
            {view === 'wallet' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Balance Cards */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '16px'
                }}>
                  <div style={{
                    background: 'rgba(0, 188, 212, 0.1)',
                    borderRadius: '16px',
                    padding: '20px',
                    border: '1px solid rgba(0, 188, 212, 0.3)'
                  }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>Ξ</div>
                    <div style={{ color: 'white', fontSize: '20px', fontWeight: '600' }}>
                      {formatTokenAmount(wallet.balance, 4)} ETH
                    </div>
                    <div style={{ color: '#888', fontSize: '12px' }}>
                      ≈ $2,450.00 USD
                    </div>
                  </div>

                  {tokens.map(token => (
                    <div
                      key={token.symbol}
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '16px',
                        padding: '20px',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                      }}
                    >
                      <div style={{ fontSize: '24px', marginBottom: '8px' }}>
                        {token.symbol === 'USDC' ? '💵' : token.symbol === 'DAI' ? '🟡' : '💎'}
                      </div>
                      <div style={{ color: 'white', fontSize: '18px', fontWeight: '600' }}>
                        {token.balance} {token.symbol}
                      </div>
                      <div style={{ color: '#888', fontSize: '12px' }}>
                        {token.name}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Recent Transactions */}
                <div>
                  <h3 style={{ color: 'white', fontSize: '18px', marginBottom: '16px' }}>
                    Recent Transactions
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {transactions.map(tx => (
                      <div
                        key={tx.id}
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '12px',
                          padding: '16px',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ fontSize: '20px' }}>
                            {tx.type === 'sent' ? '📤' : tx.type === 'received' ? '📥' : '🔄'}
                          </div>
                          <div>
                            <div style={{ color: 'white', fontSize: '14px', fontWeight: '600' }}>
                              {tx.type === 'sent' ? 'Sent' : tx.type === 'received' ? 'Received' : 'DeFi'}
                            </div>
                            <div style={{ color: '#888', fontSize: '12px' }}>
                              {new Date(tx.timestamp).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ 
                            color: tx.type === 'sent' ? '#f44336' : '#4caf50', 
                            fontSize: '14px', 
                            fontWeight: '600' 
                          }}>
                            {tx.type === 'sent' ? '-' : '+'}{tx.amount}
                          </div>
                          <div style={{ color: '#888', fontSize: '12px' }}>
                            {'to' in tx ? formatAddress(tx.to) : 
                             'from' in tx ? formatAddress(tx.from) : 
                             tx.protocol}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {view === 'send' && (
              <div style={{ maxWidth: '400px', margin: '0 auto' }}>
                <h3 style={{ color: 'white', fontSize: '20px', marginBottom: '20px' }}>
                  Send Tokens
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ color: '#888', fontSize: '12px', marginBottom: '8px', display: 'block' }}>
                      Recipient Address
                    </label>
                    <input
                      type="text"
                      placeholder="0x..."
                      value={sendForm.to}
                      onChange={(e) => setSendForm(prev => ({ ...prev, to: e.target.value }))}
                      style={{
                        width: '100%',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        padding: '12px',
                        color: 'white',
                        fontSize: '14px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ color: '#888', fontSize: '12px', marginBottom: '8px', display: 'block' }}>
                      Amount
                    </label>
                    <input
                      type="number"
                      placeholder="0.0"
                      value={sendForm.amount}
                      onChange={(e) => setSendForm(prev => ({ ...prev, amount: e.target.value }))}
                      style={{
                        width: '100%',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        padding: '12px',
                        color: 'white',
                        fontSize: '14px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ color: '#888', fontSize: '12px', marginBottom: '8px', display: 'block' }}>
                      Token
                    </label>
                    <select
                      value={sendForm.token}
                      onChange={(e) => setSendForm(prev => ({ ...prev, token: e.target.value }))}
                      style={{
                        width: '100%',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        padding: '12px',
                        color: 'white',
                        fontSize: '14px'
                      }}
                    >
                      <option value="ETH">ETH</option>
                      {tokens.map(token => (
                        <option key={token.symbol} value={token.symbol}>
                          {token.symbol}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={handleSendTransaction}
                    disabled={!sendForm.to || !sendForm.amount}
                    style={{
                      background: !sendForm.to || !sendForm.amount 
                        ? 'rgba(255, 255, 255, 0.1)' 
                        : '#00bcd4',
                      border: 'none',
                      borderRadius: '12px',
                      color: 'white',
                      padding: '16px',
                      cursor: !sendForm.to || !sendForm.amount ? 'not-allowed' : 'pointer',
                      fontSize: '16px',
                      fontWeight: '600',
                      marginTop: '20px',
                      opacity: !sendForm.to || !sendForm.amount ? 0.5 : 1
                    }}
                  >
                    Send Transaction
                  </button>
                </div>
              </div>
            )}

            {view === 'receive' && (
              <div style={{ maxWidth: '400px', margin: '0 auto', textAlign: 'center' }}>
                <h3 style={{ color: 'white', fontSize: '20px', marginBottom: '20px' }}>
                  Receive Tokens
                </h3>
                
                <div style={{
                  background: 'white',
                  padding: '20px',
                  borderRadius: '16px',
                  marginBottom: '20px'
                }}>
                  <div style={{ 
                    width: '200px', 
                    height: '200px', 
                    margin: '0 auto',
                    background: '#000',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '12px'
                  }}>
                    QR Code<br />
                    {formatAddress(wallet.address)}
                  </div>
                </div>

                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '20px'
                }}>
                  <div style={{ color: '#888', fontSize: '12px', marginBottom: '8px' }}>
                    Your Address
                  </div>
                  <div style={{ 
                    color: 'white', 
                    fontSize: '14px', 
                    fontWeight: '600',
                    wordBreak: 'break-all'
                  }}>
                    {wallet.address}
                  </div>
                </div>

                <button
                  onClick={() => navigator.clipboard.writeText(wallet.address)}
                  style={{
                    background: '#00bcd4',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    padding: '12px 24px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  📋 Copy Address
                </button>
              </div>
            )}

            {view === 'defi' && (
              <div>
                <h3 style={{ color: 'white', fontSize: '20px', marginBottom: '20px' }}>
                  DeFi Protocols
                </h3>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '16px'
                }}>
                  {[
                    { name: 'Uniswap', icon: '🦄', description: 'Decentralized exchange', apy: '12.5%' },
                    { name: 'Aave', icon: '👻', description: 'Lending protocol', apy: '8.2%' },
                    { name: 'Compound', icon: '🏛️', description: 'Money markets', apy: '6.8%' },
                    { name: 'Yearn', icon: '🧠', description: 'Yield farming', apy: '15.7%' }
                  ].map(protocol => (
                    <div
                      key={protocol.name}
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '16px',
                        padding: '20px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <div style={{ fontSize: '32px' }}>{protocol.icon}</div>
                        <div>
                          <div style={{ color: 'white', fontSize: '18px', fontWeight: '600' }}>
                            {protocol.name}
                          </div>
                          <div style={{ color: '#888', fontSize: '12px' }}>
                            {protocol.description}
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ 
                        background: 'rgba(76, 175, 80, 0.1)',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        marginBottom: '12px'
                      }}>
                        <div style={{ color: '#4caf50', fontSize: '14px', fontWeight: '600' }}>
                          APY: {protocol.apy}
                        </div>
                      </div>

                      <button
                        style={{
                          background: 'rgba(0, 188, 212, 0.2)',
                          border: '1px solid #00bcd4',
                          borderRadius: '8px',
                          color: 'white',
                          padding: '8px 16px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '600',
                          width: '100%'
                        }}
                      >
                        Connect
                      </button>
                    </div>
                  ))}
                </div>

                <div style={{
                  marginTop: '30px',
                  padding: '20px',
                  background: 'rgba(255, 152, 0, 0.1)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 152, 0, 0.3)'
                }}>
                  <h4 style={{ color: '#ff9800', margin: '0 0 8px 0', fontSize: '16px' }}>
                    ⚠️ DeFi Disclaimer
                  </h4>
                  <p style={{ color: '#ccc', fontSize: '12px', lineHeight: '1.4', margin: 0 }}>
                    DeFi protocols involve smart contract risks. Always DYOR (Do Your Own Research) 
                    and never invest more than you can afford to lose. APY rates are variable and not guaranteed.
                  </p>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}