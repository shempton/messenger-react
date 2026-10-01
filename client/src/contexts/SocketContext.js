import { createContext, useContext, useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';

const SocketContext = createContext();
const WS_URL = 'ws://localhost:4002';

export const SocketProvider = ({ children }) => {
  const [users, setUsers] = useState([]);

  // Сообщения сгруппированы по chatId
  const [messages, setMessages] = useState({});

  // Кто сейчас печатает
  const [typingUsers, setTypingUsers] = useState({});
  
  const { currentUser, token } = useAuth();
  const socketRef = useRef(null);
  const pendingHistoryRef = useRef(null);
  
  // Таймер переподключения при обрыве соединения
  const reconnectTimerRef = useRef(null);

  // Таймеры автосброса статуса «печатает» для каждого пользователя
  const typingTimeoutsRef = useRef({});

  useEffect(() => {
    if (!currentUser || !token) {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      return;
    }

    let isMounted = true;

    const connect = () => {
      const ws = new WebSocket(WS_URL);
      socketRef.current = ws;

      ws.onopen = () => {
        if (!isMounted) return;
        ws.send(JSON.stringify({ type: 'auth', token }));
        if (pendingHistoryRef.current) {
          ws.send(JSON.stringify({ type: 'get_history', chatId: pendingHistoryRef.current }));
          pendingHistoryRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        if (!isMounted) return;
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'users_list':
            setUsers(data.users);
            break;

          case 'chat_history':
            setMessages(prev => ({ ...prev, [data.chatId]: data.messages }));
            break;

          case 'new_message':
            setMessages(prev => {
              const chatId = [data.from_id, data.to_id].sort().join('_');
              const existing = prev[chatId] || [];
              if (existing.find(m => m.id === data.id)) return prev;
              return { ...prev, [chatId]: [...existing, data] };
            });
            break;

          case 'messages_read':
            setMessages(prev => {
              const list = prev[data.chatId];
              if (!list) return prev;
              const idSet = new Set(data.messageIds);
              return {
                ...prev,
                [data.chatId]: list.map(m =>
                  idSet.has(m.id) ? { ...m, read_at: data.read_at } : m
                )
              };
            });
            break;

          case 'user_typing': {
            const { from_id } = data;
            if (typingTimeoutsRef.current[from_id]) {
              clearTimeout(typingTimeoutsRef.current[from_id]);
            }
            setTypingUsers(prev => ({ ...prev, [from_id]: true }));
            typingTimeoutsRef.current[from_id] = setTimeout(() => {
              setTypingUsers(prev => {
                const next = { ...prev };
                delete next[from_id];
                return next;
              });
              delete typingTimeoutsRef.current[from_id];
            }, 3000);
            break;
          }

          default:
            console.warn('Неизвестный тип сообщения:', data.type);
        }
      };

      ws.onerror = (error) => console.error('❌ WebSocket ошибка', error);

      ws.onclose = () => {
        if (!isMounted) return;
        console.log('🔒 WebSocket закрыт');
        socketRef.current = null;
        if (currentUser && token) {
          reconnectTimerRef.current = setTimeout(connect, 3000);
        }
      };
    };

    connect();

    return () => {
      isMounted = false;
      clearTimeout(reconnectTimerRef.current);
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      Object.values(typingTimeoutsRef.current).forEach(clearTimeout);
      typingTimeoutsRef.current = {};
    };
  }, [currentUser, token]);

  const fetchHistory = useCallback((chatId) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'get_history', chatId }));
    } else {
      pendingHistoryRef.current = chatId;
    }
  }, []);

  const sendMessage = useCallback((to, text) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'send_message', to, text }));
    }
  }, []);

  const markRead = useCallback((fromId) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'mark_read', fromId }));
    }
  }, []);

  const sendTyping = useCallback((to) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'typing', to }));
    }
  }, []);

  const updateAvatar = useCallback((avatar) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'update_avatar', avatar }));
    }
  }, []);

  const getChatId = useCallback((id1, id2) => [id1, id2].sort().join('_'), []);

  const value = useMemo(
    () => ({
      users, messages, typingUsers,
      sendMessage, fetchHistory, getChatId,
      markRead, sendTyping, updateAvatar,
    }),
    [users, messages, typingUsers, sendMessage, fetchHistory, getChatId, markRead, sendTyping, updateAvatar]
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocket = () => useContext(SocketContext);