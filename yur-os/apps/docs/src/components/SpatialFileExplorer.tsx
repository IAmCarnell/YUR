import React, { useState } from 'react'

interface FileNode {
  id: string
  name: string
  type: 'file' | 'folder'
  content?: string
  children?: FileNode[]
}

interface SpatialFileExplorerProps {
  files: FileNode[]
  onFileSelect: (file: FileNode) => void
  selectedFile: FileNode | null
}

export const SpatialFileExplorer: React.FC<SpatialFileExplorerProps> = ({
  files,
  onFileSelect,
  selectedFile
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(['1']) // Expand root folder by default
  )

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId)
    } else {
      newExpanded.add(folderId)
    }
    setExpandedFolders(newExpanded)
  }

  const renderFileNode = (node: FileNode, depth = 0) => {
    const isSelected = selectedFile?.id === node.id
    const isExpanded = expandedFolders.has(node.id)
    const paddingLeft = depth * 20 + 16

    return (
      <div key={node.id}>
        <div
          style={{
            paddingLeft: `${paddingLeft}px`,
            paddingRight: '16px',
            paddingTop: '8px',
            paddingBottom: '8px',
            cursor: 'pointer',
            background: isSelected ? 'rgba(0, 188, 212, 0.2)' : 'transparent',
            borderLeft: isSelected ? '3px solid #00bcd4' : '3px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease',
          }}
          onClick={() => {
            if (node.type === 'folder') {
              toggleFolder(node.id)
            } else {
              onFileSelect(node)
            }
          }}
          onMouseEnter={(e) => {
            if (!isSelected) {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
            }
          }}
          onMouseLeave={(e) => {
            if (!isSelected) {
              e.currentTarget.style.background = 'transparent'
            }
          }}
        >
          {/* Icon */}
          <span style={{ fontSize: '16px', minWidth: '20px' }}>
            {node.type === 'folder' 
              ? (isExpanded ? '📂' : '📁')
              : '📄'
            }
          </span>
          
          {/* Name */}
          <span style={{
            fontSize: '14px',
            color: isSelected ? '#00bcd4' : 'rgba(255, 255, 255, 0.9)',
            fontWeight: isSelected ? '600' : '400',
          }}>
            {node.name}
          </span>

          {/* Folder chevron */}
          {node.type === 'folder' && (
            <span style={{
              fontSize: '12px',
              color: 'rgba(255, 255, 255, 0.5)',
              marginLeft: 'auto',
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }}>
              ▶
            </span>
          )}
        </div>

        {/* Children */}
        {node.type === 'folder' && isExpanded && node.children && (
          <div>
            {node.children.map(child => renderFileNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ padding: '8px 0' }}>
      {files.map(file => renderFileNode(file))}
      
      {/* 3D Spatial View Placeholder */}
      <div style={{
        margin: '20px 16px',
        padding: '20px',
        background: 'rgba(0, 188, 212, 0.1)',
        borderRadius: '12px',
        border: '1px dashed rgba(0, 188, 212, 0.3)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>🌌</div>
        <div style={{ 
          fontSize: '12px', 
          color: 'rgba(255, 255, 255, 0.6)',
          lineHeight: '1.4'
        }}>
          <strong>3D Spatial View</strong><br />
          Coming Soon: Navigate files<br />
          in infinite-dimensional space
        </div>
      </div>
    </div>
  )
}