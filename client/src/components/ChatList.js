import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { useDebounce } from '../hooks/useDebounce';
import Avatar from './Avatar';
import ThemeToggle from './ThemeToggle';
import AvatarUploadModal from './AvatarUploadModal';

// Панель со списком чатов: поиск, превью последнего сообщения, счётчик непрочитанных
const ChatList = () => {
  const { currentUser, logout } = useAuth();
  const { users, messages, typingUsers, fetchHistory, getChatId } = useSocket();

  const [searchQuery, setSearchQuery] = useState('');
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  // Дебаунсим поисковый запрос, чтобы не фильтровать на каждый символ
  const debouncedQuery = useDebounce(searchQuery, 250);

  // Актуальные данные текущего пользователя из общего списка
  const me = users.find(u => u.id === currentUser.id) || currentUser;

  // Список всех пользователей, кроме самого себя
  // Мемоизируем, чтобы не пересоздавать массив при каждом рендере
  const otherUsers = useMemo(
    () => users.filter(u => u.id !== currentUser.id),
    [users, currentUser.id]
  );

  // При появлении новых пользователей подгружаем историю переписки с каждым из них
  useEffect(() => {
    if (currentUser && users.length > 0) {
      otherUsers.forEach(user => {
        const chatId = getChatId(currentUser.id, user.id);
        fetchHistory(chatId);
      });
    }
  }, [users, currentUser, fetchHistory, getChatId, otherUsers]);

  // Фильтрация пользователей по поисковому запросу
  const filteredUsers = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return otherUsers;

    return otherUsers.filter(user => {
      if (user.username.toLowerCase().includes(q)) return true;
      const chatId = getChatId(currentUser.id, user.id);
      const msgs = messages[chatId] || [];
      return msgs.some(m => m.text?.toLowerCase().includes(q));
    });
  }, [debouncedQuery, otherUsers, messages, currentUser.id, getChatId]);

  // Возвращает строку-превью последнего сообщения в чате с пользователем
  const getLastMessage = (userId) => {
    const chatId = getChatId(currentUser.id, userId);
    const msgs = messages[chatId] || [];
    if (msgs.length === 0) return null;
    const last = msgs[msgs.length - 1];
    const name = last.from_id === currentUser.id
      ? 'Вы'
      : (users.find(u => u.id === last.from_id)?.username || 'Пользователь');
    return `${name}: ${last.text}`;
  };

  // Считает количество непрочитанных сообщений от конкретного пользователя
  const unreadCount = (userId) => {
    const chatId = getChatId(currentUser.id, userId);
    const msgs = messages[chatId] || [];
    return msgs.filter(m => m.from_id === userId && !m.read_at).length;
  };

  return (
    <div className="chat-list-panel">
      <div className="chat-list-header">
        <div
          className="current-user-info"
          onClick={() => setShowAvatarModal(true)}
          title="Изменить аватар"
          style={{ cursor: 'pointer' }}
        >
          <Avatar name={me.username} size={40} src={me.avatar} />
          <span className="current-user-name">{me.username}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <ThemeToggle />
          <button className="logout-btn" onClick={logout} title="Выйти">❌</button>
        </div>
      </div>

      <div className="search-box">
        <span>🔍</span>
        <input
          type="text"
          placeholder="Поиск по имени или сообщению..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            className="clear-search"
            onClick={() => setSearchQuery('')}
            title="Очистить"
          >
            ✕
          </button>
        )}
      </div>

      <div className="chat-items">
        {filteredUsers.length === 0 && (
          <div className="empty-chats">
            {searchQuery ? 'Ничего не найдено' : 'Никого нет в сети'}
          </div>
        )}
        {filteredUsers.map(user => {
          const isTyping = !!typingUsers[user.id];
          const unread = unreadCount(user.id);

          return (
            <Link to={`/chat/${user.id}`} key={user.id} className="chat-item">
              <Avatar name={user.username} size={48} online={user.online} src={user.avatar} />
              <div className="chat-item-info">
                <div className="chat-item-top">
                  <span className="chat-item-name">{user.username}</span>
                  {unread > 0 && <span className="unread-badge">{unread}</span>}
                </div>
                <div className="chat-item-bottom">
                  <span className="last-message-preview">
                    {isTyping
                      ? <span className="typing-indicator">печатает...</span>
                      : (getLastMessage(user.id) || 'Нет сообщений')}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {showAvatarModal && (
        <AvatarUploadModal onClose={() => setShowAvatarModal(false)} />
      )}
    </div>
  );
};

export default ChatList;