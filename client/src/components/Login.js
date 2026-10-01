import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [name, setName] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      login({ name: name.trim() });
      navigate('/chats');
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">💬</div>
        <h2>Вход в мессенджер</h2>
        <p>Введите ваше имя, чтобы начать общение</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ваше имя"
            className="login-input"
            autoFocus
          />
          <button type="submit" className="login-button">
            Войти
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;