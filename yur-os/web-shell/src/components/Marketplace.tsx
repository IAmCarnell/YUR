/**
 * Marketplace Component - Plugin marketplace and dynamic loading interface
 */

import React, { useState, useEffect } from 'react'
import { pluginLoader, DEMO_PLUGINS, PluginManifest, createDemoPlugins, installPlugin } from '../lib/plugin-loader'
import { triggerAction } from '../lib/rewards'

interface MarketplaceProps {
  isVisible: boolean
  onClose: () => void
}

export const Marketplace: React.FC<MarketplaceProps> = ({ isVisible, onClose }) => {
  const [availablePlugins, setAvailablePlugins] = useState<PluginManifest[]>(DEMO_PLUGINS)
  const [loadedPlugins, setLoadedPlugins] = useState(pluginLoader.getLoadedPlugins())
  const [selectedPlugin, setSelectedPlugin] = useState<PluginManifest | null>(null)
  const [installing, setInstalling] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [view, setView] = useState<'marketplace' | 'installed' | 'plugin-detail'>('marketplace')

  // Initialize demo plugins
  useEffect(() => {
    if (isVisible) {
      createDemoPlugins()
      setLoadedPlugins(pluginLoader.getLoadedPlugins())
      triggerAction('app_launch')
    }
  }, [isVisible])

  // Filter plugins based on search and category
  const filteredPlugins = availablePlugins.filter(plugin => {
    const matchesSearch = plugin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         plugin.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || plugin.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Handle plugin installation
  const handleInstallPlugin = async (plugin: PluginManifest) => {
    setInstalling(prev => new Set(prev).add(plugin.id))
    
    try {
      const success = await installPlugin(plugin)
      if (success) {
        // Simulate plugin loading with demo component
        const demoComponents: Record<string, React.ComponentType> = {
          'weather-widget': () => (
            <div style={{ padding: '20px', textAlign: 'center', background: 'rgba(76, 175, 80, 0.1)', borderRadius: '12px' }}>
              <h3>🌤️ Weather Widget</h3>
              <div style={{ fontSize: '24px', margin: '10px 0' }}>72°F</div>
              <p style={{ color: '#888' }}>Sunny with light clouds</p>
              <small style={{ opacity: 0.7 }}>Demo Plugin Active</small>
            </div>
          ),
          'todo-app': () => (
            <div style={{ padding: '20px', background: 'rgba(33, 150, 243, 0.1)', borderRadius: '12px' }}>
              <h3>✅ Smart Todo</h3>
              <div style={{ textAlign: 'left', margin: '10px 0' }}>
                <div style={{ margin: '5px 0' }}>☑️ Complete YUR OS integration</div>
                <div style={{ margin: '5px 0' }}>⭕ Design spatial UI</div>
                <div style={{ margin: '5px 0' }}>⭕ Implement AR features</div>
              </div>
              <small style={{ opacity: 0.7 }}>AI-Powered Task Management</small>
            </div>
          ),
          'music-player': () => (
            <div style={{ padding: '20px', textAlign: 'center', background: 'rgba(156, 39, 176, 0.1)', borderRadius: '12px' }}>
              <h3>🎵 Spatial Audio Player</h3>
              <div style={{ margin: '10px 0' }}>♪ Now Playing: Quantum Dreams</div>
              <div style={{ fontSize: '12px', color: '#888' }}>3D Audio Processing Active</div>
              <small style={{ opacity: 0.7 }}>Mandala Visualization Ready</small>
            </div>
          )
        }

        const component = demoComponents[plugin.id] || (() => (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h3>{plugin.icon} {plugin.name}</h3>
            <p>{plugin.description}</p>
            <small>Demo Plugin Loaded</small>
          </div>
        ))

        pluginLoader.loadInlinePlugin({
          manifest: plugin,
          component
        })
        
        setLoadedPlugins(pluginLoader.getLoadedPlugins())
      }
    } catch (error) {
      console.error('Failed to install plugin:', error)
    } finally {
      setInstalling(prev => {
        const newSet = new Set(prev)
        newSet.delete(plugin.id)
        return newSet
      })
    }
  }

  // Handle plugin uninstall
  const handleUninstallPlugin = async (pluginId: string) => {
    try {
      await pluginLoader.unloadPlugin(pluginId)
      setLoadedPlugins(pluginLoader.getLoadedPlugins())
    } catch (error) {
      console.error('Failed to uninstall plugin:', error)
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
      maxWidth: '1000px',
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
            🏪 App Marketplace
          </h2>
          <p style={{ margin: 0, color: '#888', fontSize: '14px' }}>
            Discover and install plugins to extend YUR OS
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

      {/* Navigation */}
      <div style={{
        padding: '20px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        gap: '20px',
        alignItems: 'center'
      }}>
        {/* View Tabs */}
        <div style={{ display: 'flex', gap: '10px' }}>
          {[
            { key: 'marketplace', label: '🏪 Browse', count: filteredPlugins.length },
            { key: 'installed', label: '💾 Installed', count: loadedPlugins.length }
          ].map(({ key, label, count }) => (
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
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              {label}
              <span style={{
                background: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                padding: '2px 8px',
                fontSize: '12px'
              }}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* Search and Filter */}
        {view === 'marketplace' && (
          <>
            <input
              type="text"
              placeholder="Search plugins..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                padding: '8px 12px',
                color: 'white',
                fontSize: '14px',
                flex: 1
              }}
            />

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                padding: '8px 12px',
                color: 'white',
                fontSize: '14px'
              }}
            >
              <option value="all">All Categories</option>
              <option value="utility">Utility</option>
              <option value="productivity">Productivity</option>
              <option value="entertainment">Entertainment</option>
              <option value="system">System</option>
            </select>
          </>
        )}
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
        {view === 'marketplace' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '20px'
          }}>
            {filteredPlugins.map((plugin) => {
              const isInstalled = pluginLoader.isLoaded(plugin.id)
              const isInstalling = installing.has(plugin.id)

              return (
                <div
                  key={plugin.id}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '16px',
                    padding: '20px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    setSelectedPlugin(plugin)
                    setView('plugin-detail')
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ fontSize: '32px' }}>{plugin.icon}</div>
                    <div>
                      <h3 style={{ 
                        margin: '0 0 4px 0', 
                        color: 'white', 
                        fontSize: '18px',
                        fontWeight: '600'
                      }}>
                        {plugin.name}
                      </h3>
                      <div style={{ fontSize: '12px', color: '#888' }}>
                        v{plugin.version} • {plugin.category}
                      </div>
                    </div>
                  </div>

                  <p style={{ 
                    margin: '0 0 16px 0', 
                    color: '#ccc', 
                    fontSize: '14px',
                    lineHeight: '1.4'
                  }}>
                    {plugin.description}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '12px', color: '#888' }}>
                      by {plugin.author}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (isInstalled) {
                          handleUninstallPlugin(plugin.id)
                        } else {
                          handleInstallPlugin(plugin)
                        }
                      }}
                      disabled={isInstalling}
                      style={{
                        background: isInstalled ? '#f44336' : '#00bcd4',
                        border: 'none',
                        borderRadius: '8px',
                        color: 'white',
                        padding: '6px 12px',
                        cursor: isInstalling ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                        fontWeight: '600',
                        opacity: isInstalling ? 0.6 : 1
                      }}
                    >
                      {isInstalling ? '⏳ Installing...' : isInstalled ? '🗑️ Uninstall' : '⬇️ Install'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {view === 'installed' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
            gap: '20px'
          }}>
            {loadedPlugins.map((plugin) => {
              const Component = plugin.component

              return (
                <div
                  key={plugin.manifest.id}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '16px',
                    padding: '20px',
                    border: '1px solid rgba(0, 188, 212, 0.3)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ 
                      margin: 0, 
                      color: 'white', 
                      fontSize: '16px',
                      fontWeight: '600'
                    }}>
                      {plugin.manifest.icon} {plugin.manifest.name}
                    </h3>

                    <button
                      onClick={() => handleUninstallPlugin(plugin.manifest.id)}
                      style={{
                        background: '#f44336',
                        border: 'none',
                        borderRadius: '6px',
                        color: 'white',
                        padding: '4px 8px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Remove
                    </button>
                  </div>

                  {/* Plugin Preview */}
                  <div style={{
                    background: 'rgba(0, 0, 0, 0.2)',
                    borderRadius: '12px',
                    overflow: 'hidden'
                  }}>
                    <Component />
                  </div>
                </div>
              )
            })}

            {loadedPlugins.length === 0 && (
              <div style={{
                textAlign: 'center',
                color: '#888',
                fontSize: '16px',
                padding: '40px'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
                <div>No plugins installed yet</div>
                <button
                  onClick={() => setView('marketplace')}
                  style={{
                    background: '#00bcd4',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    padding: '10px 20px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    marginTop: '16px'
                  }}
                >
                  Browse Marketplace
                </button>
              </div>
            )}
          </div>
        )}

        {view === 'plugin-detail' && selectedPlugin && (
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <button
              onClick={() => setView('marketplace')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#00bcd4',
                cursor: 'pointer',
                fontSize: '14px',
                marginBottom: '20px'
              }}
            >
              ← Back to Marketplace
            </button>

            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '20px',
              padding: '30px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
                <div style={{ fontSize: '64px' }}>{selectedPlugin.icon}</div>
                <div>
                  <h1 style={{ 
                    margin: '0 0 8px 0', 
                    color: 'white', 
                    fontSize: '28px',
                    fontWeight: '600'
                  }}>
                    {selectedPlugin.name}
                  </h1>
                  <div style={{ fontSize: '14px', color: '#888', marginBottom: '8px' }}>
                    Version {selectedPlugin.version} • {selectedPlugin.category}
                  </div>
                  <div style={{ fontSize: '14px', color: '#888' }}>
                    by {selectedPlugin.author}
                  </div>
                </div>
              </div>

              <p style={{ 
                color: '#ccc', 
                fontSize: '16px',
                lineHeight: '1.6',
                marginBottom: '20px'
              }}>
                {selectedPlugin.description}
              </p>

              {selectedPlugin.permissions && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ color: 'white', marginBottom: '8px' }}>Permissions Required:</h4>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {selectedPlugin.permissions.map((permission) => (
                      <span
                        key={permission}
                        style={{
                          background: 'rgba(255, 152, 0, 0.2)',
                          border: '1px solid rgba(255, 152, 0, 0.5)',
                          borderRadius: '16px',
                          padding: '4px 12px',
                          fontSize: '12px',
                          color: '#ffab40'
                        }}
                      >
                        {permission}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  if (pluginLoader.isLoaded(selectedPlugin.id)) {
                    handleUninstallPlugin(selectedPlugin.id)
                  } else {
                    handleInstallPlugin(selectedPlugin)
                  }
                }}
                style={{
                  background: pluginLoader.isLoaded(selectedPlugin.id) ? '#f44336' : '#00bcd4',
                  border: 'none',
                  borderRadius: '12px',
                  color: 'white',
                  padding: '12px 24px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                  width: '100%'
                }}
              >
                {pluginLoader.isLoaded(selectedPlugin.id) ? '🗑️ Uninstall' : '⬇️ Install Plugin'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}