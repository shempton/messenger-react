import { useParams, Link } from 'react-router-dom';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { useThrottle } from '../hooks/useThrottle';
import Avatar from './Avatar';

// Окно чата с конкретным пользователем: история сообщений, индикатор набора, отправка
const ChatWindow = () => {
  const { userId } = useParams();
  const { currentUser } = useAuth();
  const {
    users, messages, typingUsers,
    sendMessage, fetchHistory, getChatId,
    markRead, sendTyping,
  } = useSocket();

  const [text, setText] = useState('');
  const messagesEndRef = useRef(null);

  const chatId = getChatId(currentUser.id, userId);
  const chatMessages = useMemo(() => messages[chatId] || [], [messages, chatId]);
  const receiver = users.find(u => u.id === userId) || { username: 'Пользователь', id: userId };

  // Собеседник печатает прямо сейчас
  const isTyping = !!typingUsers[userId];

  const notifyTyping = useThrottle(() => sendTyping(userId), 1500);

  // При смене чата подгружаем историю сообщений
  useEffect(() => {
    fetchHistory(chatId);
  }, [chatId, fetchHistory]);

  // При переходе в другой чат очищаем поле ввода
  useEffect(() => {
    setText('');
  }, [userId]);

  // Если в чате есть непрочитанные сообщения от собеседника - помечаем их прочитанными
  useEffect(() => {
    const hasUnread = chatMessages.some(m => m.from_id === userId && !m.read_at);
    if (hasUnread) markRead(userId);
  }, [chatMessages, userId, markRead]);

  // Автоскролл вниз при появлении новых сообщений
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Обработка ввода: обновляем текст и уведомляем собеседника о наборе
  const handleChange = (e) => {
    setText(e.target.value);
    if (e.target.value.length > 0) notifyTyping();
  };

  // Отправка сообщения: игнорируем пустые, очищаем поле после отправки
  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    sendMessage(userId, text.trim());
    setText('');
  };

  return (
    <div className="chat-window-panel">
      <div className="chat-window-header">
        <Link to="/chats" className="back-button">←</Link>
        <Avatar name={receiver.username} size={36} online={receiver.online} src={receiver.avatar} />
        <div className="chat-window-header-name">
          <span className="receiver-name">{receiver.username}</span>
          <span className={`online-status ${isTyping ? 'typing' : ''}`}>
            {isTyping
              ? 'печатает...'
              : receiver.online ? 'в сети' : 'не в сети'}
          </span>
        </div>
      </div>

      <div className="messages-area">
        {chatMessages.map((msg) => {
          const isMine = msg.from_id === currentUser.id;
          const time = new Date(msg.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });
          const isRead = !!msg.read_at;

          return (
            <div key={msg.id} className={`message-row ${isMine ? 'outgoing' : 'incoming'}`}>
              {!isMine && (
                <Avatar
                  name={msg.fromName || receiver.username}
                  size={28}
                  src={receiver.avatar}
                />
              )}
              <div className={`message-bubble ${isMine ? 'bubble-out' : 'bubble-in'}`}>
                <div className="message-text">{msg.text}</div>
                <div className="message-time">
                  {time}
                  {isMine && (
                    <span
                      className={`checkmarks ${isRead ? 'read' : ''}`}
                      title={isRead ? 'Прочитано' : 'Отправлено'}
                    >
                      {isRead ? '✓✓' : '✓'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form className="message-input-area" onSubmit={handleSend}>
        <input
          type="text"
          value={text}
          onChange={handleChange}
          placeholder="Сообщение..."
        />
        <button type="submit" className="send-btn">📨</button>
      </form>
    </div>
  );
};

export default ChatWindow;