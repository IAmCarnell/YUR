import React, { useState } from 'react'
import { SpatialFileExplorer } from './components/SpatialFileExplorer'
import { MarkdownEditor } from './components/MarkdownEditor'
import { MarkdownPreview } from './components/MarkdownPreview'

interface FileNode {
  id: string
  name: string
  type: 'file' | 'folder'
  content?: string
  children?: FileNode[]
}

const sampleFiles: FileNode[] = [
  {
    id: '1',
    name: 'YUR OS Documentation',
    type: 'folder',
    children: [
      {
        id: '2',
        name: 'Getting Started.md',
        type: 'file',
        content: '# Getting Started with YUR OS\n\nWelcome to the infinite-dimensional operating system...'
      },
      {
        id: '3',
        name: 'Spatial Computing.md',
        type: 'file',
        content: '# Spatial Computing Concepts\n\n## Mandala Interface\n\nThe mandala interface...'
      },
      {
        id: '4',
        name: 'Apps',
        type: 'folder',
        children: [
          {
            id: '5',
            name: 'Docs App.md',
            type: 'file',
            content: '# Docs App\n\nThe spatial markdown editor...'
          }
        ]
      }
    ]
  }
]

function App() {
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(
    sampleFiles[0].children?.[0] || null
  )
  const [markdownContent, setMarkdownContent] = useState(
    selectedFile?.content || ''
  )

  const handleFileSelect = (file: FileNode) => {
    if (file.type === 'file') {
      setSelectedFile(file)
      setMarkdownContent(file.content || '')
    }
  }

  const handleContentChange = (content: string) => {
    setMarkdownContent(content)
    if (selectedFile) {
      selectedFile.content = content
    }
  }

  return (
    <div className="spatial-editor">
      {/* File Explorer */}
      <div className="file-explorer">
        <div className="toolbar">
          <h3>📁 Spatial Files</h3>
        </div>
        <SpatialFileExplorer 
          files={sampleFiles} 
          onFileSelect={handleFileSelect}
          selectedFile={selectedFile}
        />
      </div>

      {/* Editor */}
      <div className="editor-panel">
        <div className="toolbar">
          <h3>📝 {selectedFile?.name || 'Select a file'}</h3>
        </div>
        <MarkdownEditor 
          content={markdownContent}
          onChange={handleContentChange}
        />
      </div>

      {/* Preview */}
      <div className="preview-panel">
        <div className="toolbar">
          <h3>👁️ Preview</h3>
        </div>
        <MarkdownPreview content={markdownContent} />
      </div>
    </div>
  )
}

export default App