import React from 'react'

interface MarkdownEditorProps {
  content: string
  onChange: (content: string) => void
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ content, onChange }) => {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      {/* Editor Toolbar */}
      <div style={{
        background: 'rgba(0, 188, 212, 0.05)',
        padding: '8px 16px',
        borderBottom: '1px solid rgba(0, 188, 212, 0.2)',
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
      }}>
        <button style={{
          background: 'none',
          border: '1px solid rgba(0, 188, 212, 0.3)',
          borderRadius: '4px',
          color: '#00bcd4',
          padding: '4px 8px',
          fontSize: '12px',
          cursor: 'pointer',
        }}>
          📝 Edit
        </button>
        <button style={{
          background: 'none',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '4px',
          color: 'rgba(255, 255, 255, 0.6)',
          padding: '4px 8px',
          fontSize: '12px',
          cursor: 'pointer',
        }}>
          🎨 Style
        </button>
        <button style={{
          background: 'none',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '4px',
          color: 'rgba(255, 255, 255, 0.6)',
          padding: '4px 8px',
          fontSize: '12px',
          cursor: 'pointer',
        }}>
          🌌 Spatial
        </button>
      </div>

      {/* Textarea Editor */}
      <textarea
        value={content}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Start writing your markdown content..."
        style={{
          flex: 1,
          background: 'rgba(10, 10, 10, 0.8)',
          border: 'none',
          color: '#ffffff',
          padding: '20px',
          fontSize: '14px',
          fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace',
          lineHeight: '1.6',
          resize: 'none',
          outline: 'none',
        }}
      />

      {/* Editor Status */}
      <div style={{
        background: 'rgba(0, 188, 212, 0.05)',
        padding: '8px 16px',
        borderTop: '1px solid rgba(0, 188, 212, 0.2)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '12px',
        color: 'rgba(255, 255, 255, 0.6)',
      }}>
        <span>
          Lines: {content.split('\n').length} | 
          Words: {content.split(/\s+/).filter(Boolean).length} |
          Chars: {content.length}
        </span>
        <span style={{ color: '#00bcd4' }}>
          ● Auto-saved
        </span>
      </div>
    </div>
  )
}