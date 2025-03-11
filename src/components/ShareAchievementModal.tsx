import { useRef, useState, useEffect } from 'react';
import { X, Share2, Download, Copy, Instagram, Send } from 'lucide-react';
import toast, { Toast } from 'react-hot-toast';

// Расширяем тип опций toast, добавляя поддержку 'type'
interface CustomToastOptions extends Partial<Pick<Toast, 'id' | 'icon' | 'duration' | 'ariaProps' | 'className' | 'style' | 'position' | 'iconTheme' | 'removeDelay'>> {
  type?: 'success' | 'error' | 'warning' | 'info';
}

interface ShareAchievementModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  beastName: string;
  weightPhrase: string;
  totalVolume: number;
  nextBeastThreshold: number;
  currentBeastThreshold: number;
  beastImage: string;
  isBeast?: boolean; // Флаг для различения зверей и обычных достижений
  displayValue?: string; // Отформатированное значение для отображения
  unit?: string; // Единица измерения
}

export function ShareAchievementModal({
  isOpen,
  onClose,
  userName,
  beastName,
  weightPhrase,
  totalVolume,
  nextBeastThreshold,
  currentBeastThreshold,
  beastImage,
  isBeast,
  displayValue,
  unit,
}: ShareAchievementModalProps) {
  const [shareableImage, setShareableImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [imageUrlId, setImageUrlId] = useState<string | null>(null);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const achievementCardRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Расчет прогресса до следующего зверя
  const progressPercentage = Math.min(
    100,
    Math.round(((totalVolume - currentBeastThreshold) / (nextBeastThreshold - currentBeastThreshold)) * 100)
  );

  // Фиксируем размеры карточки
  const cardWidth = 320;
  const cardHeight = 570;

  // Сохраняем текущий фон для дальнейшего использования
  const fallbackGradient = 'linear-gradient(135deg, #4338ca, #7e22ce)';
  const [imageData, setImageData] = useState<string | null>(null);

  // Проверяем поддержку нативного шаринга
  useEffect(() => {
    setCanNativeShare(
      typeof navigator !== 'undefined' &&
        navigator.share !== undefined &&
        typeof navigator.canShare === 'function'
    );
  }, []);

  // Загружаем изображение зверя при открытии модального окна
  useEffect(() => {
    if (isOpen && isBeast && beastImage) {
      setLoading(true);
      setImageLoaded(false);
      
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        setImageData(beastImage);
        setImageLoaded(true);
        // Генерируем изображение сразу после загрузки фона
        generateShareImage();
      };
      img.onerror = () => {
        console.error('Ошибка загрузки изображения зверя');
        setImageData(null);
        setImageLoaded(true);
        // Все равно пытаемся сгенерировать, но с градиентным фоном
        generateShareImage();
      };
      img.src = beastImage;
    }
  }, [isOpen, beastImage, isBeast]);

  // Функция рисования на canvas
  const drawAchievementCard = async (canvas: HTMLCanvasElement): Promise<boolean> => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    
    // Устанавливаем размеры canvas
    canvas.width = cardWidth * 2; // Увеличиваем разрешение в 2 раза для более четкого изображения
    canvas.height = cardHeight * 2;
    ctx.scale(2, 2); // Масштабируем контекст
    
    // Очищаем canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    try {
      // Шаг 1: Рисуем фон
      if (isBeast && beastImage) {
        const backgroundImg = new Image();
        backgroundImg.crossOrigin = 'anonymous';
        
        // Ждем загрузки фонового изображения
        await new Promise<void>((resolve, reject) => {
          backgroundImg.onload = () => resolve();
          backgroundImg.onerror = () => reject(new Error('Не удалось загрузить фоновое изображение'));
          backgroundImg.src = beastImage;
        }).catch(() => {
          // В случае ошибки загрузки рисуем градиентный фон
          const gradient = ctx.createLinearGradient(0, 0, cardWidth, cardHeight);
          gradient.addColorStop(0, '#4338ca');
          gradient.addColorStop(1, '#7e22ce');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, cardWidth, cardHeight);
        });
        
        // Если изображение успешно загружено, рисуем его с сохранением пропорций
        if (backgroundImg.complete && backgroundImg.naturalHeight !== 0) {
          // Определяем размер и положение для сохранения правильных пропорций
          const imgRatio = backgroundImg.naturalWidth / backgroundImg.naturalHeight;
          const cardRatio = cardWidth / cardHeight;
          
          let drawWidth, drawHeight, offsetX = 0, offsetY = 0;
          
          if (imgRatio > cardRatio) {
            // Изображение шире, чем нужно - подгоняем по высоте и центрируем по ширине
            drawHeight = cardHeight;
            drawWidth = cardHeight * imgRatio;
            offsetX = -(drawWidth - cardWidth) / 2;
          } else {
            // Изображение выше, чем нужно - подгоняем по ширине и центрируем по высоте
            drawWidth = cardWidth;
            drawHeight = cardWidth / imgRatio;
            offsetY = -(drawHeight - cardHeight) / 2;
          }
          
          ctx.drawImage(backgroundImg, offsetX, offsetY, drawWidth, drawHeight);
        }
      } else {
        // Для не-зверей используем градиентный фон
        const gradient = ctx.createLinearGradient(0, 0, cardWidth, cardHeight);
        gradient.addColorStop(0, '#4338ca');
        gradient.addColorStop(1, '#7e22ce');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, cardWidth, cardHeight);
      }
      
      // Шаг 2: Добавляем верхний градиент для улучшения читаемости
      const topGradient = ctx.createLinearGradient(0, 0, 0, 150);
      topGradient.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
      topGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = topGradient;
      ctx.fillRect(0, 0, cardWidth, 150);
      
      // Шаг 3: Добавляем нижний градиент для улучшения читаемости
      const bottomGradient = ctx.createLinearGradient(0, cardHeight - 200, 0, cardHeight);
      bottomGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
      bottomGradient.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
      ctx.fillStyle = bottomGradient;
      ctx.fillRect(0, cardHeight - 200, cardWidth, 200);
      
      // Шаг 4: Добавляем логотип в правом верхнем углу с прозрачным фоном
      ctx.save();
      ctx.filter = 'blur(5px)';
      ctx.fillStyle = 'rgba(249, 115, 22, 0.4)';
      ctx.fillRect(cardWidth - 125, 20, 110, 30);
      ctx.restore();
      
      ctx.font = '500 12px Inter, system-ui, sans-serif';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.fillText('HARDCASE.TRAINING', cardWidth - 70, 38);
      
      // Шаг 5: Добавляем блок с весом в левом верхнем углу (по старому дизайну)
      ctx.save();
      ctx.filter = 'blur(5px)';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(20, 20, 100, 60);
      ctx.restore();
      
      ctx.font = 'bold 28px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#f97316';
      ctx.textAlign = 'center';
      ctx.fillText(totalVolume.toString(), 70, 50);
      
      // Отступ для "кг" с учетом размера числа, чтобы не наезжал
      const weightWidth = ctx.measureText(totalVolume.toString()).width;
      ctx.font = '500 14px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#f97316';
      ctx.textAlign = 'left';
      ctx.fillText('кг', 70 + weightWidth/2 + 5, 50);
      
      ctx.font = '500 12px Inter, system-ui, sans-serif';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.fillText('ОБЩИЙ ОБЪЕМ', 70, 70);
      
      // Шаг 6: Добавляем имя зверя в правой части под логотипом
      // (сдвигаем вправо под блок HARDCASE.TRAINING)
      ctx.font = 'bold 42px Inter, system-ui, sans-serif';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'right';
      ctx.fillText(beastName.toUpperCase(), cardWidth - 20, 110);
      
      // Шаг 7: Добавляем прогресс-бар в нижней части карточки
      // Фон прогресс-бара
      ctx.fillStyle = 'rgba(55, 65, 81, 0.6)';
      const progressBarY = cardHeight - 130;
      ctx.fillRect(cardWidth * 0.05, progressBarY, cardWidth * 0.9, 10);
      
      // Заполнение прогресс-бара
      // Градиент от оранжевого к красному
      const progressGradient = ctx.createLinearGradient(
        cardWidth * 0.05, 0, 
        cardWidth * 0.05 + cardWidth * 0.9 * progressPercentage / 100, 0
      );
      progressGradient.addColorStop(0, '#f97316');
      progressGradient.addColorStop(1, '#ef4444');
      ctx.fillStyle = progressGradient;
      ctx.fillRect(cardWidth * 0.05, progressBarY, cardWidth * 0.9 * progressPercentage / 100, 10);
      
      // Шаг 8: Добавляем индикатор прогресса с процентами и кг до следующего уровня
      // Рассчитываем сколько кг осталось до следующего уровня
      const volumeToNext = nextBeastThreshold - totalVolume;
      
      // Просто текст без фона (прозрачный)
      ctx.font = '500 12px Inter, system-ui, sans-serif';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.fillText(
        `${progressPercentage}% до ${nextBeastThreshold} кг (осталось ${volumeToNext} кг)`,
        cardWidth / 2,
        progressBarY + 35
      );
      
      // Шаг 9: Добавляем мотивационную фразу
      if (weightPhrase) {
        ctx.font = '500 18px Inter, system-ui, sans-serif';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Разбиваем текст на несколько строк, если он слишком длинный
        const words = weightPhrase.split(' ');
        let line = '';
        let yPos = cardHeight - 80;
        const lineHeight = 24;
        const maxWidth = cardWidth - 40;
        
        for (let i = 0; i < words.length; i++) {
          const testLine = line + words[i] + ' ';
          const metrics = ctx.measureText(testLine);
          
          if (metrics.width > maxWidth && i > 0) {
            ctx.fillText(line, cardWidth / 2, yPos);
            line = words[i] + ' ';
            yPos += lineHeight;
          } else {
            line = testLine;
          }
        }
        
        ctx.fillText(line, cardWidth / 2, yPos);
      }
      
      // Шаг 10: Добавляем имя пользователя
      ctx.font = '500 14px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#d1d5db';
      ctx.textAlign = 'center';
      ctx.fillText(`@${userName}`, cardWidth / 2, cardHeight - 25);
      
      return true;
    } catch (error) {
      console.error('Ошибка при рисовании на canvas:', error);
      return false;
    }
  };

  // Генерация изображения
  const generateShareImage = async () => {
    if (!canvasRef.current) return;
    
    setLoading(true);
    
    try {
      // Рисуем карточку на canvas
      const success = await drawAchievementCard(canvasRef.current);
      
      if (!success) {
        throw new Error('Не удалось нарисовать карточку на canvas');
      }
      
      // Конвертируем canvas в URL
      const dataUrl = canvasRef.current.toDataURL('image/png');
      
      // Проверяем, что созданный dataUrl валидный и не пустой
      if (!dataUrl || dataUrl === 'data:,') {
        throw new Error('Созданный dataUrl невалидный или пустой');
      }
      
      // Очищаем предыдущий URL, если он существует
      if (imageUrlId) {
        URL.revokeObjectURL(imageUrlId);
      }
      
      // Конвертируем dataUrl в Blob для более надежного шаринга
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      
      // Проверяем размер Blob
      if (blob.size < 5000) {
        console.warn('Создан слишком маленький blob, возможно изображение неполное');
        throw new Error('Изображение получилось слишком маленьким');
      }
      
      const newImageUrl = URL.createObjectURL(blob);
      setShareableImage(newImageUrl);
      setImageUrlId(newImageUrl);
      console.log('Сгенерировано изображение для шаринга:', newImageUrl);
    } catch (error) {
      console.error('Ошибка при генерации изображения:', error);
      toast('Не удалось создать изображение', { type: 'error' } as CustomToastOptions);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!shareableImage) return;

    try {
      const link = document.createElement('a');
      link.href = shareableImage;
      link.download = `hardcase-beast-${beastName}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast('Изображение скачано', { type: 'success' } as CustomToastOptions);
    } catch (error) {
      console.error('Ошибка при скачивании изображения:', error);
      toast('Не удалось скачать изображение', { type: 'error' } as CustomToastOptions);
    }
  };

  const handleCopyImage = async () => {
    if (!shareableImage) return;

    try {
      const response = await fetch(shareableImage);
      const blob = await response.blob();
      const item = new ClipboardItem({ 'image/png': blob });
      await navigator.clipboard.write([item]);
      toast('Изображение скопировано в буфер обмена', { type: 'success' } as CustomToastOptions);
      return true;
    } catch (error) {
      console.error('Ошибка при копировании изображения:', error);
      toast('Не удалось скопировать изображение', { type: 'error' } as CustomToastOptions);
      return false;
    }
  };

  const handleNativeShare = async () => {
    if (!shareableImage) return;

    try {
      const response = await fetch(shareableImage);
      const blob = await response.blob();
      const file = new File([blob], `hardcase-beast-${beastName}.png`, { type: 'image/png' });

      // Проверяем поддержку шаринга файлов
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `HARDCASE.TRAINING: Зверь ${beastName}`,
          text: `${weightPhrase} - ${totalVolume} кг`,
          files: [file],
        });
      } else {
        // Если файлы не поддерживаются, пробуем шарить только текст
        await navigator.share({
          title: `HARDCASE.TRAINING: Зверь ${beastName}`,
          text: `${weightPhrase} - ${totalVolume} кг\nhardcase.training`,
          url: 'https://hardcase.training'
        });
        
        // Показываем сообщение о копировании
        handleCopyImage();
        toast('Изображение скопировано в буфер обмена', { type: 'info' } as CustomToastOptions);
      }

      toast('Успешно отправлено', { type: 'success' } as CustomToastOptions);
    } catch (error) {
      console.error('Ошибка при шаринге:', error);
      if (error instanceof Error && error.name !== 'AbortError') {
        toast('Не удалось поделиться', { type: 'error' } as CustomToastOptions);
      }
    }
  };

  const handleInstagramShare = () => {
    if (!shareableImage) return;
    handleCopyImage().then(() => {
      window.location.href = 'instagram://story';
      toast('Изображение скопировано! Вставьте его в Instagram Stories', { type: 'info' } as CustomToastOptions);
    });
  };

  const handleTelegramShare = () => {
    if (!shareableImage) return;
    handleCopyImage().then(() => {
      window.location.href = 'https://t.me/share/url?url=hardcase.training&text=Мое%20достижение%20в%20HARDCASE.TRAINING';
      toast('Изображение скопировано! Вставьте его в сообщение Telegram', { type: 'info' } as CustomToastOptions);
    });
  };

  // Стили для карточки
  const inlineStyles = {
    cardContainer: {
      position: 'relative' as const,
      width: `${cardWidth}px`,
      height: `${cardHeight}px`,
      margin: '0 auto',
      borderRadius: '16px',
      overflow: 'hidden',
      backgroundColor: 'transparent',
      boxSizing: 'border-box' as const,
      border: '2px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
    },
    canvas: {
      width: `${cardWidth}px`,
      height: `${cardHeight}px`,
      borderRadius: '16px',
      display: 'block',
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center px-4 py-6 overflow-y-auto">
      <div className="bg-gray-900 rounded-xl max-w-md w-full p-5 mx-auto relative border border-gray-800">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <h2 className="text-xl font-bold text-white mb-5 text-center">
          {isBeast ? `Зверь ${beastName}` : 'Достижение'}
        </h2>

        <div className="text-center">
          <div className="beast-card-container" ref={achievementCardRef} style={inlineStyles.cardContainer}>
            {/* Скрытый canvas для генерации изображения */}
            <canvas ref={canvasRef} style={inlineStyles.canvas} />
          </div>

          {loading && (
            <div className="mt-4 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
          )}

          {!loading && shareableImage && (
            <>
              {canNativeShare ? (
                <button
                  onClick={handleNativeShare}
                  className="w-full mt-6 flex items-center justify-center gap-2 p-4 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-lg font-semibold"
                >
                  <Share2 className="w-6 h-6" />
                  <span>Поделиться</span>
                </button>
              ) : (
                <div className="mt-6 text-center">
                  <p className="text-gray-500">Ваше устройство не поддерживает прямой шеринг.</p>
                  <p className="text-gray-500 mt-2">Сделайте скриншот, чтобы сохранить изображение.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}