/**
 * YUR Plugin Loader - Secure dynamic plugin system for extensible applications
 * Implements security hardening, sandboxing, and validation
 */

import React from 'react'
import { validatePluginManifest, secureDynamicImport, generateSecurityReport, type SecurityAuditResult } from '../utils/pluginSecurity'

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
  component: React.ComponentType<unknown>
  api?: Record<string, unknown>
  initialize?: () => Promise<void>
  destroy?: () => Promise<void>
  securityAudit?: SecurityAuditResult
}

export interface PluginRegistry {
  [pluginId: string]: Plugin
}

export class YURPluginLoader {
  private plugins: PluginRegistry = {}
  private loadedPlugins = new Set<string>()
  private securityAudits = new Map<string, SecurityAuditResult>()

  // Load plugin from URL with security validation
  async loadPlugin(manifest: PluginManifest, baseUrl?: string): Promise<Plugin> {
    try {
      // Security audit of manifest
      const securityAudit = validatePluginManifest(manifest)
      this.securityAudits.set(manifest.id, securityAudit)
      
      if (!securityAudit.passed) {
        const criticalViolations = securityAudit.violations.filter(v => v.severity === 'critical')
        if (criticalViolations.length > 0) {
          throw new Error(`Plugin security audit failed: ${criticalViolations.map(v => v.message).join(', ')}`)
        }
      }
      
      const fullUrl = baseUrl ? `${baseUrl}/${manifest.entryPoint}` : manifest.entryPoint
      
      // Secure dynamic import with sandboxing
      const module = await secureDynamicImport(
        fullUrl, 
        manifest.id, 
        manifest.permissions || []
      )
      
      const plugin: Plugin = {
        manifest,
        component: (module as { default?: React.ComponentType<unknown>; component?: React.ComponentType<unknown> }).default || 
                  (module as { component?: React.ComponentType<unknown> }).component as React.ComponentType<unknown>,
        api: (module as { api?: Record<string, unknown> }).api,
        initialize: (module as { initialize?: () => Promise<void> }).initialize,
        destroy: (module as { destroy?: () => Promise<void> }).destroy,
        securityAudit
      }

      // Validate required component
      if (!plugin.component) {
        throw new Error(`Plugin ${manifest.id} must export a default component or named component export`)
      }

      // Initialize plugin if it has an init function
      if (plugin.initialize) {
        await plugin.initialize()
      }

      this.plugins[manifest.id] = plugin
      this.loadedPlugins.add(manifest.id)
      
      console.log(`Plugin ${manifest.id} loaded with security audit:`, securityAudit)
      return plugin
    } catch (error) {
      this.securityAudits.delete(manifest.id)
      throw new Error(`Failed to load plugin ${manifest.id}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // Load plugin from inline definition (for demo) with security validation
  loadInlinePlugin(plugin: Plugin): void {
    // Validate manifest even for inline plugins
    const securityAudit = validatePluginManifest(plugin.manifest)
    plugin.securityAudit = securityAudit
    this.securityAudits.set(plugin.manifest.id, securityAudit)
    
    if (!securityAudit.passed) {
      console.warn(`Inline plugin ${plugin.manifest.id} has security violations:`, securityAudit.violations)
    }
    
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

  // Get security audit for plugin
  getSecurityAudit(pluginId: string): SecurityAuditResult | null {
    return this.securityAudits.get(pluginId) || null
  }

  // Get plugins by security risk level
  getPluginsByRiskLevel(riskLevel: 'low' | 'medium' | 'high' | 'critical'): Plugin[] {
    return Object.values(this.plugins).filter(plugin => 
      plugin.securityAudit?.riskLevel === riskLevel
    )
  }

  // Unload plugin with cleanup
  async unloadPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins[pluginId]
    if (!plugin) return

    // Call destroy if available
    if (plugin.destroy) {
      try {
        await plugin.destroy()
      } catch (error) {
        console.error(`Error during plugin ${pluginId} cleanup:`, error)
      }
    }

    delete this.plugins[pluginId]
    this.loadedPlugins.delete(pluginId)
    this.securityAudits.delete(pluginId)
    
    console.log(`Plugin ${pluginId} unloaded and cleaned up`)
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