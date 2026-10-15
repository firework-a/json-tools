import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}
interface State {
  error: Error | null
}

/** 全局错误边界：组件崩溃时显示错误界面而不是白屏，可一键重载 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error) {
    console.error('App crashed:', error)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
          fontFamily: 'inherit',
          background: '#16181d',
          color: '#d8dbe1',
        }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>界面出现异常</div>
          <div style={{
            fontSize: 11,
            color: '#8f96a5',
            fontFamily: 'monospace',
            maxWidth: 560,
            maxHeight: 160,
            overflow: 'auto',
            padding: '8px 12px',
            background: 'rgba(255,255,255,0.04)',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.08)',
          }}>{this.state.error.message}</div>
          <button
            onClick={() => { this.setState({ error: null }); window.location.reload() }}
            style={{
              height: 30,
              padding: '0 18px',
              fontSize: 12,
              borderRadius: 8,
              cursor: 'pointer',
              color: '#4ea1f2',
              background: 'rgba(78,161,242,0.16)',
              border: '1px solid rgba(78,161,242,0.4)',
            }}
          >重新加载</button>
        </div>
      )
    }
    return this.props.children
  }
}
