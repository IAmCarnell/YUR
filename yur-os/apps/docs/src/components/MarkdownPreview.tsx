import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownPreviewProps {
  content: string
}

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ content }) => {
  return (
    <div style={{
      padding: '20px',
      height: 'calc(100vh - 120px)',
      overflow: 'auto',
    }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 style={{
              color: '#00bcd4',
              fontSize: '28px',
              fontWeight: '300',
              marginBottom: '16px',
              borderBottom: '2px solid rgba(0, 188, 212, 0.3)',
              paddingBottom: '8px',
            }}>
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 style={{
              color: '#ff5722',
              fontSize: '22px',
              fontWeight: '400',
              marginTop: '24px',
              marginBottom: '12px',
            }}>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 style={{
              color: '#ffffff',
              fontSize: '18px',
              fontWeight: '500',
              marginTop: '20px',
              marginBottom: '10px',
            }}>
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p style={{
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '14px',
              lineHeight: '1.6',
              marginBottom: '16px',
            }}>
              {children}
            </p>
          ),
          code: ({ children, className }) => {
            const isInline = !className
            return (
              <code style={{
                background: isInline 
                  ? 'rgba(0, 188, 212, 0.2)' 
                  : 'rgba(10, 10, 10, 0.8)',
                color: isInline ? '#00bcd4' : '#ffffff',
                padding: isInline ? '2px 6px' : '16px',
                borderRadius: '6px',
                fontSize: '13px',
                fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace',
                display: isInline ? 'inline' : 'block',
                marginBottom: isInline ? '0' : '16px',
                border: isInline ? 'none' : '1px solid rgba(0, 188, 212, 0.3)',
              }}>
                {children}
              </code>
            )
          },
          blockquote: ({ children }) => (
            <blockquote style={{
              borderLeft: '4px solid #00bcd4',
              paddingLeft: '16px',
              marginLeft: '0',
              marginBottom: '16px',
              background: 'rgba(0, 188, 212, 0.1)',
              padding: '12px 16px',
              borderRadius: '0 6px 6px 0',
            }}>
              {children}
            </blockquote>
          ),
          ul: ({ children }) => (
            <ul style={{
              color: 'rgba(255, 255, 255, 0.9)',
              paddingLeft: '20px',
              marginBottom: '16px',
            }}>
              {children}
            </ul>
          ),
          li: ({ children }) => (
            <li style={{
              marginBottom: '4px',
              fontSize: '14px',
              lineHeight: '1.6',
            }}>
              {children}
            </li>
          ),
        }}
      >
        {content || '*Select a file to preview*'}
      </ReactMarkdown>

      {/* Spatial Preview Placeholder */}
      {content && (
        <div style={{
          marginTop: '40px',
          padding: '20px',
          background: 'rgba(156, 39, 176, 0.1)',
          borderRadius: '12px',
          border: '1px dashed rgba(156, 39, 176, 0.3)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>🧠</div>
          <div style={{ 
            fontSize: '12px', 
            color: 'rgba(255, 255, 255, 0.6)',
            lineHeight: '1.4'
          }}>
            <strong>Spatial Preview</strong><br />
            Coming Soon: See your content<br />
            mapped in cognitive space
          </div>
        </div>
      )}
    </div>
  )
}