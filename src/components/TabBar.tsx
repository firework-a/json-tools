import { useState } from 'react'
import { useAppStore } from '../store'
import { CloseIcon } from './Icons'

export default function TabBar() {
  const tabs = useAppStore(s => s.tabs)
  const activeId = useAppStore(s => s.activeTabId)
  const setActiveTab = useAppStore(s => s.setActiveTab)
  const closeTab = useAppStore(s => s.closeTab)
  const renameTab = useAppStore(s => s.renameTab)
  const reorderTabs = useAppStore(s => s.reorderTabs)
  const newTab = useAppStore(s => s.newTab)
  const [dragTabId, setDragTabId] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const commitRename = () => {
    if (renaming) {
      const name = renameValue.trim()
      if (name) renameTab(renaming, name)
    }
    setRenaming(null)
  }

  const startRename = (id: string, name: string) => {
    setRenaming(id)
    setRenameValue(name)
  }

  const requestClose = (id: string, name: string, dirty?: boolean) => {
    if (dirty && !window.confirm(`「${name}」有未保存的修改，确定关闭吗？`)) return
    closeTab(id)
  }

  return (
    <div className="tab-bar">
      <div className="tab-bar-scroll">
        {tabs.map(t => (
          <div
            key={t.id}
            className={`tab ${t.id === activeId ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
            onDoubleClick={() => startRename(t.id, t.name)}
            onMouseDown={(e) => { if (e.button === 1) { e.preventDefault(); requestClose(t.id, t.name, t.dirty) } }}
            title={`${t.name}（双击重命名 · 拖拽重排）`}
            draggable
            onDragStart={() => setDragTabId(t.id)}
            onDragOver={e => { if (dragTabId && dragTabId !== t.id) e.preventDefault() }}
            onDrop={e => { e.preventDefault(); if (dragTabId) reorderTabs(dragTabId, t.id); setDragTabId(null) }}
            onDragEnd={() => setDragTabId(null)}
          >
            {renaming === t.id ? (
              <input
                className="tab-rename"
                value={renameValue}
                autoFocus
                onClick={e => e.stopPropagation()}
                onChange={e => setRenameValue(e.target.value)}
                onBlur={commitRename}
                onKeyDown={e => {
                  if (e.key === 'Enter') commitRename()
                  if (e.key === 'Escape') setRenaming(null)
                }}
              />
            ) : (
              <span className="tab-name">{t.name}</span>
            )}
            {t.dirty && <span className="tab-dot" title="未保存" />}
            <button
              className="tab-close"
              title="关闭"
              onClick={(e) => { e.stopPropagation(); requestClose(t.id, t.name, t.dirty) }}
            >
              <CloseIcon size={12} />
            </button>
          </div>
        ))}
      </div>
      <button className="tab-new" title="新建标签页" onClick={newTab}>+</button>
    </div>
  )
}
