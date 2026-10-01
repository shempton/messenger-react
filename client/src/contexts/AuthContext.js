import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';

// Контекст аутентификации: хранит пользователя, токен и методы входа/выхода
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  // Токен хранится в localStorage, чтобы сессия сохранялась между перезагрузками
  const [token, setToken] = useLocalStorage('token', null);
  // Флаг загрузки: пока не проверили токен, не рендерим защищённые маршруты
  const [isLoading, setIsLoading] = useState(true);

  // При наличии токена декодируем JWT и восстанавливаем пользователя
  useEffect(() => {
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUser({ id: payload.id, username: payload.username });
      } catch {
        setToken(null);
        setCurrentUser(null);
      }
    } else {
      setCurrentUser(null);
    }
    setIsLoading(false);
  }, [token, setToken]);

  // Вход: сохраняем токен и пользователя. useCallback для стабильной ссылки
  const login = useCallback((user, newToken) => {
    setToken(newToken);
    setCurrentUser(user);
  }, [setToken]);

  const logout = useCallback(() => {
    setToken(null);
    setCurrentUser(null);
  }, [setToken]);

  const value = useMemo(
    () => ({ currentUser, token, login, logout, isLoading }),
    [currentUser, token, login, logout, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);