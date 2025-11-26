import { useState } from 'react'
import type { FileNode } from '../api/qt-project'

interface FileTreeProps {
  nodes: FileNode[]
  onFileClick?: (node: FileNode) => void
}

export function FileTree({ nodes, onFileClick }: FileTreeProps) {
  return (
    <div className="text-sm">
      {nodes.map((node) => (
        <TreeNode key={node.path} node={node} onFileClick={onFileClick} />
      ))}
    </div>
  )
}

interface TreeNodeProps {
  node: FileNode
  level?: number
  onFileClick?: (node: FileNode) => void
}

function TreeNode({ node, level = 0, onFileClick }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(level < 2) // 默认展开前两层

  const handleClick = () => {
    if (node.type === 'directory') {
      setExpanded(!expanded)
    } else if (onFileClick) {
      onFileClick(node)
    }
  }

  const getIcon = () => {
    if (node.type === 'directory') {
      return expanded ? '📂' : '📁'
    }
    
    // 根据文件扩展名返回图标
    switch (node.extension) {
      case 'cpp':
      case 'cc':
      case 'cxx':
        return '📄'
      case 'h':
      case 'hpp':
        return '📋'
      case 'ui':
        return '🎨'
      case 'qrc':
        return '🖼️'
      case 'pro':
        return '⚙️'
      case 'cmake':
      case 'txt':
        return '📝'
      default:
        return '📄'
    }
  }

  return (
    <div>
      <div
        onClick={handleClick}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        className={`
          flex items-center gap-2 py-1 px-2 cursor-pointer
          hover:bg-gray-100 dark:hover:bg-gray-700 rounded
          ${node.type === 'file' ? 'text-gray-700 dark:text-gray-300' : 'text-gray-800 dark:text-white font-medium'}
        `}
      >
        <span className="text-base">{getIcon()}</span>
        <span className="truncate">{node.name}</span>
      </div>

      {node.type === 'directory' && expanded && node.children && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              level={level + 1}
              onFileClick={onFileClick}
            />
          ))}
        </div>
      )}
    </div>
  )
}
