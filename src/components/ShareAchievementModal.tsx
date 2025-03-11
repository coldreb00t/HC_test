import { useRef, useState, useEffect } from 'react';
import { X, Share2, Download, Copy, Instagram, Send } from 'lucide-react';
import domToImage from 'dom-to-image';
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
  const [copied, setCopied] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageData, setImageData] = useState<string | null>(null);
  const achievementCardRef = useRef<HTMLDivElement>(null);

  // Фиксированные размеры (уменьшены для лучшей адаптации на iPhone)
  const cardWidth = 290;
  const cardHeight = 540;

  const canNativeShare = typeof navigator !== 'undefined' && navigator.share !== undefined;

  // Исправляем расчет оставшегося веса до следующего уровня, предотвращая отрицательные значения
  const volumeToNext = Math.max(0, nextBeastThreshold - totalVolume);
  const progressPercentage = Math.min(
    ((totalVolume - currentBeastThreshold) / (nextBeastThreshold - currentBeastThreshold)) * 100,
    100
  );

  const isMaxLevel = beastName === 'Косатка';
  const fallbackGradient = 'linear-gradient(to bottom, #1f2937, #111827)';

  // Сохраняем ID URL-объекта для очистки
  const [imageUrlId, setImageUrlId] = useState<string | null>(null);

  useEffect(() => {
    if (beastImage && isOpen) {
      console.log('Получено изображение зверя (URL):', beastImage, 'Тип:', typeof beastImage);

      setImageData(null);
      setImageLoaded(false);

      const img = new Image();
      img.crossOrigin = ''; // Убрано для локальных ресурсов, так как не нужно

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const dataUrl = canvas.toDataURL('image/png');
            setImageData(dataUrl);
            console.log('Изображение успешно сконвертировано в Data URL:', dataUrl.slice(0, 50));
          }
        } catch (e) {
          console.error('Ошибка при конвертации изображения в Data URL:', e);
        } finally {
          setImageLoaded(true);
        }
      };

      img.onerror = (e) => {
        console.error('Ошибка загрузки изображения:', beastImage, e);
        toast('Не удалось загрузить изображение зверя', { type: 'error' } as CustomToastOptions);
        setImageLoaded(true); // Продолжаем, даже если изображение не загрузилось
        setImageData(null); // Сбрасываем imageData при ошибке
      };

      img.src = beastImage;

      const timeout = setTimeout(() => {
        if (!imageLoaded) {
          console.warn('Время загрузки изображения истекло (120 секунд), продолжаем без него');
          toast('Загрузка изображения заняла слишком много времени, используется запасной фон', { type: 'warning' } as CustomToastOptions);
          setImageLoaded(true); // Увеличили таймаут до 120 секунд для надежности
          setImageData(null); // Сбрасываем imageData при таймауте
        }
      }, 120000); // Увеличили таймаут до 120 секунд для надежности

      return () => clearTimeout(timeout);
    } else {
      setImageLoaded(true);
    }
  }, [beastImage, isOpen]);

  useEffect(() => {
    if (isOpen && imageLoaded && achievementCardRef.current) {
      // Даем элементу немного времени для рендеринга
      setTimeout(() => {
        generateImage();
      }, 500);
    }
  }, [isOpen, imageLoaded]);

  const prepareElementForCapture = (element: HTMLDivElement) => {
    // Добавляем стили непосредственно к элементу для устранения проблемы с белой полосой
    element.style.padding = '0';
    element.style.margin = '0 auto';
    element.style.border = 'none';
    element.style.overflow = 'hidden';
    element.style.boxSizing = 'border-box';
    element.style.backgroundColor = imageData ? 'transparent' : '#4c1d95';
    
    // Устанавливаем фоновое изображение напрямую
    if (imageData) {
      element.style.backgroundImage = `url(${imageData})`;
      element.style.backgroundSize = 'cover';
      element.style.backgroundPosition = 'center';
      element.style.backgroundRepeat = 'no-repeat';
    }
    
    // Также проверяем и исправляем все дочерние изображения
    const images = element.querySelectorAll('img');
    images.forEach(img => {
      img.crossOrigin = 'anonymous'; // Добавляем crossOrigin для всех изображений
      img.style.left = '0';
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      img.style.position = 'absolute';
    });
    
    return element;
  };

  const generateImage = async () => {
    if (!achievementCardRef.current) return;

    setLoading(true);

    try {
      // Даем элементу немного времени для рендеринга и загрузки всех изображений
      await new Promise((resolve) => setTimeout(resolve, 500)); 

      const element = achievementCardRef.current;
      const preparedElement = prepareElementForCapture(element);
      
      // Принудительно заставляем браузер перерисовать элемент
      preparedElement.style.display = 'none';
      preparedElement.offsetHeight; // Trigger reflow
      preparedElement.style.display = 'block';

      // Убедимся, что размеры DOM-элемента фиксированы
      const computedStyle = window.getComputedStyle(element);
      console.log('Размеры элемента перед захватом:', {
        width: computedStyle.width,
        height: computedStyle.height,
      });

      const scale = 2; // Фиксированный масштаб
      const options = {
        width: cardWidth * scale,
        height: cardHeight * scale,
        style: {
          transform: `scale(${scale})`,
          transformOrigin: 'top left', // Уточняем начало координат
          width: `${cardWidth}px`,
          height: `${cardHeight}px`,
          margin: 0,
          padding: 0,
          boxSizing: 'border-box' as const,
          borderWidth: 0,
          overflow: 'hidden',
          backgroundColor: imageData ? 'transparent' : '#4c1d95', // Фиолетовый фон по умолчанию
          position: 'absolute',
          left: 0,
          top: 0,
        },
        quality: 0.95, // Немного уменьшаем качество для быстрой обработки на мобильных устройствах
        imagePlaceholder: imageData || fallbackGradient, // Используем наше изображение в первую очередь
        bgcolor: imageData ? 'transparent' : '#4c1d95', // Дополнительный параметр для dom-to-image
        cacheBust: true, // Предотвращаем кэширование для обеспечения свежих данных
        fetchRequestInit: { // Настройки для fetch запросов к внешним ресурсам
          mode: 'cors',
          credentials: 'same-origin',
        },
      };

      // Используем dom-to-image-more вместо стандартного dom-to-image для лучшей обработки фоновых изображений
      domToImage.toBlob(element, options)
        .then((blob: Blob) => {
          if (!blob) {
            throw new Error('Не удалось создать изображение');
          }
          console.log('Создан blob размером:', blob.size);
          if (imageUrlId) {
            URL.revokeObjectURL(imageUrlId);
          }
          const newImageUrl = URL.createObjectURL(blob);
          setShareableImage(newImageUrl);
          setImageUrlId(newImageUrl); // Сохраняем ID URL для очистки
          console.log('Сгенерировано изображение для шаринга (Blob URL):', newImageUrl);
          setLoading(false);
        })
        .catch((error: unknown) => {
          console.error('Ошибка при генерации изображения:', error);
          toast('Не удалось создать изображение', { type: 'error' } as CustomToastOptions);
          setLoading(false);
        });
    } catch (error: unknown) {
      console.error('Ошибка при генерации изображения:', error);
      toast('Не удалось создать изображение', { type: 'error' } as CustomToastOptions);
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!shareableImage) return;

    // Определяем, используется ли iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    
    if (isIOS) {
      // Специальная обработка для iOS - открываем изображение в новой вкладке
      try {
        // Создаем временный элемент img для предварительной загрузки изображения
        const img = new Image();
        img.src = shareableImage;
        
        // Открываем изображение в новой вкладке
        window.open(shareableImage, '_blank');
        
        toast('Изображение открыто. Нажмите "Поделиться" и выберите "Сохранить изображение"', 
          { type: 'success', duration: 5000 } as CustomToastOptions);
      } catch (error) {
        console.error('Ошибка при открытии изображения на iOS:', error);
        toast('Не удалось открыть изображение. Попробуйте использовать кнопку "Поделиться"', 
          { type: 'error' } as CustomToastOptions);
      }
      return;
    }

    // Стандартная обработка для других платформ
    fetch(shareableImage)
      .then((response) => response.blob())
      .then((blob) => {
        const img = new Image();
        img.src = URL.createObjectURL(blob);
        img.onload = () => {
          console.log('Размеры Blob перед сохранением:', img.width, 'x', img.height);

          // Ожидаемые размеры с учетом нового масштаба
          const expectedWidth = cardWidth * 2; // 580px
          const expectedHeight = cardHeight * 2; // 1080px

          // Проверяем, соответствуют ли размеры ожидаемым пропорциям
          if (img.width !== expectedWidth || img.height !== expectedHeight) {
            console.warn(`Размеры Blob не соответствуют ожидаемым (${expectedWidth}x${expectedHeight}), корректируем пропорции`);
            // Создаем новый canvas для строгой коррекции пропорций
            const correctedCanvas = document.createElement('canvas');
            correctedCanvas.width = expectedWidth; // Фиксированная ширина
            correctedCanvas.height = expectedHeight; // Фиксированная высота
            const ctx = correctedCanvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, expectedWidth, expectedHeight); // Рисуем с правильными пропорциями
              correctedCanvas.toBlob(
                (correctedBlob: Blob | null) => {
                  if (correctedBlob) {
                    saveBlobWithMetadata(correctedBlob, `hardcase-beast-${beastName.toLowerCase().replace(/\s+/g, '-')}.png`, expectedWidth, expectedHeight);
                  } else {
                    throw new Error('Не удалось создать исправленный Blob');
                  }
                },
                'image/png',
                1.0 // Максимальное качество
              );
            }
          } else {
            // Если размеры корректны, сохраняем как есть
            saveBlobWithMetadata(blob, `hardcase-beast-${beastName.toLowerCase().replace(/\s+/g, '-')}.png`, expectedWidth, expectedHeight);
          }

          URL.revokeObjectURL(img.src); // Освобождаем URL для изображения
        };
      })
      .catch((error: Error) => {
        console.error('Ошибка при загрузке Blob:', error);
        toast('Не удалось скачать изображение', { type: 'error' } as CustomToastOptions);
      });
  };

  // Новая функция для сохранения Blob с явными метаданными размеров
  const saveBlobWithMetadata = (blob: Blob, filename: string, expectedWidth: number, expectedHeight: number) => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;

    // Устанавливаем метаданные размеров и DPI в ссылке
    link.setAttribute('data-width', `${expectedWidth}`);
    link.setAttribute('data-height', `${expectedHeight}`);
    link.setAttribute('data-dpi', '72'); // Стандартное DPI для веб-изображений

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    toast('Изображение сохранено', { type: 'success' } as CustomToastOptions);
  };

  const handleCopyImage = async () => {
    if (!shareableImage) return;

    try {
      const response = await fetch(shareableImage);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob,
        }),
      ]);

      setCopied(true);
      toast('Изображение скопировано в буфер обмена', { type: 'success' } as CustomToastOptions);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Ошибка при копировании изображения:', error);
      toast('Не удалось скопировать изображение', { type: 'error' } as CustomToastOptions);
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

  // Очистка URL-объекта при закрытии модального окна или размонтировании компонента
  useEffect(() => {
    return () => {
      if (imageUrlId) {
        URL.revokeObjectURL(imageUrlId);
        console.log('Очищен URL-объект изображения:', imageUrlId);
      }
      setShareableImage(null);
      setImageUrlId(null);
    };
  }, []);

  if (!isOpen) return null;

  const inlineStyles = {
    cardContainer: {
      position: 'relative' as const,
      width: '320px',
      height: '570px',
      margin: '0 auto',
      borderRadius: '16px',
      overflow: 'hidden',
      background: isBeast ? `url(${beastImage})` : 'linear-gradient(135deg, #4338ca, #7e22ce)',
      backgroundSize: 'cover' as const,
      backgroundPosition: 'center' as const,
      backgroundRepeat: 'no-repeat' as const,
      boxSizing: 'border-box' as const,
      border: '2px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
      zIndex: 1,
      padding: 0,
    },
    topGradient: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      height: '120px',
      background: 'linear-gradient(to bottom, rgba(17, 24, 39, 0.95), transparent)',
      zIndex: 5,
    },
    bottomGradient: {
      position: 'absolute' as const,
      bottom: 0,
      left: 0,
      right: 0,
      height: '180px',
      background: 'linear-gradient(to top, rgba(17, 24, 39, 0.95), transparent)',
      zIndex: 5,
    },
    weightContainer: {
      position: 'absolute' as const,
      top: '20px',
      left: '20px',
      zIndex: 10,
      background: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(10px)',
      padding: '10px 15px',
      borderRadius: '10px',
    },
    weightValue: {
      fontSize: '36px',
      fontWeight: 'bold',
      color: '#f97316',
      textShadow: '0 2px 4px rgba(0, 0, 0, 0.7)',
    },
    weightUnit: {
      fontSize: '18px',
      fontWeight: '500',
      color: '#f97316',
    },
    weightLabel: {
      fontSize: '12px',
      color: 'white',
      marginTop: '4px',
    },
    logoContainer: {
      position: 'absolute' as const,
      top: '20px',
      right: '20px',
      zIndex: 10,
      background: 'rgba(249, 115, 22, 0.4)',
      backdropFilter: 'blur(10px)',
      padding: '8px 15px',
      borderRadius: '8px',
    },
    logo: {
      fontSize: '12px',
      fontWeight: '500',
      color: 'white',
    },
    progressContainer: {
      position: 'absolute' as const,
      bottom: '160px',
      left: 0,
      right: 0,
      zIndex: 10,
    },
    progressBar: {
      height: '12px',
      width: '90%',
      margin: '0 auto',
      background: 'rgba(55, 65, 81, 0.6)',
    },
    progressFill: {
      height: '100%',
      background: '#f97316',
      width: `${progressPercentage}%`,
      transition: 'width 0.7s ease-out',
    },
    progressText: {
      display: 'flex',
      justifyContent: 'center',
      marginTop: '8px',
    },
    progressTextContainer: {
      fontSize: '12px', // Уменьшили размер шрифта с 14px до 12px
      fontWeight: '500',
      color: 'white',
      padding: '4px 16px', // Уменьшили отступы для компактности
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(10px)',
      borderRadius: '9999px',
    },
    progressHighlight: {
      color: '#fb923c',
      fontWeight: 'bold',
    },
    beastInfo: {
      position: 'absolute' as const,
      bottom: '20px',
      left: 0,
      right: 0,
      padding: '20px 0',
      width: '100%',
      textAlign: 'center' as const,
      zIndex: 10,
    },
    beastName: {
      fontSize: '28px',
      fontWeight: 'bold',
      color: '#fb923c',
      textShadow: '0 2px 4px rgba(0, 0, 0, 0.7)',
      marginBottom: '8px',
    },
    beastPhrase: {
      fontSize: '16px',
      color: 'white',
      textShadow: '0 1px 2px rgba(0, 0, 0, 0.7)',
      maxWidth: '260px',
      margin: '0 auto',
      lineHeight: 1.4,
    },
    userName: {
      fontSize: '14px',
      color: '#d1d5db',
      marginTop: '12px',
    },
    coverImage: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      objectFit: 'cover' as const, // Сохраняем пропорции без искажений
      zIndex: 0,
      opacity: 1,
    },
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-2 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl overflow-hidden max-w-md w-full mx-auto my-4">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">Поделиться достижением</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-4">
          <div
            ref={achievementCardRef}
            data-html2canvas-beast-card
            style={inlineStyles.cardContainer}
            className="beast-card-container"
          >
            {isBeast ? (
              // Шаблон для зверей
              <>
                {imageData && (
                  <img
                    src={imageData}
                    alt={`Зверь ${beastName}`}
                    crossOrigin="anonymous"
                    style={{
                      ...inlineStyles.coverImage,
                      position: 'absolute',
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      zIndex: 1
                    }}
                    onError={(e) => {
                      console.error('Ошибка отображения изображения:', e);
                    }}
                  />
                )}

                <div style={inlineStyles.topGradient}></div>
                <div style={inlineStyles.bottomGradient}></div>

                <div style={inlineStyles.weightContainer}>
                  <p style={inlineStyles.weightValue}>
                    {totalVolume} <span style={inlineStyles.weightUnit}>кг</span>
                  </p>
                  <p style={inlineStyles.weightLabel}>Поднятый вес</p>
                </div>

                <div style={inlineStyles.logoContainer}>
                  <div style={inlineStyles.logo}>HARDCASE.TRAINING</div>
                </div>

                {!isMaxLevel && (
                  <div style={inlineStyles.progressContainer}>
                    <div style={inlineStyles.progressBar}>
                      <div style={inlineStyles.progressFill}></div>
                    </div>
                    <div style={inlineStyles.progressText}>
                      <div style={inlineStyles.progressTextContainer}>
                        До следующего уровня{' '}
                        <span style={inlineStyles.progressHighlight}>осталось {volumeToNext} кг</span>
                      </div>
                    </div>
                  </div>
                )}

                <div style={inlineStyles.beastInfo}>
                  <h3 style={inlineStyles.beastName}>{beastName}</h3>
                  <p style={inlineStyles.beastPhrase}>{weightPhrase}</p>
                  <p style={inlineStyles.userName}>@{userName}</p>
                </div>
              </>
            ) : (
              // Шаблон для обычных достижений
              <div style={{
                ...inlineStyles.cardContainer,
                background: 'linear-gradient(135deg, #4338ca, #7e22ce)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '30px 15px'
              }}>
                <div style={inlineStyles.logoContainer}>
                  <div style={inlineStyles.logo}>HARDCASE.TRAINING</div>
                </div>
                
                <div style={{
                  fontSize: '48px',
                  fontWeight: 'bold',
                  color: 'white',
                  margin: '30px 0 10px',
                  textShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}>
                  {displayValue || totalVolume.toString()}
                  {unit && (
                    <span style={{
                      fontSize: '18px',
                      fontWeight: 'normal',
                      color: 'rgba(255, 255, 255, 0.9)',
                      marginTop: '5px'
                    }}>
                      {unit}
                    </span>
                  )}
                </div>
                
                <h3 style={{
                  fontSize: '32px',
                  fontWeight: 'bold',
                  color: 'white',
                  marginBottom: '15px',
                  textAlign: 'center',
                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)'
                }}>
                  {beastName}
                </h3>
                
                <p style={{
                  fontSize: '18px',
                  color: 'white',
                  textAlign: 'center',
                  maxWidth: '280px',
                  marginBottom: '30px',
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)'
                }}>
                  {weightPhrase}
                </p>
                
                <p style={inlineStyles.userName}>@{userName}</p>
              </div>
            )}
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