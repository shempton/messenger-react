import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { ThemeProvider } from './contexts/ThemeContext';
import AuthPage from './components/AuthPage';
import ChatList from './components/ChatList';
import ChatWindow from './components/ChatWindow';

function ProtectedRoute({ children }) {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        Загрузка...
      </div>
    );
  }

  return currentUser ? children : <Navigate to="/login" />;
}

function MainLayout() {
  return (
    <ProtectedRoute>
      <div className="app-container">
        <Routes>
          <Route path="/chats" element={<ChatList />} />
          <Route path="/chat/:userId" element={<><ChatList /><ChatWindow /></>} />
          <Route path="*" element={<Navigate to="/chats" />} />
        </Routes>
      </div>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <SocketProvider>
            <Routes>
              <Route path="/login" element={<AuthPage />} />
              <Route path="/*" element={<MainLayout />} />
            </Routes>
          </SocketProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;