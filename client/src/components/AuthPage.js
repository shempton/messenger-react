import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4001';

const AuthPage = () => {
  // Состояния формы: режим, поля, ошибка и флаг отправки.
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Валидация полей перед отправкой.
  const validate = () => {
    if (username.trim().length < 3) return 'Имя — минимум 3 символа';
    if (password.length < 6) return 'Пароль — минимум 6 символов';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const validationError = validate();
    if (validationError) return setError(validationError);

    setIsSubmitting(true);

    // Выбираем эндпоинт в зависимости от режима: вход или регистрация.
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка сервера');

      // Успех: сохраняем сессию и переходим на страницу чатов.
      login(data.user, data.token);
      navigate('/chats');
    } catch (err) {
      setError(err.message);
    } finally {
      // Снимаем блокировку формы в любом случае.
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">💬</div>
        <h2>{isLogin ? 'Вход' : 'Регистрация'}</h2>
        <p>{isLogin ? 'Введите данные для входа' : 'Создайте аккаунт'}</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Имя пользователя"
            className="login-input"
            autoFocus
            disabled={isSubmitting}
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Пароль (минимум 6 символов)"
            className="login-input"
            disabled={isSubmitting}
          />
          <button type="submit" className="login-button" disabled={isSubmitting}>
            {isSubmitting
              ? 'Отправка...'
              : isLogin ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </form>

        <p className="toggle-auth">
          {isLogin ? 'Нет аккаунта? ' : 'Уже есть аккаунт? '}
          <button
            type="button"
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            disabled={isSubmitting}
          >
            {isLogin ? 'Зарегистрироваться' : 'Войти'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;