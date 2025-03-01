import { useRef, useState, useEffect } from 'react';
import { X, Share2, Download, Copy, Instagram, Send } from 'lucide-react';
import domToImage from 'dom-to-image';
import toast from 'react-hot-toast';

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
}: ShareAchievementModalProps) {
  const [shareableImage, setShareableImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageData, setImageData] = useState<string | null>(null);
  const achievementCardRef = useRef<HTMLDivElement>(null);

  // Фиксированные размеры (вернули исходные)
  const cardWidth = 324;
  const cardHeight = 600;

  const canNativeShare = typeof navigator !== 'undefined' && navigator.share !== undefined;

  const volumeToNext = nextBeastThreshold - totalVolume;
  const progressPercentage = Math.min(
    ((totalVolume - currentBeastThreshold) / (nextBeastThreshold - currentBeastThreshold)) * 100,
    100
  );

  const isMaxLevel = beastName === 'Косатка';
  const fallbackGradient = 'linear-gradient(to bottom, #1f2937, #111827)';

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
        setImageLoaded(true); // Продолжаем, даже если изображение не загрузилось
        setImageData(null); // Сбрасываем imageData при ошибке
      };

      img.src = beastImage;

      const timeout = setTimeout(() => {
        if (!imageLoaded) {
          console.warn('Время загрузки изображения истекло (60 секунд), продолжаем без него');
          setImageLoaded(true); // Увеличили таймаут до 60 секунд для надежности
          setImageData(null); // Сбрасываем imageData при таймауте
        }
      }, 60000); // Увеличили таймаут до 60 секунд

      return () => clearTimeout(timeout);
    } else {
      setImageLoaded(true);
    }
  }, [beastImage, isOpen]);

  useEffect(() => {
    if (isOpen && imageLoaded && achievementCardRef.current) {
      generateImage();
    }
  }, [isOpen, imageLoaded]);

  const generateImage = async () => {
    if (!achievementCardRef.current) return;

    setLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Задержка 1 секунда

      const element = achievementCardRef.current;
      element.style.display = 'none';
      element.offsetHeight;
      element.style.display = 'block';

      // Убедимся, что размеры DOM-элемента фиксированы
      const computedStyle = window.getComputedStyle(element);
      console.log('Размеры элемента перед захватом:', {
        width: computedStyle.width,
        height: computedStyle.height,
      });

      const scale = 2; // Фиксированный масштаб для 648x1200 пикселей
      const options = {
        width: cardWidth * scale, // 648 пикселей
        height: cardHeight * scale, // 1200 пикселей
        style: {
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          width: `${cardWidth}px`,
          height: `${cardHeight}px`,
        },
        quality: 1.0, // Максимальное качество
        imagePlaceholder: fallbackGradient, // Используем градиент, если изображение не загрузилось
      };

      domToImage.toBlob(element, options)
        .then((blob: Blob) => {
          if (blob) {
            setShareableImage(URL.createObjectURL(blob));
            console.log('Сгенерировано изображение для шаринга (Blob URL):', URL.createObjectURL(blob));
            setLoading(false);
          } else {
            throw new Error('Не удалось создать Blob из элемента DOM');
          }
        })
        .catch((error: unknown) => {
          console.error('Ошибка при генерации изображения:', error);
          toast.error('Не удалось создать изображение');
          setLoading(false);
        });
    } catch (error: unknown) {
      console.error('Ошибка при генерации изображения:', error);
      toast.error('Не удалось создать изображение');
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!shareableImage) return;

    // Проверяем размеры Blob через временный объект Image
    fetch(shareableImage)
      .then((response) => response.blob())
      .then((blob) => {
        const img = new Image();
        img.src = URL.createObjectURL(blob);
        img.onload = () => {
          console.log('Размеры Blob перед сохранением:', img.width, 'x', img.height);

          // Ожидаемые размеры с scale: 2
          const expectedWidth = 648;
          const expectedHeight = 1200;

          // Проверяем, соответствуют ли размеры ожидаемым пропорциям (9:16)
          if (img.width !== expectedWidth || img.height !== expectedHeight) {
            console.warn('Размеры Blob не соответствуют ожидаемым (648x1200), корректируем пропорции');
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
        toast.error('Не удалось скачать изображение');
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

    toast.success('Изображение сохранено');
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
      toast.success('Изображение скопировано в буфер обмена');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Ошибка при копировании изображения:', error);
      toast.error('Не удалось скопировать изображение');
    }
  };

  const handleNativeShare = async () => {
    if (!shareableImage) return;

    try {
      const response = await fetch(shareableImage);
      const blob = await response.blob();
      const file = new File([blob], `hardcase-beast-${beastName}.png`, { type: 'image/png' });

      await navigator.share({
        title: `HARDCASE.TRAINING: Зверь ${beastName}`,
        text: `${weightPhrase} - ${totalVolume} кг`,
        files: [file],
      });

      toast.success('Успешно отправлено');
    } catch (error) {
      console.error('Ошибка при шаринге:', error);
      if (error instanceof Error && error.name !== 'AbortError') {
        toast.error('Не удалось поделиться');
      }
    }
  };

  const handleInstagramShare = () => {
    if (!shareableImage) return;
    handleCopyImage().then(() => {
      window.location.href = 'instagram://story';
      toast('Изображение скопировано! Вставьте его в Instagram Stories', {
        icon: '📱',
        duration: 5000,
      });
    });
  };

  const handleTelegramShare = () => {
    if (!shareableImage) return;
    handleCopyImage().then(() => {
      window.location.href = 'https://t.me/share/url?url=hardcase.training&text=Мое%20достижение%20в%20HARDCASE.TRAINING';
      toast('Изображение скопировано! Вставьте его в сообщение Telegram', {
        icon: '✉️',
        duration: 5000,
      });
    });
  };

  if (!isOpen) return null;

  const inlineStyles = {
    cardContainer: {
      position: 'relative' as const,
      width: `${cardWidth}px`,
      height: `${cardHeight}px`,
      margin: '0 auto',
      borderRadius: '0.75rem',
      overflow: 'hidden',
      background: imageData ? 'none' : fallbackGradient,
      minWidth: `${cardWidth}px`, // Гарантируем минимальную ширину
      minHeight: `${cardHeight}px`, // Гарантируем минимальную высоту
      maxWidth: `${cardWidth}px`, // Ограничиваем максимальную ширину
      maxHeight: `${cardHeight}px`, // Ограничиваем максимальную высоту
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
      fontSize: '14px',
      fontWeight: '500',
      color: 'white',
      padding: '6px 20px',
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
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl overflow-hidden max-w-md w-full">
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
          >
            {imageData && (
              <img
                src={imageData}
                alt={`Зверь ${beastName}`}
                style={inlineStyles.coverImage}
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
          </div>

          {loading && (
            <div className="mt-4 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
          )}

          {!loading && shareableImage && (
            <>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  onClick={handleDownload}
                  className="flex items-center justify-center gap-2 p-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <Download className="w-5 h-5" />
                  <span>Скачать</span>
                </button>
                <button
                  onClick={handleCopyImage}
                  className="flex items-center justify-center gap-2 p-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <Copy className="w-5 h-5" />
                  <span>{copied ? 'Скопировано!' : 'Копировать'}</span>
                </button>
              </div>

              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Поделиться в соцсетях</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleInstagramShare}
                    className="flex flex-col items-center justify-center gap-1 p-4 bg-gradient-to-br from-purple-600 to-pink-500 text-white rounded-lg hover:opacity-90 transition-opacity"
                  >
                    <Instagram className="w-6 h-6" />
                    <span className="text-xs">Instagram Stories</span>
                  </button>
                  <button
                    onClick={handleTelegramShare}
                    className="flex flex-col items-center justify-center gap-1 p-4 bg-blue-500 text-white rounded-lg hover:opacity-90 transition-opacity"
                  >
                    <Send className="w-6 h-6" />
                    <span className="text-xs">Telegram</span>
                  </button>
                </div>
              </div>

              {canNativeShare && (
                <button
                  onClick={handleNativeShare}
                  className="w-full mt-4 flex items-center justify-center gap-2 p-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  <Share2 className="w-5 h-5" />
                  <span>Поделиться</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}