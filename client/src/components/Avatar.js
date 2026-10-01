// Палитра для фона аватарок
const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];

const Avatar = ({ name, size = 40, online, src }) => {
  const displayName = name || '?';

  // Формируем инициалы: берём первую букву каждого слова, максимум 2 символа
  const initials = displayName
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
    
  // Выбираем цвет из палитры на основе длины имени
  const colorIndex = (displayName.length || 1) % colors.length;
  const bgColor = colors[colorIndex];

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {src ? (
        <img
          src={src}
          alt={displayName}
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            objectFit: 'cover',
            userSelect: 'none',
            display: 'block',
          }}
        />
      ) : (
        <div
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            backgroundColor: bgColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: size * 0.4,
            textTransform: 'uppercase',
            userSelect: 'none',
          }}
        >
          {initials}
        </div>
      )}
      {online && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: size * 0.35,
            height: size * 0.35,
            backgroundColor: 'var(--online)',
            borderRadius: '50%',
            border: `${Math.max(size * 0.07, 2)}px solid var(--bg-surface)`,
          }}
        />
      )}
    </div>
  );
};

export default Avatar;