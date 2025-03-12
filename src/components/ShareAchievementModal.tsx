import React, { useState, useEffect, useRef } from 'react';
import { X, Share } from 'lucide-react';
import html2canvas from 'html2canvas';
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
  
  const achievementCardRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Расчет прогресса до следующего зверя
  const progress = totalVolume > 0 && nextBeastThreshold > 0 
    ? Math.min(100, (totalVolume / nextBeastThreshold) * 100) 
    : 0;

  // Фиксируем размеры карточки
  const cardWidth = 320;
  const cardHeight = 570;

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
    if (isOpen) {
      console.log("Модальное окно открыто, тип достижения:", isBeast ? "зверь" : "обычное");
      console.log("Параметры достижения:", {
        beastName,
        totalVolume,
        weightPhrase,
        displayValue,
        unit
      });
      
      setLoading(true);

      if (isBeast && beastImage) {
      const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          // Генерируем изображение сразу после загрузки фона
          generateShareImage();
        };
        img.onerror = () => {
          console.error('Ошибка загрузки изображения зверя');
          // Все равно пытаемся сгенерировать, но с градиентным фоном
          generateShareImage();
        };
        img.src = beastImage;
      } else {
        // Для обычных достижений не нужно ждать загрузки изображения
        // Запускаем генерацию с небольшой задержкой
        setTimeout(() => {
          generateShareImage();
        }, 100);
      }
    }
  }, [isOpen, beastImage, isBeast]);

  // Функция рисования на canvas для обычных достижений (не зверей)
  const drawRegularAchievementCard = async (canvas: HTMLCanvasElement): Promise<boolean> => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    
    console.log("Начинаем отрисовку карточки ОБЫЧНОГО достижения в стиле слайдера");
    
    // Устанавливаем размеры canvas
    canvas.width = cardWidth * 2;
    canvas.height = cardHeight * 2;
    ctx.scale(2, 2);
    
    try {
      // Сначала рисуем фоновое изображение или используем градиент
      let bgImageObj: HTMLImageElement | null = null;
      
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
      
      // Пытаемся использовать изображение как фон, если оно есть
      if (beastImage && beastImage.length > 0) {
        try {
          // Создаем временное изображение и ждем его загрузки
          bgImageObj = new Image();
          bgImageObj.crossOrigin = 'anonymous';
          bgImageObj.src = beastImage;
          
          // Если изображение уже загружено, рисуем его
          if (bgImageObj.complete) {
            console.log("Рисуем фоновое изображение:", bgImageObj.src);
            // Покрываем весь canvas фоновым изображением, сохраняя пропорции
            const imgAspect = bgImageObj.width / bgImageObj.height;
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
            
            ctx.drawImage(bgImageObj, offsetX, offsetY, drawWidth, drawHeight);
            
            // Накладываем цветной оверлей
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.9; // Прозрачность как в слайдере
            ctx.fillRect(0, 0, cardWidth, cardHeight);
            ctx.globalAlpha = 1.0;
          } else {
            // Изображение еще не загружено, используем градиент
            throw new Error('Изображение не готово');
          }
        } catch (error) {
          console.warn('Не удалось использовать изображение как фон:', error);
          // Используем градиентный фон
          const gradient = ctx.createLinearGradient(0, 0, cardWidth, cardHeight);
          gradient.addColorStop(0, color); // Основной цвет
          gradient.addColorStop(1, '#6366f1'); // Светло-синий
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, cardWidth, cardHeight);
        }
      } else {
        // Если изображения нет, используем градиентный фон
        const gradient = ctx.createLinearGradient(0, 0, cardWidth, cardHeight);
        gradient.addColorStop(0, color); // Основной цвет
        gradient.addColorStop(1, '#6366f1'); // Светло-синий
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, cardWidth, cardHeight);
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
      if (achievementValue.length > 8) {
        valueFontSize = 45;
      } else if (achievementValue.length > 5) {
        valueFontSize = 50;
      }
      
      ctx.font = `bold ${valueFontSize}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(achievementValue, contentCenterX, valueY);
      
      // Заголовок достижения - добавляем поддержку длинных заголовков
      const titleY = valueY + 50;
      ctx.font = 'bold 28px Inter, system-ui, sans-serif';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Проверяем, нужно ли разбивать заголовок на строки
      const titleMaxWidth = cardWidth - 40;
      const metrics = ctx.measureText(beastName);
      
      if (metrics.width > titleMaxWidth) {
        // Разбиваем заголовок на слова и пытаемся их сгруппировать
        const titleWords = beastName.split(' ');
        let firstLine = '';
        let secondLine = '';
        let middleIndex = Math.ceil(titleWords.length / 2);
        
        // Первая попытка - разделить строго пополам по словам
        for (let i = 0; i < titleWords.length; i++) {
          if (i < middleIndex) {
            firstLine += titleWords[i] + ' ';
          } else {
            secondLine += titleWords[i] + ' ';
          }
        }
        
        // Если первая строка все равно слишком длинная, пробуем балансировать лучше
        const firstLineMetrics = ctx.measureText(firstLine);
        const secondLineMetrics = ctx.measureText(secondLine);
        
        if (firstLineMetrics.width > titleMaxWidth || secondLineMetrics.width > titleMaxWidth) {
          // Пробуем найти лучшее разделение
          firstLine = '';
          secondLine = '';
          let currentWidth = 0;
          
          for (let i = 0; i < titleWords.length; i++) {
            const wordWidth = ctx.measureText(titleWords[i] + ' ').width;
            if (currentWidth + wordWidth <= titleMaxWidth * 0.9) {
              firstLine += titleWords[i] + ' ';
              currentWidth += wordWidth;
            } else {
              secondLine += titleWords[i] + ' ';
            }
          }
        }
        
        // Отрисовываем заголовок в две строки
        ctx.fillText(firstLine.trim(), contentCenterX, titleY - 14);
        ctx.fillText(secondLine.trim(), contentCenterX, titleY + 14);
      } else {
        // Обычный рендеринг однострочного заголовка
        ctx.fillText(beastName, contentCenterX, titleY);
      }
      
      // Описание достижения - начинаем с правильной позиции Y в зависимости от количества строк в заголовке
      const descY = metrics.width > titleMaxWidth ? titleY + 45 : titleY + 30;
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
        // Увеличиваем блок для мотивационной фразы и адаптируем его положение
        const motivationBlockY = cardHeight * 0.68; // Немного выше, чем было
        const motivationBlockHeight = 100; // Увеличиваем высоту блока
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
        
        // Рисуем мотивационную фразу внутри блока
        ctx.font = 'italic 16px Inter, system-ui, sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Подготавливаем текст мотивационной фразы в кавычках
        const motivationalText = `"${phraseToShow}"`;
        
        // Разбиваем текст мотивации на строки
        const motivationWords = motivationalText.split(' ');
        let motivationLine = '';
        let motivationY = motivationBlockY + 24;
        const motivationLineHeight = 22;
        const motivationMaxWidth = motivationBlockWidth - 40; // Больше отступы для текста
        let motivationLineCount = 0;
        const maxMotivationLines = 4; // Максимальное количество строк для мотивационной фразы
        
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
      
      console.log("Отрисовка обычного достижения в стиле слайдера завершена успешно");
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
      
      // Устанавливаем размеры canvas
      canvas.width = cardWidth * 2; // Увеличиваем разрешение в 2 раза для более четкого изображения
      canvas.height = cardHeight * 2;
      ctx.scale(2, 2); // Масштабируем контекст
      
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
        
        ctx.font = 'bold 28px Inter, system-ui, sans-serif';
        ctx.fillStyle = '#f97316';
        ctx.textAlign = 'center';
        const weightBoxCenterX = weightBoxX + weightBoxWidth / 2;
        const weightTextY = weightBoxY + 35;
        ctx.fillText(totalVolume.toString(), weightBoxCenterX, weightTextY);
        
        // Отступ для "кг" с учетом размера числа, чтобы не наезжал
        const weightWidth = ctx.measureText(totalVolume.toString()).width;
        ctx.font = '500 14px Inter, system-ui, sans-serif';
        ctx.fillStyle = '#f97316';
        ctx.textAlign = 'left';
        ctx.fillText('кг', weightBoxCenterX + weightWidth/2 + 5, weightTextY);
        
        ctx.font = '500 12px Inter, system-ui, sans-serif';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText('ОБЩИЙ ОБЪЕМ', weightBoxCenterX, weightBoxY + 55);
        
        // Шаг 6: Добавляем имя зверя, центрированное по горизонтали
        ctx.font = 'bold 32px Inter, system-ui, sans-serif';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        
        // Адаптивный размер шрифта для длинных имен
        const maxWidth = cardWidth * 0.9; // 90% от ширины карточки
        let fontSize = 32;
        let textWidth = ctx.measureText(beastName.toUpperCase()).width;
        
        while (textWidth > maxWidth && fontSize > 20) {
            fontSize -= 2;
            ctx.font = `bold ${fontSize}px Inter, system-ui, sans-serif`;
            textWidth = ctx.measureText(beastName.toUpperCase()).width;
        }
        
        ctx.fillText(beastName.toUpperCase(), cardWidth / 2, 110);
        
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
        
        // Измеряем ширину базового текста и полного текста
        ctx.font = '500 14px Inter, system-ui, sans-serif';
        const baseTextWidth = ctx.measureText(baseText).width;
        const fullTextWidth = ctx.measureText(fullText).width;
        
        // Позиционируем текст по центру
        const textStartX = cardWidth / 2 - fullTextWidth / 2;
        
        // Рисуем базовый текст
        ctx.fillStyle = 'white';
        ctx.textAlign = 'left'; // Меняем на left для точного позиционирования
        ctx.fillText(baseText, textStartX, progressBarY + 35);
        
        // Рисуем выделенную часть (количество кг)
        ctx.font = 'bold 16px Inter, system-ui, sans-serif';
        ctx.fillStyle = '#f97316';
        ctx.fillText(volumeToNext + " кг!", textStartX + baseTextWidth, progressBarY + 35);
        
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
    } else {
      // Для обычных достижений используем новый шаблон
      console.log("Вызываем отрисовку обычного достижения");
      return await drawRegularAchievementCard(canvas);
    }
  };

  // Генерация изображения
  const generateShareImage = async () => {
    if (!canvasRef.current) {
      console.error("Canvas не найден");
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

  const handleTelegramStories = async () => {
    if (!shareableImage) return;

    try {
      // Формируем текст для Stories
      const text = `${beastName}\n${weightPhrase}\n${totalVolume} кг\nhardcase.training`;
      
      // Используем универсальную ссылку для Telegram
      const telegramUrl = `https://t.me/share/url?url=https://hardcase.training&text=${encodeURIComponent(text)}`;
      
      // Открываем в текущем окне для WKWebView
      window.location.href = telegramUrl;
      
      // Показываем инструкцию для пользователя
      toast('Переходим в Telegram...', { type: 'info', duration: 3000 } as CustomToastOptions);
    } catch (error) {
      console.error('Ошибка при открытии Telegram:', error);
      toast('Не удалось открыть Telegram', { type: 'error' } as CustomToastOptions);
    }
  };

  const handleDownload = async () => {
    if (!shareableImage) return;

    try {
      // Для WKWebView на iOS просто открываем изображение в полном размере
      window.location.href = shareableImage;
      
      toast('Удерживайте изображение для сохранения', { type: 'info', duration: 5000 } as CustomToastOptions);
    } catch (error) {
      console.error('Ошибка при открытии изображения:', error);
      toast('Не удалось открыть изображение', { type: 'error' } as CustomToastOptions);
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
            <canvas ref={canvasRef} style={inlineStyles.canvas} />
          </div>

          {loading && (
            <div className="mt-4 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
          )}

          {!loading && shareableImage && (
            <div className="mt-6 space-y-4">
              {canNativeShare && (
                <button
                  onClick={handleNativeShare}
                  className="w-full flex items-center justify-center gap-2 p-4 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-lg font-semibold"
                >
                  <Share className="w-6 h-6" />
                  <span>Поделиться</span>
                </button>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={handleDownload}
                  className="flex items-center justify-center gap-2 p-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-base font-semibold"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                  </svg>
                  <span>Скачать</span>
                </button>
                
                <button
                  onClick={handleTelegramStories}
                  className="flex items-center justify-center gap-2 p-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-base font-semibold"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.14.27-.01.06-.01.13-.02.2z"/>
                  </svg>
                  <span>Telegram</span>
                </button>
              </div>
              
              {!canNativeShare && (
                <div className="text-center mt-4">
                  <p className="text-gray-500">Скачайте изображение и добавьте его в Stories</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}