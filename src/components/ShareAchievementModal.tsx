import React, { useState, useEffect, useRef } from 'react';
import { X, Share } from 'lucide-react';
import html2canvas from 'html2canvas';
import toast, { Toast } from 'react-hot-toast';

// Расширяем глобальные типы для поддержки webkit
declare global {
  interface Window {
    webkit?: {
      messageHandlers?: {
        shareHandler?: {
          postMessage: (message: any) => void;
        };
      };
    };
  }
}

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
  achievementImage?: string;
  isBeast?: boolean; // Флаг для различения зверей и обычных достижений
  displayValue?: string; // Отформатированное значение для отображения
  unit?: string; // Единица измерения
  motivationalPhrase?: string; // Мотивационная фраза для обычных достижений
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
  achievementImage,
  isBeast,
  displayValue,
  unit,
  motivationalPhrase,
}: ShareAchievementModalProps) {
  const [shareableImage, setShareableImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [imageUrlId, setImageUrlId] = useState<string | null>(null);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [activeShareOption, setActiveShareOption] = useState<'vk' | 'telegram' | null>(null);
  const [captureComplete, setCaptureComplete] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [windowHeight, setWindowHeight] = useState(window.innerHeight);
  
  const achievementCardRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const prevDimensionsRef = useRef({ width: 0, height: 0 });
  const generateImageRef = useRef(false);
  const prevIsOpenRef = useRef(false);

  // Расчет прогресса до следующего зверя
  const progress = totalVolume > 0 && nextBeastThreshold > 0 
    ? Math.min(100, (totalVolume / nextBeastThreshold) * 100) 
    : 0;

  // Адаптивные размеры карточки в зависимости от высоты экрана
  const getCardDimensions = () => {
    // Базовые размеры
    const baseWidth = 320;
    const baseHeight = 570;
    
    // Доступная высота (с учетом отступов и заголовка)
    const availableHeight = windowHeight - 180; // Отступы + заголовок + кнопки
    
    // Если доступная высота меньше базовой высоты карточки
    if (availableHeight < baseHeight) {
      // Вычисляем коэффициент масштабирования
      const scale = Math.max(0.6, availableHeight / baseHeight); // Минимум 60% от оригинала
      
      return {
        width: Math.floor(baseWidth * scale),
        height: Math.floor(baseHeight * scale)
      };
    }
    
    // Возвращаем базовые размеры, если экран достаточно большой
    return { width: baseWidth, height: baseHeight };
  };
  
  // Мемоизируем размеры карточки, чтобы они не пересчитывались при каждом рендере
  const cardDimensions = React.useMemo(() => getCardDimensions(), [windowHeight]);
  const cardWidth = cardDimensions.width;
  const cardHeight = cardDimensions.height;

  // Отслеживаем изменение размера окна
  useEffect(() => {
    const handleResize = () => {
      setWindowHeight(window.innerHeight);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Перегенерируем изображение при изменении размеров карточки
  useEffect(() => {
    // Функция для проверки и генерации изображения
    const checkAndGenerateImage = () => {
      if (isOpen && !loading && (cardWidth > 0 && cardHeight > 0)) {
        // Проверяем, изменились ли размеры
        if (prevDimensionsRef.current.width !== cardWidth || 
            prevDimensionsRef.current.height !== cardHeight) {
          // Обновляем предыдущие размеры
          prevDimensionsRef.current = { width: cardWidth, height: cardHeight };
          // Если модальное окно открыто и размеры изменились, перегенерируем изображение
          console.log("Размеры карточки изменились, перегенерируем изображение");
          generateImageRef.current = true;
        }
      }
    };
    
    // Используем setTimeout, чтобы избежать бесконечных перерисовок
    const timeoutId = setTimeout(checkAndGenerateImage, 100);
    
    // Очищаем таймаут при размонтировании компонента или изменении зависимостей
    return () => clearTimeout(timeoutId);
  }, [cardWidth, cardHeight, isOpen, loading]);

  // Проверяем поддержку нативного шаринга
  useEffect(() => {
    setCanNativeShare(
      typeof navigator !== 'undefined' &&
        navigator.share !== undefined &&
        typeof navigator.canShare === 'function'
    );
  }, []);

  // Функция рисования на canvas для обычных достижений (не зверей)
  const drawRegularAchievementCard = async (canvas: HTMLCanvasElement): Promise<boolean> => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    
    console.log("Начинаем отрисовку карточки ОБЫЧНОГО достижения");
    
    // Устанавливаем размеры canvas с учетом масштабирования для высокого DPI
    const scale = 2; // Масштаб для высокого DPI
    canvas.width = cardWidth * scale;
    canvas.height = cardHeight * scale;
    ctx.scale(scale, scale);
    
    try {
      // Определяем цвет оверлея на основе текущего достижения
      let color = '#4338ca'; // Синий цвет по умолчанию
      if (beastName.toLowerCase().includes('тренировк')) {
        color = '#f97316'; // Оранжевый для тренировок
      } else if (beastName.toLowerCase().includes('объем')) {
        color = '#3b82f6'; // Синий для объема
      } else if (beastName.toLowerCase().includes('активность')) {
        color = '#22c55e'; // Зеленый для активности
      } else if (beastName.toLowerCase().includes('изменение')) {
        color = '#a855f7'; // Фиолетовый для тела
      }
      
      // Сначала рисуем градиентный фон (на случай, если изображение не загрузится)
      const gradient = ctx.createLinearGradient(0, 0, cardWidth, cardHeight);
      gradient.addColorStop(0, color); // Основной цвет
      gradient.addColorStop(1, '#6366f1'); // Светло-синий
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, cardWidth, cardHeight);
      
      // Пытаемся использовать изображение как фон, если оно есть
      // Для обычных достижений используем achievementImage, если он указан, иначе beastImage для обратной совместимости
      const backgroundImageUrl = achievementImage || beastImage;
      if (backgroundImageUrl && backgroundImageUrl.length > 0) {
        console.log("Пытаемся загрузить фоновое изображение:", backgroundImageUrl);
        
        const bgImage = new Image();
        bgImage.crossOrigin = 'anonymous';
        
        try {
          // Ждем загрузки изображения
          await new Promise<void>((resolve, reject) => {
            const timeoutId = setTimeout(() => {
              console.warn("Таймаут загрузки изображения");
              reject(new Error('Таймаут загрузки изображения'));
            }, 5000); // 5 секунд таймаут
            
            bgImage.onload = () => {
              clearTimeout(timeoutId);
              console.log("Фоновое изображение успешно загружено");
              resolve();
            };
            
            bgImage.onerror = () => {
              clearTimeout(timeoutId);
              console.warn("Ошибка загрузки фонового изображения");
              reject(new Error('Не удалось загрузить фоновое изображение'));
            };
            
            bgImage.src = backgroundImageUrl;
          });
          
          // Проверяем, что изображение действительно загружено
          if (bgImage.complete && bgImage.naturalWidth > 0) {
            // Рисуем изображение на canvas
            console.log("Рисуем фоновое изображение, размеры:", bgImage.width, "x", bgImage.height);
            const imgAspect = bgImage.width / bgImage.height;
            const canvasAspect = cardWidth / cardHeight;
            
            let drawWidth, drawHeight, offsetX = 0, offsetY = 0;
            
            if (imgAspect > canvasAspect) {
              // Изображение шире, чем canvas
              drawHeight = cardHeight;
              drawWidth = cardHeight * imgAspect;
              offsetX = (cardWidth - drawWidth) / 2;
            } else {
              // Изображение выше, чем canvas
              drawWidth = cardWidth;
              drawHeight = cardWidth / imgAspect;
              offsetY = (cardHeight - drawHeight) / 2;
            }
            
            // Очищаем canvas перед рисованием изображения
            ctx.clearRect(0, 0, cardWidth, cardHeight);
            ctx.drawImage(bgImage, offsetX, offsetY, drawWidth, drawHeight);
            
            // Накладываем цветной оверлей
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.75; // Прозрачность уменьшена на 15% (с 0.9 до 0.75)
            ctx.fillRect(0, 0, cardWidth, cardHeight);
            ctx.globalAlpha = 1.0;
          } else {
            console.warn("Изображение загружено, но имеет нулевые размеры");
          }
        } catch (error) {
          console.error("Ошибка при работе с фоновым изображением:", error);
          // В случае ошибки уже нарисован градиентный фон
        }
      } else {
        console.log("Фоновое изображение не указано, используем градиентный фон");
      }
      
      // Добавляем логотип HARDCASE.TRAINING в правый верхний угол
      ctx.save();
      // Создаем полупрозрачный фон для логотипа
      const logoX = cardWidth - 140;
      const logoY = 15;
      const logoWidth = 130;
      const logoHeight = 30;
      
      // Закругленный прямоугольник для фона логотипа
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.roundRect(logoX, logoY, logoWidth, logoHeight, 4);
      ctx.fill();
      
      // Рисуем текст логотипа
      ctx.font = 'bold 14px Inter, system-ui, sans-serif';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('HARDCASE.TRAINING', logoX + logoWidth/2, logoY + logoHeight/2);
      ctx.restore();
      
      // Содержимое
      ctx.fillStyle = 'white';
      
      // Центральный блок контента
      const contentCenterX = cardWidth / 2;
      const contentStartY = cardHeight * 0.15;
      
      // Иконка (рисуем круг с иконкой)
      ctx.save();
      ctx.beginPath();
      const iconRadius = 32;
      const iconCenterY = contentStartY + iconRadius;
      ctx.arc(contentCenterX, iconCenterY, iconRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fill();
      
      // Рисуем символ внутри круга в зависимости от типа достижения
      ctx.font = 'bold 32px Inter, system-ui, sans-serif';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Определяем иконку на основе заголовка достижения
      let iconSymbol = '🏆';
      if (beastName.toLowerCase().includes('тренировк')) {
        iconSymbol = '📅';
      } else if (beastName.toLowerCase().includes('объем')) {
        iconSymbol = '💪';
      } else if (beastName.toLowerCase().includes('активность')) {
        iconSymbol = '🏃';
      } else if (beastName.toLowerCase().includes('изменение')) {
        iconSymbol = '⚖️';
      }
      
      ctx.fillText(iconSymbol, contentCenterX, iconCenterY);
      ctx.restore();
      
      // Значение достижения (крупным шрифтом)
      const valueY = iconCenterY + iconRadius + 60;
      // Адаптивный шрифт в зависимости от длины значения
      const achievementValue = displayValue || totalVolume.toString();
      let valueFontSize = 60;
      
      // Уменьшаем размер шрифта для длинных значений
      if (achievementValue.length > 10) {
        valueFontSize = 40;
      } else if (achievementValue.length > 8) {
        valueFontSize = 45;
      } else if (achievementValue.length > 5) {
        valueFontSize = 50;
      }
      
      ctx.font = `bold ${valueFontSize}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Проверяем, помещается ли значение в доступную ширину
      const valueWidth = ctx.measureText(achievementValue).width;
      const maxValueWidth = cardWidth * 0.85;
      
      if (valueWidth > maxValueWidth) {
        // Если значение все еще не помещается, уменьшаем шрифт еще больше
        const scaleFactor = maxValueWidth / valueWidth;
        const newFontSize = Math.max(30, Math.floor(valueFontSize * scaleFactor));
        ctx.font = `bold ${newFontSize}px Inter, system-ui, sans-serif`;
      }
      
      ctx.fillText(achievementValue, contentCenterX, valueY);
      
      // Заголовок достижения - добавляем поддержку длинных заголовков
      const titleY = valueY + 50;
      
      // Адаптивный размер шрифта в зависимости от длины заголовка
      let titleFontSize = 28; // Базовый размер шрифта
      
      // Уменьшаем размер шрифта для длинных заголовков
      if (beastName.length > 20) {
        titleFontSize = 22;
      } else if (beastName.length > 15) {
        titleFontSize = 24;
      }
      
      ctx.font = `bold ${titleFontSize}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Проверяем, нужно ли разбивать заголовок на строки
      const titleMaxWidth = cardWidth - 40;
      const metrics = ctx.measureText(beastName);
      
      if (metrics.width > titleMaxWidth) {
        // Если заголовок не помещается, уменьшаем шрифт
        const scaleFactor = titleMaxWidth / metrics.width;
        const newFontSize = Math.max(18, Math.floor(titleFontSize * scaleFactor));
        ctx.font = `bold ${newFontSize}px Inter, system-ui, sans-serif`;
        ctx.fillText(beastName, contentCenterX, titleY);
      } else {
        // Обычный рендеринг однострочного заголовка
        ctx.fillText(beastName, contentCenterX, titleY);
      }
      
      // Описание достижения
      const descY = titleY + 30;
      ctx.font = '18px Inter, system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Разбиваем описание на строки при необходимости
      if (weightPhrase) {
        const words = weightPhrase.split(' ');
        let line = '';
        let yPos = descY;
        const lineHeight = 24;
        const maxWidth = cardWidth - 100;
        let lineCount = 0;
        const maxLines = 3; // Максимальное количество строк для описания
        
        for (let i = 0; i < words.length; i++) {
          const testLine = line + words[i] + ' ';
          const metrics = ctx.measureText(testLine);
          
          if (metrics.width > maxWidth && i > 0) {
            ctx.fillText(line, contentCenterX, yPos);
            line = words[i] + ' ';
            yPos += lineHeight;
            lineCount++;
            
            // Если достигли максимального количества строк, и еще есть слова, добавляем многоточие
            if (lineCount >= maxLines && i < words.length - 1) {
              // Убедимся, что текст с многоточием не превышает максимальную ширину
              let lastLine = line;
              while (ctx.measureText(lastLine + '...').width > maxWidth && lastLine.length > 3) {
                lastLine = lastLine.slice(0, -4) + ' ';
              }
              ctx.fillText(lastLine + '...', contentCenterX, yPos);
              break;
            }
          } else {
            line = testLine;
          }
        }
        
        // Вывод последней строки, если она не была выведена в цикле и не превышен лимит строк
        if (line.length > 0 && lineCount < maxLines) {
          ctx.fillText(line, contentCenterX, yPos);
        }
      }
      
      // Мотивационная фраза (в полупрозрачном блоке)
      // Используем motivationalPhrase если он есть, иначе weightPhrase
      const phraseToShow = motivationalPhrase || weightPhrase;
      if (phraseToShow) {
        // Адаптивные размеры блока в зависимости от размера карточки
        const motivationBlockY = cardHeight * 0.68; // Немного выше, чем было
        const motivationBlockHeight = Math.min(100, cardHeight * 0.18); // Адаптивная высота блока
        const motivationBlockWidth = cardWidth * 0.85; // Увеличиваем ширину блока
        const motivationBlockX = (cardWidth - motivationBlockWidth) / 2;
        
        ctx.save();
        // Полупрозрачный фон для мотивационной фразы
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.filter = 'blur(0.5px)';
        
        // Рисуем прямоугольник с закругленными углами
        const rectRadius = 8;
        ctx.beginPath();
        ctx.moveTo(motivationBlockX + rectRadius, motivationBlockY);
        ctx.lineTo(motivationBlockX + motivationBlockWidth - rectRadius, motivationBlockY);
        ctx.quadraticCurveTo(motivationBlockX + motivationBlockWidth, motivationBlockY, motivationBlockX + motivationBlockWidth, motivationBlockY + rectRadius);
        ctx.lineTo(motivationBlockX + motivationBlockWidth, motivationBlockY + motivationBlockHeight - rectRadius);
        ctx.quadraticCurveTo(motivationBlockX + motivationBlockWidth, motivationBlockY + motivationBlockHeight, motivationBlockX + motivationBlockWidth - rectRadius, motivationBlockY + motivationBlockHeight);
        ctx.lineTo(motivationBlockX + rectRadius, motivationBlockY + motivationBlockHeight);
        ctx.quadraticCurveTo(motivationBlockX, motivationBlockY + motivationBlockHeight, motivationBlockX, motivationBlockY + motivationBlockHeight - rectRadius);
        ctx.lineTo(motivationBlockX, motivationBlockY + rectRadius);
        ctx.quadraticCurveTo(motivationBlockX, motivationBlockY, motivationBlockX + rectRadius, motivationBlockY);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        
        // Адаптивный размер шрифта для мотивационной фразы
        let motivationFontSize = 16;
        if (phraseToShow.length > 100) {
          motivationFontSize = 12;
        } else if (phraseToShow.length > 50) {
          motivationFontSize = 14;
        }
        
        // Рисуем мотивационную фразу внутри блока
        ctx.font = `italic ${motivationFontSize}px Inter, system-ui, sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Подготавливаем текст мотивационной фразы в кавычках
        const motivationalText = `"${phraseToShow}"`;
        
        // Разбиваем текст мотивации на строки
        const motivationWords = motivationalText.split(' ');
        let motivationLine = '';
        let motivationY = motivationBlockY + motivationBlockHeight * 0.25;
        const motivationLineHeight = motivationFontSize * 1.4;
        const motivationMaxWidth = motivationBlockWidth - 40; // Больше отступы для текста
        let motivationLineCount = 0;
        const maxMotivationLines = Math.floor(motivationBlockHeight / motivationLineHeight) - 1; // Адаптивное количество строк
        
        for (let i = 0; i < motivationWords.length; i++) {
          const testLine = motivationLine + motivationWords[i] + ' ';
          const metrics = ctx.measureText(testLine);
          
          if (metrics.width > motivationMaxWidth && i > 0) {
            ctx.fillText(motivationLine, contentCenterX, motivationY);
            motivationLine = motivationWords[i] + ' ';
            motivationY += motivationLineHeight;
            motivationLineCount++;
            
            // Если достигли максимального количества строк, и еще есть слова, добавляем многоточие
            if (motivationLineCount >= maxMotivationLines - 1 && i < motivationWords.length - 1) {
              // Убедимся, что текст с многоточием не превышает максимальную ширину
              let lastLine = motivationLine;
              while (ctx.measureText(lastLine + '...').width > motivationMaxWidth && lastLine.length > 3) {
                lastLine = lastLine.slice(0, -4) + ' ';
              }
              ctx.fillText(lastLine + '..."', contentCenterX, motivationY);
              break;
            }
          } else {
            motivationLine = testLine;
          }
        }
        
        // Вывод последней строки, если она не была выведена в цикле и не превышен лимит строк
        if (motivationLine.length > 0 && motivationLineCount < maxMotivationLines) {
          ctx.fillText(motivationLine.trim(), contentCenterX, motivationY);
        }
      }
      
      // Добавляем кнопку поделиться (имитация)
      // Адаптируем позицию в зависимости от размеров других элементов
      const shareButtonY = cardHeight * 0.92;
      ctx.save();
      ctx.beginPath();
      const shareButtonRadius = 16;
      ctx.arc(contentCenterX, shareButtonY, shareButtonRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fill();
      
      // Рисуем иконку шаринга
      ctx.font = '16px Inter, system-ui, sans-serif';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('↗', contentCenterX, shareButtonY);
      ctx.restore();
      
      // Добавляем имя пользователя внизу карточки
      ctx.font = '500 14px Inter, system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Проверяем длину имени пользователя и адаптируем размер шрифта при необходимости
      const userNameText = `@${userName}`;
      const userNameWidth = ctx.measureText(userNameText).width;
      const maxUserNameWidth = cardWidth * 0.8;
      
      if (userNameWidth > maxUserNameWidth) {
        // Если имя слишком длинное, уменьшаем размер шрифта
        const scaleFactor = maxUserNameWidth / userNameWidth;
        const newFontSize = Math.max(10, Math.floor(14 * scaleFactor));
        ctx.font = `500 ${newFontSize}px Inter, system-ui, sans-serif`;
      }
      
      ctx.fillText(userNameText, contentCenterX, cardHeight - 20);
      
      console.log("Отрисовка обычного достижения завершена успешно");
      return true;
    } catch (error) {
      console.error('Ошибка при рисовании обычного достижения:', error);
      return false;
    }
  };

  // Функция рисования карточки, определяет какой шаблон использовать
  const drawAchievementCard = async (canvas: HTMLCanvasElement): Promise<boolean> => {
    // Если это зверь, используем существующую логику
    if (isBeast) {
      console.log("Вызываем отрисовку карточки ЗВЕРЯ");
      // Существующий код для отрисовки достижения "Подними зверя"
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;
      
      // Устанавливаем размеры canvas с учетом масштабирования для высокого DPI
      const scale = 2; // Масштаб для высокого DPI
      canvas.width = cardWidth * scale;
      canvas.height = cardHeight * scale;
      ctx.scale(scale, scale);
      
      // Очищаем canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      try {
        // Шаг 1: Рисуем фон
        if (beastImage) {
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
          gradient.addColorStop(0, '#4338ca'); // Темно-синий
          gradient.addColorStop(1, '#7e22ce'); // Фиолетовый
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
        // Увеличиваем размер фона примерно на 15% во все стороны
        const weightBoxWidth = 115; // Было 100
        const weightBoxHeight = 70; // Было 60
        const weightBoxX = 15; // Было 20
        const weightBoxY = 15; // Было 20
        ctx.fillRect(weightBoxX, weightBoxY, weightBoxWidth, weightBoxHeight);
        ctx.restore();
        
        // Адаптивный размер шрифта для значения веса
        let weightFontSize = 28;
        const weightValue = totalVolume.toString();
        
        // Уменьшаем размер шрифта для длинных значений
        if (weightValue.length > 6) {
          weightFontSize = 22;
        } else if (weightValue.length > 4) {
          weightFontSize = 24;
        }
        
        ctx.font = `bold ${weightFontSize}px Inter, system-ui, sans-serif`;
        ctx.fillStyle = '#f97316';
        ctx.textAlign = 'center';
        const weightBoxCenterX = weightBoxX + weightBoxWidth / 2;
        const weightTextY = weightBoxY + 35;
        
        // Проверяем, помещается ли значение в доступную ширину
        const weightTextWidth = ctx.measureText(weightValue).width;
        const maxWeightWidth = weightBoxWidth * 0.7; // Оставляем место для "кг"
        
        if (weightTextWidth > maxWeightWidth) {
          // Если значение все еще не помещается, уменьшаем шрифт еще больше
          const scaleFactor = maxWeightWidth / weightTextWidth;
          const newFontSize = Math.max(16, Math.floor(weightFontSize * scaleFactor));
          ctx.font = `bold ${newFontSize}px Inter, system-ui, sans-serif`;
        }
        
        ctx.fillText(weightValue, weightBoxCenterX, weightTextY);
        
        // Отступ для "кг" с учетом размера числа, чтобы не наезжал
        const weightWidth = ctx.measureText(weightValue).width;
        ctx.font = '500 14px Inter, system-ui, sans-serif';
        ctx.fillStyle = '#f97316';
        ctx.textAlign = 'left';
        ctx.fillText('кг', weightBoxCenterX + weightWidth/2 + 5, weightTextY);
        
        ctx.font = '500 12px Inter, system-ui, sans-serif';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText('ОБЩИЙ ОБЪЕМ', weightBoxCenterX, weightBoxY + 55);
        
        // Шаг 6: Добавляем имя зверя, центрированное по горизонтали
        // Адаптивный размер шрифта в зависимости от длины имени
        const beastNameUpperCase = beastName.toUpperCase();
        let beastNameFontSize = 42; // Базовый размер шрифта
        
        // Уменьшаем размер шрифта для длинных имен
        if (beastNameUpperCase.length > 15) {
          beastNameFontSize = 32;
        } else if (beastNameUpperCase.length > 10) {
          beastNameFontSize = 36;
        }
        
        ctx.font = `bold ${beastNameFontSize}px Inter, system-ui, sans-serif`;
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        
        // Проверяем, помещается ли текст в доступную ширину
        const beastNameWidth = ctx.measureText(beastNameUpperCase).width;
        const maxBeastNameWidth = cardWidth * 0.9; // Максимальная ширина для имени зверя
        
        if (beastNameWidth > maxBeastNameWidth) {
          // Если текст не помещается, сначала пробуем уменьшить шрифт
          const scaleFactor = maxBeastNameWidth / beastNameWidth;
          const newFontSize = Math.max(24, Math.floor(beastNameFontSize * scaleFactor));
          
          // Если после уменьшения шрифт стал слишком маленьким, разбиваем на две строки
          if (newFontSize < 28) {
            const words = beastNameUpperCase.split(' ');
            
            // Если имя состоит из нескольких слов
            if (words.length > 1) {
              // Находим оптимальное разделение на две строки
              let firstLineText = '';
              let secondLineText = '';
              let currentWidth = 0;
              
              // Устанавливаем шрифт обратно на исходный размер для разделения на строки
              ctx.font = `bold ${Math.min(36, beastNameFontSize)}px Inter, system-ui, sans-serif`;
              
              for (let i = 0; i < words.length; i++) {
                const wordWidth = ctx.measureText(words[i] + ' ').width;
                if (currentWidth + wordWidth <= maxBeastNameWidth * 0.9) {
                  firstLineText += words[i] + ' ';
                  currentWidth += wordWidth;
                } else {
                  secondLineText += words[i] + ' ';
                }
              }
              
              // Если вторая строка пустая (все слова поместились в первую)
              if (secondLineText === '') {
                // Делим слова поровну между строками
                firstLineText = '';
                secondLineText = '';
                const middleIndex = Math.ceil(words.length / 2);
                
                for (let i = 0; i < words.length; i++) {
                  if (i < middleIndex) {
                    firstLineText += words[i] + ' ';
                  } else {
                    secondLineText += words[i] + ' ';
                  }
                }
              }
            
              // Проверяем, помещаются ли строки по отдельности
              const firstLineWidth = ctx.measureText(firstLineText.trim()).width;
              const secondLineWidth = ctx.measureText(secondLineText.trim()).width;
              
              // Если какая-то из строк все еще не помещается, уменьшаем шрифт
              if (firstLineWidth > maxBeastNameWidth || secondLineWidth > maxBeastNameWidth) {
                const maxLineWidth = Math.max(firstLineWidth, secondLineWidth);
                const lineScaleFactor = maxBeastNameWidth / maxLineWidth;
                const lineFontSize = Math.max(24, Math.floor(beastNameFontSize * lineScaleFactor));
                ctx.font = `bold ${lineFontSize}px Inter, system-ui, sans-serif`;
              }
              
              // Отрисовываем заголовок в две строки
              const lineSpacing = parseInt(ctx.font) * 1.2;
              ctx.fillText(firstLineText.trim(), cardWidth / 2, 95);
              ctx.fillText(secondLineText.trim(), cardWidth / 2, 95 + lineSpacing);
            } else {
              // Если это одно длинное слово, просто уменьшаем шрифт
              ctx.font = `bold ${newFontSize}px Inter, system-ui, sans-serif`;
              ctx.fillText(beastNameUpperCase, cardWidth / 2, 110);
            }
          } else {
            // Если шрифт можно уменьшить до приемлемого размера
            ctx.font = `bold ${newFontSize}px Inter, system-ui, sans-serif`;
            ctx.fillText(beastNameUpperCase, cardWidth / 2, 110);
          }
        } else {
          // Если текст помещается, отрисовываем его как обычно
          ctx.fillText(beastNameUpperCase, cardWidth / 2, 110);
        }
        
        // Шаг 7: Добавляем прогресс-бар в нижней части карточки
        // Фон прогресс-бара
        ctx.fillStyle = 'rgba(55, 65, 81, 0.6)';
        const progressBarY = cardHeight - 130;
        ctx.fillRect(cardWidth * 0.05, progressBarY, cardWidth * 0.9, 10);
        
        // Заполнение прогресс-бара
        // Градиент от оранжевого к красному
        const progressGradient = ctx.createLinearGradient(
          cardWidth * 0.05, 0, 
          cardWidth * 0.05 + cardWidth * 0.9 * progress / 100, 0
        );
        progressGradient.addColorStop(0, '#f97316');
        progressGradient.addColorStop(1, '#ef4444');
        ctx.fillStyle = progressGradient;
        ctx.fillRect(cardWidth * 0.05, progressBarY, cardWidth * 0.9 * progress / 100, 10);
        
        // Шаг 8: Добавляем индикатор прогресса с процентами и кг до следующего уровня
        // Рассчитываем сколько кг осталось до следующего уровня
        const volumeToNext = nextBeastThreshold - totalVolume;
        
        // Создаем цельную строку текста вместо отдельных частей
        const baseText = "До следующего уровня осталось ";
        const fullText = baseText + volumeToNext + " кг!";
        
        // Адаптивный размер шрифта для текста прогресса
        let progressTextFontSize = 14;
        
        // Измеряем ширину полного текста
        ctx.font = `500 ${progressTextFontSize}px Inter, system-ui, sans-serif`;
        const fullTextWidth = ctx.measureText(fullText).width;
        const maxProgressTextWidth = cardWidth * 0.9;
        
        // Если текст не помещается, уменьшаем размер шрифта
        if (fullTextWidth > maxProgressTextWidth) {
          const scaleFactor = maxProgressTextWidth / fullTextWidth;
          progressTextFontSize = Math.max(10, Math.floor(progressTextFontSize * scaleFactor));
          ctx.font = `500 ${progressTextFontSize}px Inter, system-ui, sans-serif`;
        }
        
        // Измеряем ширину базового текста и полного текста с новым размером шрифта
        const baseTextWidth = ctx.measureText(baseText).width;
        const updatedFullTextWidth = ctx.measureText(fullText).width;
        
        // Позиционируем текст по центру
        const textStartX = cardWidth / 2 - updatedFullTextWidth / 2;
        
        // Рисуем базовый текст
        ctx.fillStyle = 'white';
        ctx.textAlign = 'left'; // Меняем на left для точного позиционирования
        ctx.fillText(baseText, textStartX, progressBarY + 35);
        
        // Рисуем выделенную часть (количество кг)
        ctx.font = `bold ${progressTextFontSize + 2}px Inter, system-ui, sans-serif`;
        ctx.fillStyle = '#f97316';
        ctx.fillText(volumeToNext + " кг!", textStartX + baseTextWidth, progressBarY + 35);
        
        // Шаг 9: Добавляем мотивационную фразу
        if (weightPhrase) {
          // Адаптивный размер шрифта для мотивационной фразы
          let motivationFontSize = 18;
          
          // Уменьшаем размер шрифта для длинных фраз
          if (weightPhrase.length > 100) {
            motivationFontSize = 14;
          } else if (weightPhrase.length > 50) {
            motivationFontSize = 16;
          }
          
          ctx.font = `500 ${motivationFontSize}px Inter, system-ui, sans-serif`;
          ctx.fillStyle = 'white';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          // Проверяем, помещается ли фраза в доступную ширину
          const maxWidth = cardWidth - 40;
          const phraseWidth = ctx.measureText(weightPhrase).width;
          
          if (phraseWidth > maxWidth && motivationFontSize > 14) {
            // Если фраза не помещается, уменьшаем шрифт еще больше
            const scaleFactor = maxWidth / phraseWidth;
            motivationFontSize = Math.max(12, Math.floor(motivationFontSize * scaleFactor));
            ctx.font = `500 ${motivationFontSize}px Inter, system-ui, sans-serif`;
          }
          
          // Разбиваем текст на несколько строк, если он слишком длинный
          const words = weightPhrase.split(' ');
          let line = '';
          let yPos = cardHeight - 80;
          const lineHeight = motivationFontSize * 1.3;
          const maxLines = Math.floor((cardHeight - yPos - 30) / lineHeight); // Адаптивное количество строк
          let lineCount = 0;
          
          for (let i = 0; i < words.length; i++) {
            const testLine = line + words[i] + ' ';
            const metrics = ctx.measureText(testLine);
            
            if (metrics.width > maxWidth && i > 0) {
              ctx.fillText(line, cardWidth / 2, yPos);
              line = words[i] + ' ';
              yPos += lineHeight;
              lineCount++;
              
              // Если достигли максимального количества строк, и еще есть слова, добавляем многоточие
              if (lineCount >= maxLines - 1 && i < words.length - 1) {
                // Убедимся, что текст с многоточием не превышает максимальную ширину
                let lastLine = line;
                while (ctx.measureText(lastLine + '...').width > maxWidth && lastLine.length > 3) {
                  lastLine = lastLine.slice(0, -4) + ' ';
                }
                ctx.fillText(lastLine + '...', cardWidth / 2, yPos);
                break;
              }
            } else {
              line = testLine;
            }
          }
          
          // Вывод последней строки, если она не была выведена в цикле и не превышен лимит строк
          if (line.length > 0 && lineCount < maxLines) {
            ctx.fillText(line, cardWidth / 2, yPos);
          }
        }
        
        // Шаг 10: Добавляем имя пользователя
        ctx.font = '500 14px Inter, system-ui, sans-serif';
        ctx.fillStyle = '#d1d5db';
        ctx.textAlign = 'center';
        
        // Проверяем длину имени пользователя и адаптируем размер шрифта при необходимости
        const userNameText = `@${userName}`;
        const userNameWidth = ctx.measureText(userNameText).width;
        const maxUserNameWidth = cardWidth * 0.8;
        
        if (userNameWidth > maxUserNameWidth) {
          // Если имя слишком длинное, уменьшаем размер шрифта
          const scaleFactor = maxUserNameWidth / userNameWidth;
          const newFontSize = Math.max(10, Math.floor(14 * scaleFactor));
          ctx.font = `500 ${newFontSize}px Inter, system-ui, sans-serif`;
        }
        
        ctx.fillText(`@${userName}`, cardWidth / 2, cardHeight - 25);
        
        return true;
      } catch (error) {
        console.error('Ошибка при рисовании на canvas:', error);
        return false;
      }
    } else {
      // Для обычных достижений используем новый шаблон
      console.log("Вызываем отрисовку обычного достижения");
      return await drawRegularAchievementCard(canvas);
    }
  };

  // Мемоизируем функцию generateShareImage, чтобы она не пересоздавалась при каждом рендере
  const memoizedGenerateShareImage = React.useCallback(async () => {
    if (!canvasRef.current) {
      console.error("Canvas не найден");
      return;
    }
    
    // Если уже идет загрузка, не запускаем повторно
    if (loading) {
      console.log("Генерация изображения уже идет, пропускаем повторный запуск");
      return;
    }
    
    console.log("Запуск генерации изображения для шаринга");
    setLoading(true);

    try {
      // Рисуем карточку на canvas
      const success = await drawAchievementCard(canvasRef.current);
      
      if (!success) {
        throw new Error('Не удалось нарисовать карточку на canvas');
      }
      
      // Конвертируем canvas в URL
      const dataUrl = canvasRef.current.toDataURL('image/png');
      console.log("Canvas сконвертирован в dataUrl");
      
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
      console.log("Создан blob размером:", blob.size);
      
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
  }, [loading, imageUrlId]);

  // Перегенерируем изображение при изменении размеров карточки
  useEffect(() => {
    // Функция для проверки и генерации изображения
    const checkAndGenerateImage = () => {
      if (isOpen && !loading && (cardWidth > 0 && cardHeight > 0)) {
        // Проверяем, изменились ли размеры
        if (prevDimensionsRef.current.width !== cardWidth || 
            prevDimensionsRef.current.height !== cardHeight) {
          // Обновляем предыдущие размеры
          prevDimensionsRef.current = { width: cardWidth, height: cardHeight };
          // Если модальное окно открыто и размеры изменились, перегенерируем изображение
          console.log("Размеры карточки изменились, перегенерируем изображение");
          memoizedGenerateShareImage();
        }
      }
    };
    
    // Используем setTimeout, чтобы избежать бесконечных перерисовок
    const timeoutId = setTimeout(checkAndGenerateImage, 100);
    
    // Очищаем таймаут при размонтировании компонента или изменении зависимостей
    return () => clearTimeout(timeoutId);
  }, [cardWidth, cardHeight, isOpen, loading, memoizedGenerateShareImage]);

  // Загружаем изображение при открытии модального окна
  useEffect(() => {
    // Проверяем, изменилось ли состояние isOpen с false на true
    if (isOpen && !prevIsOpenRef.current) {
      console.log("Модальное окно открыто, тип достижения:", isBeast ? "зверь" : "обычное");
      console.log("Параметры достижения:", {
        beastName,
        totalVolume,
        weightPhrase,
        displayValue,
        unit
      });
      
      setLoading(true);

      // Определяем, какое изображение использовать
      const imageToLoad = isBeast ? beastImage : (achievementImage || beastImage);
      
      if (imageToLoad) {
        console.log("Загружаем изображение:", imageToLoad);
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          // Генерируем изображение сразу после загрузки фона
          memoizedGenerateShareImage();
        };
        img.onerror = () => {
          console.error('Ошибка загрузки изображения');
          // Все равно пытаемся сгенерировать, но с градиентным фоном
          memoizedGenerateShareImage();
        };
        img.src = imageToLoad;
      } else {
        // Если изображение не указано, запускаем генерацию с небольшой задержкой
        setTimeout(() => {
          memoizedGenerateShareImage();
        }, 100);
      }
    }
    
    // Обновляем ref для следующего рендера
    prevIsOpenRef.current = isOpen;
    
    // Очищаем ресурсы при закрытии модального окна
    if (!isOpen && prevIsOpenRef.current) {
      // Если есть URL изображения, освобождаем его
      if (imageUrlId) {
        URL.revokeObjectURL(imageUrlId);
        setImageUrlId(null);
        setShareableImage(null);
      }
    }
  }, [isOpen, beastImage, isBeast, memoizedGenerateShareImage, imageUrlId]);

  const handleCopyImage = async () => {
    if (!shareableImage) return false;

    try {
      const response = await fetch(shareableImage);
      const blob = await response.blob();
      const item = new ClipboardItem({ 'image/png': blob });
      await navigator.clipboard.write([item]);
      
      toast('Изображение скопировано в буфер обмена', { 
        type: 'success',
        icon: '📋',
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
        },
      } as CustomToastOptions);
      
      return true;
    } catch (error) {
      console.error('Ошибка при копировании изображения:', error);
      
      toast('Не удалось скопировать изображение', { 
        type: 'error',
        icon: '❌',
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
        },
      } as CustomToastOptions);
      
      return false;
    }
  };

  const handleNativeShare = async () => {
    if (!shareableImage) return;

    try {
      // Показываем уведомление о начале процесса
      toast('Подготовка к отправке...', { 
        type: 'info', 
        duration: 1500,
        icon: '🔄',
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
        },
      } as CustomToastOptions);
      
      const response = await fetch(shareableImage);
      const blob = await response.blob();
      const file = new File([blob], `hardcase-achievement-${beastName}.png`, { type: 'image/png' });

      // Проверяем поддержку шаринга файлов
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `HARDCASE.TRAINING: ${isBeast ? `Зверь ${beastName}` : 'Достижение'}`,
          text: `${weightPhrase} - ${totalVolume} кг`,
          files: [file],
        });
        
        toast('Успешно отправлено', { 
          type: 'success',
          icon: '✅',
          style: {
            borderRadius: '10px',
            background: '#333',
            color: '#fff',
          },
        } as CustomToastOptions);
      } else {
        // Если файлы не поддерживаются, пробуем шарить только текст
        await navigator.share({
          title: `HARDCASE.TRAINING: ${isBeast ? `Зверь ${beastName}` : 'Достижение'}`,
          text: `${weightPhrase} - ${totalVolume} кг\nhardcase.training`,
          url: 'https://hardcase.training'
        });
        
        // Показываем сообщение о копировании
        const copied = await handleCopyImage();
        if (copied) {
          toast('Изображение скопировано в буфер обмена', { 
            type: 'info',
            icon: '📋',
            style: {
              borderRadius: '10px',
              background: '#333',
              color: '#fff',
            },
          } as CustomToastOptions);
        }
      }
    } catch (error) {
      console.error('Ошибка при шаринге:', error);
      if (error instanceof Error && error.name !== 'AbortError') {
        toast('Не удалось поделиться', { 
          type: 'error',
          icon: '❌',
          style: {
            borderRadius: '10px',
            background: '#333',
            color: '#fff',
          },
        } as CustomToastOptions);
      }
    }
  };

  const handleDownload = async () => {
    if (!shareableImage) return;

    try {
      // Показываем уведомление о начале процесса
      toast('Сохранение изображения...', { 
        type: 'info', 
        duration: 2000,
        icon: '📥',
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
        },
      } as CustomToastOptions);
      
      // Получаем изображение как Blob
      const response = await fetch(shareableImage);
      const blob = await response.blob();
      
      // Проверяем, доступен ли нативный мост для iOS
      if (window.webkit?.messageHandlers?.shareHandler) {
        // Конвертируем Blob в Base64
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = function() {
          const base64data = reader.result?.toString().split(',')[1];
          
          if (!base64data) {
            toast('Ошибка при подготовке изображения', { 
              type: 'error',
              icon: '❌',
              style: {
                borderRadius: '10px',
                background: '#333',
                color: '#fff',
              },
            } as CustomToastOptions);
            return;
          }
          
          // Отправляем сообщение в нативный код
          window.webkit?.messageHandlers?.shareHandler?.postMessage({
            action: 'saveImage',
            image: base64data,
            filename: `hardcase-achievement-${beastName}.png`
          });
          
          // Уведомление будет показано нативным кодом
        };
      } else {
        // Для других платформ используем стандартный метод скачивания
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hardcase-achievement-${beastName}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast('Изображение сохранено', { 
          type: 'success',
          icon: '✅',
          style: {
            borderRadius: '10px',
            background: '#333',
            color: '#fff',
          },
        } as CustomToastOptions);
      }
    } catch (error) {
      console.error('Ошибка при сохранении изображения:', error);
      toast('Не удалось сохранить изображение', { 
        type: 'error',
        icon: '❌',
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
        },
      } as CustomToastOptions);
    }
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

  // Определяем дополнительные классы в зависимости от размера экрана
  const getModalClasses = () => {
    // Для очень маленьких экранов (высота < 600px)
    if (windowHeight < 600) {
      return {
        container: "fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center px-2 py-2 overflow-hidden",
        modal: "bg-gray-900 rounded-xl max-w-md w-full p-3 pt-6 mx-auto relative border border-gray-800 shadow-2xl flex flex-col max-h-[98vh] shadow-[0_0_25px_rgba(0,0,0,0.5)]",
        title: "text-base font-bold text-white mb-2 text-center",
        buttonsContainer: "mt-2 space-y-1",
        helpText: "text-gray-500 text-xs mt-1"
      };
    }
    
    // Для средних экранов (высота 600-800px)
    if (windowHeight < 800) {
      return {
        container: "fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center px-3 py-3 overflow-hidden",
        modal: "bg-gray-900 rounded-xl max-w-md w-full p-4 pt-8 mx-auto relative border border-gray-800 shadow-2xl flex flex-col max-h-[98vh] shadow-[0_0_25px_rgba(0,0,0,0.5)]",
        title: "text-lg font-bold text-white mb-3 text-center",
        buttonsContainer: "mt-3 space-y-2",
        helpText: "text-gray-500 text-xs mt-1"
      };
    }
    
    // Для больших экранов (высота > 800px)
    return {
      container: "fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center px-4 py-4 overflow-hidden",
      modal: "bg-gray-900 rounded-xl max-w-md w-full p-5 pt-10 mx-auto relative border border-gray-800 shadow-2xl flex flex-col max-h-[98vh] shadow-[0_0_25px_rgba(0,0,0,0.5)]",
      title: "text-xl font-bold text-white mb-4 text-center",
      buttonsContainer: "mt-4 space-y-3",
      helpText: "text-gray-500 text-sm mt-2"
    };
  };
  
  const classes = getModalClasses();

  return (
    <div className={classes.container}>
      <div className={classes.modal}>
        <button
          onClick={onClose}
          className="absolute top-1 right-1 text-white bg-gray-800 hover:bg-gray-700 transition-colors p-1.5 rounded-full z-20"
          aria-label="Закрыть"
          title="Закрыть"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className={classes.title}>
          {isBeast ? `Зверь ${beastName}` : 'Достижение'}
        </h2>

        <div className="text-center flex-shrink-0">
          <div className="beast-card-container relative group" ref={achievementCardRef} style={inlineStyles.cardContainer}>
            <canvas ref={canvasRef} style={inlineStyles.canvas} />
            {!loading && shareableImage && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="absolute bottom-6 flex gap-4 bg-black bg-opacity-40 px-4 py-3 rounded-full animate-fadeIn">
                  {canNativeShare && (
                    <button
                      onClick={handleNativeShare}
                      className="p-3.5 bg-orange-500 text-white rounded-full hover:bg-orange-600 transition-all duration-200 transform hover:scale-110 shadow-lg animate-bounce-once"
                      aria-label="Поделиться"
                      title="Поделиться"
                    >
                      <Share className="w-7 h-7" />
                    </button>
                  )}
                  <button
                    onClick={handleDownload}
                    className="p-3.5 bg-green-600 text-white rounded-full hover:bg-green-700 transition-all duration-200 transform hover:scale-110 shadow-lg relative"
                    aria-label="Скачать"
                    title="Скачать"
                  >
                    <span className="absolute inset-0 rounded-full animate-ping bg-green-400 opacity-75"></span>
                    <svg className="w-7 h-7 relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>

          {loading && (
            <div className="mt-4 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
          )}

          {!loading && shareableImage && (
            <div className="text-center mt-3">
              <p className={classes.helpText}>Используйте зеленую кнопку для сохранения изображения</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}