/**
 * YUR Collaborative Library - Multi-user real-time collaboration
 * Built on Yjs for CRDT-based synchronization
 */

import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

export interface CollabConfig {
  roomName: string
  wsUrl?: string
  userInfo?: {
    name: string
    color: string
    avatar?: string
  }
}

export interface CollabUser {
  id: string
  name: string
  color: string
  avatar?: string
  cursor?: { x: number; y: number }
  selection?: { start: number; end: number }
}

export class YURCollab {
  private doc: Y.Doc
  private provider: WebsocketProvider | null = null
  private textDoc: Y.Text
  private usersMap: Y.Map<any>
  private awareness: any
  
  constructor(private config: CollabConfig) {
    this.doc = new Y.Doc()
    this.textDoc = this.doc.getText('content')
    this.usersMap = this.doc.getMap('users')
    
    // Connect to WebSocket provider if URL provided
    if (config.wsUrl) {
      this.provider = new WebsocketProvider(
        config.wsUrl,
        config.roomName,
        this.doc
      )
      this.awareness = this.provider.awareness
      
      if (config.userInfo) {
        this.awareness.setLocalStateField('user', config.userInfo)
      }
    }
  }

  // Document operations
  getText(): string {
    return this.textDoc.toString()
  }

  insertText(index: number, text: string): void {
    this.textDoc.insert(index, text)
  }

  deleteText(index: number, length: number): void {
    this.textDoc.delete(index, length)
  }

  // Real-time collaboration
  onTextChange(callback: (text: string) => void): () => void {
    const handler = () => callback(this.getText())
    this.textDoc.observe(handler)
    return () => this.textDoc.unobserve(handler)
  }

  onUsersChange(callback: (users: CollabUser[]) => void): () => void {
    if (!this.awareness) return () => {}
    
    const handler = () => {
      const users: CollabUser[] = []
      this.awareness.getStates().forEach((state: any, clientId: number) => {
        if (state.user) {
          users.push({
            id: clientId.toString(),
            ...state.user
          })
        }
      })
      callback(users)
    }
    
    this.awareness.on('change', handler)
    return () => this.awareness.off('change', handler)
  }

  updateCursor(x: number, y: number): void {
    if (this.awareness) {
      this.awareness.setLocalStateField('cursor', { x, y })
    }
  }

  updateSelection(start: number, end: number): void {
    if (this.awareness) {
      this.awareness.setLocalStateField('selection', { start, end })
    }
  }

  // Persistence
  getDocumentState(): Uint8Array {
    return Y.encodeStateAsUpdate(this.doc)
  }

  loadDocumentState(state: Uint8Array): void {
    Y.applyUpdate(this.doc, state)
  }

  destroy(): void {
    if (this.provider) {
      this.provider.destroy()
    }
    this.doc.destroy()
  }
}

// Factory function for easy instantiation
export function createCollabSession(config: CollabConfig): YURCollab {
  return new YURCollab(config)
}

// Mock WebSocket provider for demo mode
export function createMockCollab(roomName: string): YURCollab {
  return new YURCollab({
    roomName,
    userInfo: {
      name: 'Demo User',
      color: '#00bcd4'
    }
  })
}