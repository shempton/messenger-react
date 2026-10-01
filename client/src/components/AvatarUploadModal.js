import { useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { compressImage } from '../hooks/useImageCompress';
import Avatar from './Avatar';

// Модальное окно для загрузки, предпросмотра и удаления аватара пользователя
const AvatarUploadModal = ({ onClose }) => {
  const { currentUser } = useAuth();
  const { users, updateAvatar } = useSocket();

  // Находим актуальные данные текущего пользователя в общем списке
  // Если не нашли - используем данные из контекста аутентификации
  const me = users.find(u => u.id === currentUser.id) || currentUser;
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  // Обработка выбора файла: валидация, сжатие, установка предпросмотра
  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // позволяет выбрать тот же файл повторно
    if (!file) return;
    setError('');

    if (!file.type.startsWith('image/')) {
      setError('Можно загрузить только изображение');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Файл больше 5 МБ');
      return;
    }

    setLoading(true);
    try {
      const compressed = await compressImage(file, 128, 0.85);
      setPreview(compressed);
    } catch (err) {
      setError(err.message || 'Не удалось обработать изображение');
    } finally {
      setLoading(false);
    }
  };

  // Сохранение: отправляем сжатое изображение на сервер и закрываем модалку
  const handleSave = () => {
    if (!preview) return;
    updateAvatar(preview);
    onClose();
  };

  // Удаление аватара: отправляем null и закрываем модалку
  const handleDelete = () => {
    updateAvatar(null);
    onClose();
  };

  const currentSrc = preview || me.avatar;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <h3>Аватар</h3>

        <div className="modal-avatar-preview">
          <Avatar name={me.username} size={96} src={currentSrc} />
        </div>

        {error && <div className="error-message">{error}</div>}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFile}
        />

        <div className="modal-actions">
          <button
            className="btn-secondary"
            onClick={() => fileRef.current?.click()}
            disabled={loading}
          >
            {loading ? 'Обработка...' : 'Выбрать файл'}
          </button>

          {me.avatar && (
            <button className="btn-danger" onClick={handleDelete}>
              Удалить
            </button>
          )}

          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={!preview || loading}
          >
            Сохранить
          </button>

          <button className="btn-secondary" onClick={onClose}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
};

export default AvatarUploadModal;