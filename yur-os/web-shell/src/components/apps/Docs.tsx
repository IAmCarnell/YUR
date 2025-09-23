/**
 * Collaborative Docs App - Real-time document collaboration using Yjs
 */

import React, { useState, useEffect, useRef } from 'react'
import { createMockCollab, YURCollab, CollabUser } from '../../lib/yur-collab'
import { triggerAction, updateMetric } from '../../lib/rewards'

interface DocsAppProps {
  isVisible: boolean
  onClose: () => void
}

export const DocsApp: React.FC<DocsAppProps> = ({ isVisible, onClose }) => {
  const [content, setContent] = useState('')
  const [users, setUsers] = useState<CollabUser[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [roomName, setRoomName] = useState('demo-room')
  const [userName, setUserName] = useState('User-' + Math.floor(Math.random() * 1000))
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const collabRef = useRef<YURCollab | null>(null)

  // Initialize collaboration session
  const connectToSession = () => {
    try {
      // Use mock collaboration for demo
      collabRef.current = createMockCollab(roomName)
      
      // Set up event listeners
      const unsubscribeText = collabRef.current.onTextChange((newText) => {
        setContent(newText)
      })

      const unsubscribeUsers = collabRef.current.onUsersChange((newUsers) => {
        setUsers(newUsers)
      })

      // Set initial content
      setContent(collabRef.current.getText())
      setIsConnected(true)

      // Trigger quest progress
      triggerAction('collab_session')

      // Cleanup function
      return () => {
        unsubscribeText()
        unsubscribeUsers()
        if (collabRef.current) {
          collabRef.current.destroy()
        }
      }
    } catch (error) {
      console.error('Failed to connect to collaboration session:', error)
      setIsConnected(false)
    }
  }

  // Handle text changes
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    setContent(newContent)

    if (collabRef.current && isConnected) {
      // Update the collaborative document
      const currentText = collabRef.current.getText()
      if (newContent !== currentText) {
        // Simple diff-based update (in real implementation, use proper operational transforms)
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

      // Update quest metrics
      updateMetric('words_typed', newContent.split(' ').filter(word => word.length > 0).length)
    }
  }

  // Handle cursor position updates
  const handleSelectionChange = () => {
    if (textareaRef.current && collabRef.current && isConnected) {
      const start = textareaRef.current.selectionStart
      const end = textareaRef.current.selectionEnd
      collabRef.current.updateSelection(start, end)
    }
  }

  // Simple diff functions (simplified for demo)
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

  // Connect on mount
  useEffect(() => {
    if (isVisible && !isConnected) {
      const cleanup = connectToSession()
      return cleanup
    }
  }, [isVisible])

  // Update activity tracking
  useEffect(() => {
    if (isVisible) {
      triggerAction('app_launch')
    }
  }, [isVisible])

  if (!isVisible) return null

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '80%',
      maxWidth: '800px',
      height: '80%',
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
            gap: '10px'
          }}>
            <span>Room: {roomName}</span>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: isConnected ? '#4caf50' : '#f44336'
            }} />
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
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

      {/* Connection Controls */}
      {!isConnected && (
        <div style={{
          padding: '20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          gap: '10px',
          alignItems: 'center'
        }}>
          <input
            type="text"
            placeholder="Room name"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
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
          <input
            type="text"
            placeholder="Your name"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
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
          <button
            onClick={connectToSession}
            style={{
              background: '#00bcd4',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            Connect
          </button>
        </div>
      )}

      {/* Active Users */}
      {isConnected && users.length > 0 && (
        <div style={{
          padding: '12px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span style={{ color: '#888', fontSize: '12px' }}>Active users:</span>
          {users.slice(0, 5).map((user) => (
            <div
              key={user.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '20px',
                padding: '4px 8px',
                fontSize: '11px',
                color: 'white'
              }}
            >
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: user.color
                }}
              />
              {user.name}
            </div>
          ))}
          {users.length > 5 && (
            <span style={{ color: '#888', fontSize: '11px' }}>
              +{users.length - 5} more
            </span>
          )}
        </div>
      )}

      {/* Document Editor */}
      <div style={{ flex: 1, padding: '20px' }}>
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleTextChange}
          onSelect={handleSelectionChange}
          placeholder={isConnected 
            ? "Start typing to collaborate in real-time..." 
            : "Connect to a room to start collaborating"
          }
          disabled={!isConnected}
          style={{
            width: '100%',
            height: '100%',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '20px',
            color: 'white',
            fontSize: '14px',
            lineHeight: '1.6',
            fontFamily: 'monospace',
            resize: 'none',
            outline: 'none'
          }}
        />
      </div>

      {/* Status Bar */}
      <div style={{
        padding: '12px 20px',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '11px',
        color: '#888'
      }}>
        <div>
          {content.length} characters • {content.split(' ').filter(word => word.length > 0).length} words
        </div>
        {isConnected && (
          <div>
            Real-time sync active • Auto-save enabled
          </div>
        )}
      </div>
    </div>
  )
}