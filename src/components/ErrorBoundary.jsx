import React from "react";

export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, info: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, info) {
        this.setState({ info });
        // bạn có thể console.log ở đây nếu muốn
        // console.error("ErrorBoundary:", error, info);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    padding: 16, margin: 16, border: "2px solid #ef4444",
                    borderRadius: 12, background: "#fff5f5", color: "#991b1b", fontFamily: "system-ui"
                }}>
                    <div style={{ fontWeight: 800, marginBottom: 8 }}>⚠️ A runtime error occurred</div>
                    <div style={{ whiteSpace: "pre-wrap", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 13 }}>
                        {String(this.state.error)}
                    </div>
                    {this.state.info?.componentStack && (
                        <details style={{ marginTop: 8 }}>
                            <summary>componentStack</summary>
                            <pre style={{ whiteSpace: "pre-wrap" }}>{this.state.info.componentStack}</pre>
                        </details>
                    )}
                </div>
            );
        }
        return this.props.children;
    }
}
