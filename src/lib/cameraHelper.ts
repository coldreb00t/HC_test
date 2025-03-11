/**
 * Утилиты для работы с камерой, совместимые с WKWebView
 */

/**
 * Проверяет, запущено ли приложение в iOS WKWebView
 */
export const isIOSWKWebView = (): boolean => {
  // Проверка на iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  
  // Проверка на WKWebView (можно определить по определенным свойствам webkit)
  const hasWebkit = 'webkit' in window && 'messageHandlers' in (window as any).webkit;
  
  return isIOS && hasWebkit;
};

/**
 * Проверяет только iOS без учета WebView
 */
export const isIOS = (): boolean => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
};

/**
 * Оптимизирует input для загрузки фотографий в зависимости от платформы
 */
export const optimizeFileInput = (input: HTMLInputElement): void => {
  if (isIOSWKWebView()) {
    // В WKWebView на iOS: используем только определенные атрибуты
    input.removeAttribute('multiple'); // Отключаем multiple для iOS WKWebView
    input.setAttribute('capture', 'environment');
    input.setAttribute('accept', 'image/*');
  } else if (isIOS()) {
    // Для iOS в Safari или других браузерах
    input.setAttribute('capture', 'environment');
    input.setAttribute('accept', 'image/*');
  } else {
    // Для других платформ оставляем стандартные настройки
    input.setAttribute('accept', 'image/*');
  }
};

/**
 * Безопасный способ открытия камеры или выбора файла
 * @param fileInputRef - ссылка на input элемент
 * @param handleFileSelect - функция обработки выбранных файлов
 */
export const safeOpenCamera = (
  fileInputRef: React.RefObject<HTMLInputElement>,
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
): void => {
  if (!fileInputRef.current) return;
  
  // Очищаем value, чтобы можно было выбрать тот же файл повторно
  fileInputRef.current.value = '';
  
  // Оптимизируем input для текущей платформы
  optimizeFileInput(fileInputRef.current);
  
  // Добавляем обработчик события change
  const currentInput = fileInputRef.current;
  currentInput.onchange = handleFileSelect as any;
  
  // Открываем диалог выбора файла/камеры
  currentInput.click();
}; 