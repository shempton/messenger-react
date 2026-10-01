/**
 * Сжимает изображение до maxSize×maxSize и возвращает data URL (JPEG).
 * @param {File} file
 * @param {number} maxSize - максимальная сторона в px
 * @param {number} quality - 0..1
 * @returns {Promise<string>} data:image/jpeg;base64,...
 */
export const compressImage = (file, maxSize = 128, quality = 0.85) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Невалидное изображение'));
      img.onload = () => {
        const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        const ctx = canvas.getContext('2d');
        // Белый фон под JPEG (для PNG с прозрачностью)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });