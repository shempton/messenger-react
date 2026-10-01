import { Component } from 'react';

class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary поймал ошибку:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h1>😔 Что-то пошло не так</h1>
          <p>{this.state.error?.message}</p>
          <button onClick={this.handleReset}>Вернуться на главную</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;