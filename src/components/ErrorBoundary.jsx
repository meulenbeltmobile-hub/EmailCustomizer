import { Component } from 'react'

// Without this, any render error unmounts the whole tree and the user just
// sees a blank white page with no indication of what went wrong.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Unhandled render error:', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div style={{ maxWidth: 560, margin: '80px auto', padding: '28px 32px', fontFamily: 'var(--sans, system-ui)', background: 'var(--paper, #fff)', border: '1px solid var(--border, #e5e5e5)', borderRadius: 8 }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'var(--ink, #111)' }}>Something went wrong</h1>
        <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--ink-2, #555)', marginBottom: 16 }}>
          The app hit an unexpected error. Your saved templates and recipients are stored locally and have not been lost — reloading should bring everything back.
        </p>
        <pre style={{ fontSize: 11, fontFamily: 'var(--mono, monospace)', background: 'var(--paper-2, #f6f6f6)', border: '1px solid var(--border, #e5e5e5)', borderRadius: 6, padding: '10px 12px', overflowX: 'auto', color: 'var(--accent, #b45309)', marginBottom: 18, whiteSpace: 'pre-wrap' }}>
          {this.state.error?.message || String(this.state.error)}
        </pre>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => this.setState({ error: null })}
            style={{ fontSize: 13, padding: '7px 14px', borderRadius: 6, border: '1px solid var(--border, #e5e5e5)', background: 'transparent', color: 'var(--ink, #111)', cursor: 'pointer' }}
          >
            Dismiss
          </button>
          <button
            onClick={() => window.location.reload()}
            style={{ fontSize: 13, padding: '7px 14px', borderRadius: 6, border: 'none', background: 'var(--ink, #111)', color: 'var(--paper, #fff)', cursor: 'pointer' }}
          >
            Reload app
          </button>
        </div>
      </div>
    )
  }
}
