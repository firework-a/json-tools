import { useState } from 'react'
import Layout from './components/Layout'
import { JsonFormatter, JsonComparator, JsonCompressor } from './components/tools'

function App() {
  const [activeTab, setActiveTab] = useState('formatter')

  const tabs = [
    { id: 'formatter', label: 'JSON 格式化' },
    { id: 'comparator', label: 'JSON 对比' },
    { id: 'compressor', label: 'JSON 压缩/转义' },
  ]

  const renderContent = () => {
    switch (activeTab) {
      case 'formatter':
        return <JsonFormatter />
      case 'comparator':
        return <JsonComparator />
      case 'compressor':
        return <JsonCompressor />
      default:
        return <JsonFormatter />
    }
  }

  return (
    <Layout>
      <div className="app-container">
        <div className="tab-bar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="content-area">
          {renderContent()}
        </div>
      </div>
    </Layout>
  )
}

export default App
