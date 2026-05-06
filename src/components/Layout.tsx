import { ReactNode } from 'react'

interface LayoutProps {
  children: ReactNode
}

function Layout({ children }: LayoutProps) {
  return (
    <div className="layout">
      <header className="layout-header">
        <div className="logo">开发者工具箱</div>
        <div className="header-actions">
          <span className="version">v0.1.0</span>
        </div>
      </header>
      <main className="layout-main">
        {children}
      </main>
    </div>
  )
}

export default Layout
