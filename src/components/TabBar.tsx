import { useAppStore } from '../store'
import { CloseIcon } from './Icons'

export default function TabBar() {
  const tabs = useAppStore(s => s.tabs)
  const activeId = useAppStore(s => s.activeTabId)
  const setActiveTab = useAppStore(s => s.setActiveTab)
  const closeTab = useAppStore(s => s.closeTab)
  const newTab = useAppStore(s => s.newTab)

  return (
    <div className="tab-bar">
      <div className="tab-bar-scroll">
        {tabs.map(t => (
          <div
            key={t.id}
            className={`tab ${t.id === activeId ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
            title={t.name}
          >
            <span className="tab-name">{t.name}</span>
            <button
              className="tab-close"
              title="关闭"
              onClick={(e) => { e.stopPropagation(); closeTab(t.id) }}
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
