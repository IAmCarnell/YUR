/**
 * YUR Plugin Loader - Dynamic plugin system for extensible applications
 */

import React from 'react'

export interface PluginManifest {
  id: string
  name: string
  version: string
  description: string
  author: string
  icon?: string
  category: 'utility' | 'productivity' | 'entertainment' | 'system' | 'other'
  entryPoint: string
  permissions?: string[]
  dependencies?: string[]
}

export interface Plugin {
  manifest: PluginManifest
  component: React.ComponentType<any>
  api?: Record<string, any>
  initialize?: () => Promise<void>
  destroy?: () => Promise<void>
}

export interface PluginRegistry {
  [pluginId: string]: Plugin
}

export class YURPluginLoader {
  private plugins: PluginRegistry = {}
  private loadedPlugins = new Set<string>()

  // Load plugin from URL
  async loadPlugin(manifest: PluginManifest, baseUrl?: string): Promise<Plugin> {
    try {
      const fullUrl = baseUrl ? `${baseUrl}/${manifest.entryPoint}` : manifest.entryPoint
      
      // Dynamic import of the plugin module
      const module = await import(/* @vite-ignore */ fullUrl)
      
      const plugin: Plugin = {
        manifest,
        component: module.default || module.component,
        api: module.api,
        initialize: module.initialize,
        destroy: module.destroy
      }

      // Initialize plugin if it has an init function
      if (plugin.initialize) {
        await plugin.initialize()
      }

      this.plugins[manifest.id] = plugin
      this.loadedPlugins.add(manifest.id)
      
      return plugin
    } catch (error) {
      throw new Error(`Failed to load plugin ${manifest.id}: ${error}`)
    }
  }

  // Load plugin from inline definition (for demo)
  loadInlinePlugin(plugin: Plugin): void {
    this.plugins[plugin.manifest.id] = plugin
    this.loadedPlugins.add(plugin.manifest.id)
  }

  // Get loaded plugin
  getPlugin(pluginId: string): Plugin | null {
    return this.plugins[pluginId] || null
  }

  // Get all loaded plugins
  getLoadedPlugins(): Plugin[] {
    return Object.values(this.plugins)
  }

  // Check if plugin is loaded
  isLoaded(pluginId: string): boolean {
    return this.loadedPlugins.has(pluginId)
  }

  // Unload plugin
  async unloadPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins[pluginId]
    if (!plugin) return

    // Call destroy if available
    if (plugin.destroy) {
      await plugin.destroy()
    }

    delete this.plugins[pluginId]
    this.loadedPlugins.delete(pluginId)
  }

  // Get plugins by category
  getPluginsByCategory(category: string): Plugin[] {
    return Object.values(this.plugins).filter(
      plugin => plugin.manifest.category === category
    )
  }
}

// Global plugin loader instance
export const pluginLoader = new YURPluginLoader()

// Demo plugins for marketplace
export const DEMO_PLUGINS: PluginManifest[] = [
  {
    id: 'weather-widget',
    name: 'Weather Widget',
    version: '1.0.0',
    description: 'Real-time weather information display',
    author: 'YUR Community',
    icon: '🌤️',
    category: 'utility',
    entryPoint: './plugins/weather.js',
    permissions: ['geolocation', 'network']
  },
  {
    id: 'todo-app',
    name: 'Smart Todo',
    version: '2.1.0',
    description: 'AI-powered task management with priority scoring',
    author: 'ProductiveTech',
    icon: '✅',
    category: 'productivity',
    entryPoint: './plugins/todo.js',
    permissions: ['storage', 'notifications']
  },
  {
    id: 'music-player',
    name: 'Spatial Audio Player',
    version: '1.5.0',
    description: '3D spatial audio music player with mandala visualization',
    author: 'AudioSpatial',
    icon: '🎵',
    category: 'entertainment',
    entryPoint: './plugins/music.js',
    permissions: ['audio', 'storage']
  },
  {
    id: 'code-editor',
    name: 'Collaborative Code Editor',
    version: '3.0.0',
    description: 'Real-time collaborative code editing with syntax highlighting',
    author: 'DevTools Inc',
    icon: '💻',
    category: 'productivity',
    entryPoint: './plugins/editor.js',
    permissions: ['storage', 'network']
  },
  {
    id: 'mindmap-3d',
    name: '3D Mind Mapper',
    version: '1.2.0',
    description: 'Create and explore mind maps in 3D space',
    author: 'ThinkSpace',
    icon: '🧠',
    category: 'productivity',
    entryPoint: './plugins/mindmap.js',
    permissions: ['storage', 'canvas3d']
  }
]

// Plugin installation simulation
export async function installPlugin(manifest: PluginManifest): Promise<boolean> {
  // Simulate installation process
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`Installing plugin: ${manifest.name}`)
      resolve(true)
    }, 1000 + Math.random() * 2000)
  })
}

// Create demo inline plugins for immediate use
export function createDemoPlugins(): void {
  // Load demo plugins with simple text components (non-JSX)
  pluginLoader.loadInlinePlugin({
    manifest: DEMO_PLUGINS[0],
    component: () => 'Weather Widget: Sunny, 72°F' as any
  })

  pluginLoader.loadInlinePlugin({
    manifest: DEMO_PLUGINS[1], 
    component: () => 'Smart Todo: Complete YUR OS integration' as any
  })
}