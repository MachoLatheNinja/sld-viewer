import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props){ super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error){ return { error }; }
  componentDidCatch(error, info){ console.error('UI error:', error, info); }
  render(){
    if (this.state.error){
      return (
        <div style={{padding:16,fontFamily:'system-ui'}}>
          <h3>Something went wrong in the UI.</h3>
          <pre style={{whiteSpace:'pre-wrap',background:'#f9f9f9',padding:12}}>
            {String(this.state.error?.message || this.state.error)}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
