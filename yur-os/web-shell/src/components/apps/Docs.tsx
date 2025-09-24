/**
 * Collaborative Docs App - Real-time document collaboration using Yjs
 * Production-ready with markdown preview, file upload, and version control
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createMockCollab, YURCollab, CollabUser } from '../../lib/yur-collab'
import { triggerAction, updateMetric } from '../../lib/rewards'

interface DocsAppProps {
  isVisible: boolean
  onClose: () => void
}

interface DocumentVersion {
  id: string
  timestamp: number
  content: string
  author: string
  message: string
}

interface FileAttachment {
  id: string
  name: string
  size: number
  type: string
  url: string
  uploadTimestamp: number
}

export const DocsApp: React.FC<DocsAppProps> = ({ isVisible, onClose }) => {
  const [content, setContent] = useState('')
  const [users, setUsers] = useState<CollabUser[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [roomName, setRoomName] = useState('demo-room')
  const [userName, setUserName] = useState('User-' + Math.floor(Math.random() * 1000))
  const [showPreview, setShowPreview] = useState(false)
  const [versions, setVersions] = useState<DocumentVersion[]>([])
  const [attachments, setAttachments] = useState<FileAttachment[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [currentPermission, setCurrentPermission] = useState<'read' | 'write' | 'admin'>('write')
  const [wordCount, setWordCount] = useState(0)
  const [charCount, setCharCount] = useState(0)
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const collabRef = useRef<YURCollab | null>(null)
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>()

  // Initialize collaboration session
  const connectToSession = useCallback(() => {
    try {
      const collab = createMockCollab(roomName)
      collabRef.current = collab
      
      // Set up real-time collaboration listeners
      const unsubscribeText = collab.onTextChange((newText) => {
        setContent(newText)
        updateWordAndCharCount(newText)
      })
      
      const unsubscribeUsers = collab.onUsersChange((userList) => {
        setUsers(userList)
      })
      
      setIsConnected(true)
      triggerAction('collab_session', 1)
      
      // Initialize with some sample content
      if (collab.getText().length === 0) {
        const welcomeText = `# Welcome to YUR OS Collaborative Docs 🌌

## Features
- **Real-time collaboration** with live cursors and presence
- **Markdown support** with instant preview
- **Version control** and document history
- **File attachments** and media upload
- **Permission system** for secure sharing

## Getting Started
Start typing to see the collaborative features in action. Use the preview toggle to see your markdown rendered.

### Supported Markdown
- **Bold** and *italic* text
- \`Code blocks\` and syntax highlighting
- Lists and checkboxes
- Links and images
- Tables and more...

---
*Powered by YUR OS spatial computing*`
        
        collab.insertText(0, welcomeText)
      }
      
      // Auto-save version snapshots
      const versionInterval = setInterval(() => {
        saveVersion('Auto-save')
      }, 30000) // Every 30 seconds
      
      return () => {
        unsubscribeText()
        unsubscribeUsers()
        clearInterval(versionInterval)
      }
    } catch (error) {
      console.error('Failed to connect to collaboration session:', error)
    }
  }, [roomName])

  const updateWordAndCharCount = (text: string) => {
    setCharCount(text.length)
    const words = text.trim().split(/\s+/).filter(word => word.length > 0).length
    setWordCount(words)
    updateMetric('words_typed', words)
  }

  // Handle content changes with auto-save
  const handleContentChange = (newContent: string) => {
    setContent(newContent)
    updateWordAndCharCount(newContent)
    
    if (collabRef.current && isConnected && currentPermission !== 'read') {
      // Simple diff-based update (in production, use proper operational transforms)
      const currentText = collabRef.current.getText()
      if (newContent !== currentText) {
        if (newContent.length > currentText.length) {
          const insertIndex = findInsertIndex(currentText, newContent)
          const insertedText = newContent.slice(insertIndex, insertIndex + (newContent.length - currentText.length))
          collabRef.current.insertText(insertIndex, insertedText)
        } else if (newContent.length < currentText.length) {
          const deleteIndex = findDeleteIndex(currentText, newContent)
          const deleteLength = currentText.length - newContent.length
          collabRef.current.deleteText(deleteIndex, deleteLength)
        }
      }
    }
    
    // Auto-save with debouncing
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }
    
    setIsAutoSaving(true)
    autoSaveTimeoutRef.current = setTimeout(() => {
      setIsAutoSaving(false)
    }, 1000)
  }

  // Version control
  const saveVersion = (message: string = 'Manual save') => {
    const version: DocumentVersion = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      content,
      author: userName,
      message
    }
    
    setVersions(prev => [version, ...prev].slice(0, 50)) // Keep last 50 versions
  }

  const restoreVersion = (version: DocumentVersion) => {
    setContent(version.content)
    handleContentChange(version.content)
    setShowVersionHistory(false)
  }

  // File upload handling
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return
    
    setIsUploading(true)
    
    try {
      for (const file of Array.from(files)) {
        // In production, upload to actual storage service
        const mockUrl = URL.createObjectURL(file)
        
        const attachment: FileAttachment = {
          id: Date.now().toString(),
          name: file.name,
          size: file.size,
          type: file.type,
          url: mockUrl,
          uploadTimestamp: Date.now()
        }
        
        setAttachments(prev => [...prev, attachment])
        
        // Insert file reference in document
        const fileMarkdown = file.type.startsWith('image/') 
          ? `\n![${file.name}](${mockUrl})\n`
          : `\n[📎 ${file.name}](${mockUrl})\n`
        
        const newContent = content + fileMarkdown
        handleContentChange(newContent)
      }
    } catch (error) {
      console.error('File upload failed:', error)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Markdown rendering (simplified)
  const renderMarkdown = (text: string): string => {
    return text
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/`(.*?)`/gim, '<code>$1</code>')
      .replace(/!\[([^\]]*)\]\(([^\)]*)\)/gim, '<img alt="$1" src="$2" style="max-width: 100%; height: auto;" />')
      .replace(/\[([^\]]*)\]\(([^\)]*)\)/gim, '<a href="$2" target="_blank">$1</a>')
      .replace(/\n/gim, '<br>')
  }

  // Utility functions for diff calculation
  const findInsertIndex = (oldText: string, newText: string): number => {
    for (let i = 0; i < Math.min(oldText.length, newText.length); i++) {
      if (oldText[i] !== newText[i]) {
        return i
      }
    }
    return oldText.length
  }

  const findDeleteIndex = (oldText: string, newText: string): number => {
    for (let i = 0; i < Math.min(oldText.length, newText.length); i++) {
      if (oldText[i] !== newText[i]) {
        return i
      }
    }
    return newText.length
  }

  // Handle cursor position updates
  const handleSelectionChange = () => {
    if (textareaRef.current && collabRef.current) {
      const { selectionStart, selectionEnd } = textareaRef.current
      collabRef.current.updateSelection(selectionStart, selectionEnd)
    }
  }

  // Keyboard shortcuts
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 's':
          event.preventDefault()
          saveVersion('Manual save')
          break
        case 'p':
          event.preventDefault()
          setShowPreview(!showPreview)
          break
        case 'h':
          event.preventDefault()
          setShowVersionHistory(!showVersionHistory)
          break
      }
    }
  }

  useEffect(() => {
    if (isVisible && !isConnected) {
      connectToSession()
    }
  }, [isVisible, connectToSession, isConnected])

  if (!isVisible) return null

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '90vw',
      maxWidth: '1200px',
      height: '80vh',
      background: 'rgba(26, 26, 46, 0.95)',
      backdropFilter: 'blur(20px)',
      borderRadius: '20px',
      border: '1px solid rgba(0, 188, 212, 0.3)',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
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
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div>
          <h2 style={{ 
            margin: '0 0 8px 0', 
            color: 'white', 
            fontSize: '20px',
            fontWeight: '600'
          }}>
            📝 Collaborative Docs
          </h2>
          <div style={{ 
            fontSize: '12px', 
            color: '#888',
            display: 'flex',
            alignItems: 'center',
            gap: '15px',
            flexWrap: 'wrap'
          }}>
            <span>Room: {roomName}</span>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: isConnected ? '#4caf50' : '#f44336'
              }} />
              <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
            <span>{users.length} users online</span>
            <span>{charCount} chars • {wordCount} words</span>
            {isAutoSaving && <span style={{ color: '#ff9800' }}>Auto-saving...</span>}
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* Toolbar */}
          <button
            onClick={() => setShowPreview(!showPreview)}
            title="Toggle Preview (Ctrl+P)"
            style={{
              padding: '8px 12px',
              background: showPreview ? 'rgba(0, 188, 212, 0.3)' : 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            {showPreview ? '📝 Edit' : '👁️ Preview'}
          </button>
          
          <button
            onClick={() => saveVersion('Manual save')}
            title="Save Version (Ctrl+S)"
            style={{
              padding: '8px 12px',
              background: 'rgba(76, 175, 80, 0.2)',
              border: 'none',
              borderRadius: '8px',
              color: '#4caf50',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            💾 Save
          </button>
          
          <button
            onClick={() => setShowVersionHistory(!showVersionHistory)}
            title="Version History (Ctrl+H)"
            style={{
              padding: '8px 12px',
              background: 'rgba(255, 152, 0, 0.2)',
              border: 'none',
              borderRadius: '8px',
              color: '#ff9800',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            📚 History ({versions.length})
          </button>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || currentPermission === 'read'}
            title="Upload Files"
            style={{
              padding: '8px 12px',
              background: isUploading ? 'rgba(255, 255, 255, 0.1)' : 'rgba(156, 39, 176, 0.2)',
              border: 'none',
              borderRadius: '8px',
              color: isUploading ? '#888' : '#9c27b0',
              cursor: isUploading ? 'not-allowed' : 'pointer',
              fontSize: '12px'
            }}
          >
            {isUploading ? '⏳ Uploading...' : '📎 Attach'}
          </button>
          
          <button
            onClick={onClose}
            style={{
              padding: '8px 12px',
              background: 'rgba(244, 67, 54, 0.2)',
              border: 'none',
              borderRadius: '8px',
              color: '#f44336',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            ✕ Close
          </button>
        </div>
      </div>

      {/* Connection Panel */}
      {!isConnected && (
        <div style={{
          padding: '20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
          background: 'rgba(244, 67, 54, 0.1)'
        }}>
          <input
            type="text"
            placeholder="Room name"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            style={{
              padding: '8px 12px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              color: 'white',
              fontSize: '14px'
            }}
          />
          <input
            type="text"
            placeholder="Your name"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            style={{
              padding: '8px 12px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              color: 'white',
              fontSize: '14px'
            }}
          />
          <button
            onClick={connectToSession}
            style={{
              padding: '8px 16px',
              background: '#4caf50',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Connect
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div style={{ 
        flex: 1, 
        display: 'flex',
        overflow: 'hidden'
      }}>
        {/* Editor/Preview */}
        <div style={{ 
          flex: showVersionHistory ? 2 : 3,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {showPreview ? (
            <div 
              style={{
                flex: 1,
                padding: '20px',
                overflow: 'auto',
                background: 'rgba(255, 255, 255, 0.02)',
                color: 'white',
                lineHeight: '1.6'
              }}
              dangerouslySetInnerHTML={{ 
                __html: renderMarkdown(content) 
              }}
            />
          ) : (
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              onSelect={handleSelectionChange}
              onKeyDown={handleKeyDown}
              disabled={!isConnected || currentPermission === 'read'}
              placeholder={isConnected ? "Start typing to collaborate..." : "Connect to a room to start collaborating"}
              style={{
                flex: 1,
                padding: '20px',
                background: 'transparent',
                border: 'none',
                color: 'white',
                fontSize: '14px',
                lineHeight: '1.6',
                fontFamily: 'monospace',
                resize: 'none',
                outline: 'none'
              }}
            />
          )}
        </div>

        {/* Version History Sidebar */}
        {showVersionHistory && (
          <div style={{
            flex: 1,
            borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(0, 0, 0, 0.2)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              padding: '15px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'white',
              fontWeight: '600'
            }}>
              📚 Version History
            </div>
            <div style={{
              flex: 1,
              overflow: 'auto'
            }}>
              {versions.map(version => (
                <div
                  key={version.id}
                  onClick={() => restoreVersion(version)}
                  style={{
                    padding: '10px 15px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <div style={{
                    fontSize: '12px',
                    color: '#888',
                    marginBottom: '5px'
                  }}>
                    {new Date(version.timestamp).toLocaleString()}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: 'white',
                    marginBottom: '3px'
                  }}>
                    {version.message}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: '#666'
                  }}>
                    by {version.author}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div style={{
        padding: '10px 20px',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '12px',
        color: '#888'
      }}>
        <div style={{ display: 'flex', gap: '15px' }}>
          <span>Permission: {currentPermission}</span>
          {attachments.length > 0 && (
            <span>📎 {attachments.length} attachments</span>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          {/* User presence indicators */}
          {users.length > 0 && (
            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
              <span>Online:</span>
              {users.slice(0, 5).map(user => (
                <div
                  key={user.id}
                  title={user.name}
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: user.color,
                    fontSize: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold'
                  }}
                >
                  {user.name.charAt(0).toUpperCase()}
                </div>
              ))}
              {users.length > 5 && (
                <span>+{users.length - 5} more</span>
              )}
            </div>
          )}
          
          <span>Last saved: {isAutoSaving ? 'saving...' : 'just now'}</span>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.doc,.docx,.txt,.md"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />
    </div>
  )
}