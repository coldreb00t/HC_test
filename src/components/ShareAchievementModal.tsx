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
  motivationalPhrase?: string; // Мотивационная фраза для отображения
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
      setImageLoaded(false);
      
      if (isBeast && beastImage) {
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
      } else {
        // Для обычных достижений не нужно ждать загрузки изображения
        setImageData(null);
        setImageLoaded(true);
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
      
      // Добавляем логотип HARDCASE.TRAINING в правом верхнем углу
      ctx.save();
      // Полупрозрачный фон для логотипа
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      const logoX = cardWidth - 120;
      const logoY = 15;
      const logoWidth = 110;
      const logoHeight = 24;
      // Рисуем прямоугольник с закругленными углами
      const logoRadius = 4;
      ctx.beginPath();
      ctx.moveTo(logoX + logoRadius, logoY);
      ctx.lineTo(logoX + logoWidth - logoRadius, logoY);
      ctx.quadraticCurveTo(logoX + logoWidth, logoY, logoX + logoWidth, logoY + logoRadius);
      ctx.lineTo(logoX + logoWidth, logoY + logoHeight - logoRadius);
      ctx.quadraticCurveTo(logoX + logoWidth, logoY + logoHeight, logoX + logoWidth - logoRadius, logoY + logoHeight);
      ctx.lineTo(logoX + logoRadius, logoY + logoHeight);
      ctx.quadraticCurveTo(logoX, logoY + logoHeight, logoX, logoY + logoHeight - logoRadius);
      ctx.lineTo(logoX, logoY + logoRadius);
      ctx.quadraticCurveTo(logoX, logoY, logoX + logoRadius, logoY);
      ctx.closePath();
      ctx.fill();
      
      // Добавляем текст логотипа
      ctx.font = 'bold 12px Inter, system-ui, sans-serif';
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
      ctx.font = 'bold 60px Inter, system-ui, sans-serif';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const achievementValue = displayValue || totalVolume.toString();
      ctx.fillText(achievementValue, contentCenterX, valueY);
      
      // Заголовок достижения
      const titleY = valueY + 50;
      ctx.font = 'bold 28px Inter, system-ui, sans-serif';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(beastName, contentCenterX, titleY);
      
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
        
        for (let i = 0; i < words.length; i++) {
          const testLine = line + words[i] + ' ';
          const metrics = ctx.measureText(testLine);
          
          if (metrics.width > maxWidth && i > 0) {
            ctx.fillText(line, contentCenterX, yPos);
            line = words[i] + ' ';
            yPos += lineHeight;
          } else {
            line = testLine;
          }
        }
        
        ctx.fillText(line, contentCenterX, yPos);
      }
      
      // Мотивационная фраза (в полупрозрачном блоке)
      // Используем motivationalPhrase, если она есть, иначе используем weightPhrase
      const phraseToUse = motivationalPhrase || weightPhrase;
      
      if (phraseToUse) {
        // Создаем полупрозрачный блок для мотивационной фразы
        const motivationBlockY = cardHeight * 0.7;
        const motivationBlockHeight = 80;
        const motivationBlockWidth = cardWidth * 0.8;
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
        
        // Разбиваем текст мотивации на строки
        const motivationWords = phraseToUse.split(' ');
        let motivationLine = '"';
        let motivationY = motivationBlockY + 24;
        const motivationLineHeight = 22;
        const motivationMaxWidth = motivationBlockWidth - 30;
        
        for (let i = 0; i < motivationWords.length; i++) {
          const testLine = motivationLine + motivationWords[i] + ' ';
          const metrics = ctx.measureText(testLine);
          
          if (metrics.width > motivationMaxWidth && i > 0) {
            ctx.fillText(motivationLine, contentCenterX, motivationY);
            motivationLine = motivationWords[i] + ' ';
            motivationY += motivationLineHeight;
          } else {
            motivationLine = testLine;
          }
        }
        
        // Последняя строка с закрывающей кавычкой
        if (motivationLine.length > 1) {
          motivationLine = motivationLine.trim() + '"';
          ctx.fillText(motivationLine, contentCenterX, motivationY);
        }
      }
      
      // Добавляем кнопку поделиться (имитация)
      const shareButtonY = cardHeight * 0.9;
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
        ctx.font = 'bold 42px Inter, system-ui, sans-serif';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
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
          cardWidth * 0.05 + cardWidth * 0.9 * progressPercentage / 100, 0
        );
        progressGradient.addColorStop(0, '#f97316');
        progressGradient.addColorStop(1, '#ef4444');
        ctx.fillStyle = progressGradient;
        ctx.fillRect(cardWidth * 0.05, progressBarY, cardWidth * 0.9 * progressPercentage / 100, 10);
        
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