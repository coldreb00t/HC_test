import React, { useRef, useState, useEffect } from 'react';
import { X, Share2, Download, Camera, Copy, Instagram, Facebook, Twitter, Send } from 'lucide-react';
import html2canvas from 'html2canvas';
import toast from 'react-hot-toast';

interface ShareAchievementModalProps {
  isOpen: boolean;
  onClose: () => void;
  achievement: {
    title: string;
    description: string;
    value: string;
    icon: React.ReactNode;
  };
  userName: string;
}

export function ShareAchievementModal({ isOpen, onClose, achievement, userName }: ShareAchievementModalProps) {
  const [shareableImage, setShareableImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const achievementCardRef = useRef<HTMLDivElement>(null);

  // Проверяем поддержку Web Share API
  const canNativeShare = navigator.share !== undefined;

  useEffect(() => {
    if (isOpen && achievementCardRef.current) {
      generateImage();
    }
  }, [isOpen, achievement]);

  const generateImage = async () => {
    if (!achievementCardRef.current) return;

    setLoading(true);
    try {
      const canvas = await html2canvas(achievementCardRef.current, {
        backgroundColor: null,
        scale: 2, // Увеличиваем качество изображения
        logging: false,
        useCORS: true
      });
      
      const imageUrl = canvas.toDataURL('image/png');
      setShareableImage(imageUrl);
    } catch (error) {
      console.error('Error generating image:', error);
      toast.error('Ошибка при создании изображения');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!shareableImage) return;
    
    const link = document.createElement('a');
    link.href = shareableImage;
    link.download = `hardcase-achievement-${achievement.title.toLowerCase().replace(/\s+/g, '-')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Изображение сохранено');
  };

  const handleCopyImage = async () => {
    if (!shareableImage) return;
    
    try {
      const blob = await fetch(shareableImage).then(res => res.blob());
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);
      
      setCopied(true);
      toast.success('Изображение скопировано в буфер обмена');
      
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying image:', error);
      toast.error('Не удалось скопировать изображение');
    }
  };

  const handleNativeShare = async () => {
    if (!shareableImage) return;
    
    try {
      const blob = await fetch(shareableImage).then(res => res.blob());
      const file = new File([blob], `hardcase-achievement.png`, { type: 'image/png' });
      
      await navigator.share({
        title: `Мое достижение: ${achievement.title}`,
        text: `${achievement.description} - ${achievement.value}`,
        files: [file]
      });
      
      toast.success('Успешно отправлено');
    } catch (error) {
      console.error('Error sharing:', error);
      if (error instanceof Error && error.name !== 'AbortError') {
        toast.error('Не удалось поделиться');
      }
    }
  };

  const handleInstagramShare = () => {
    if (!shareableImage) return;

    // Для Instagram рекомендуется использовать Stories API, но здесь просто скопируем изображение
    handleCopyImage();
    toast('Изображение скопировано! Теперь вы можете вставить его в Instagram Stories', {
      icon: '📱',
      duration: 4000
    });
  };

  const handleFacebookShare = () => {
    // Facebook требует URL для шеринга, поэтому мы не можем напрямую поделиться изображением
    // Альтернативный вариант - скопировать изображение
    handleCopyImage();
    toast('Изображение скопировано! Теперь вы можете вставить его в пост Facebook', {
      icon: '📱',
      duration: 4000
    });
  };

  const handleTwitterShare = () => {
    const text = `Мое достижение в фитнесе: ${achievement.title} - ${achievement.value}!`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleTelegramShare = () => {
    if (!shareableImage) return;

    handleCopyImage();
    toast('Изображение скопировано! Откройте Telegram, нажмите на камеру в верхней части экрана и вставьте изображение из буфера обмена для добавления в Stories', {
      icon: '📱',
      duration: 5000
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl overflow-hidden max-w-md w-full">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">Поделиться достижением</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        
        <div className="p-4">
          {/* Карточка достижения для превью и создания изображения */}
          <div
            ref={achievementCardRef}
            className="bg-gradient-to-r from-orange-500 to-amber-500 p-6 rounded-lg text-white relative overflow-hidden"
          >
            <div className="absolute bottom-0 right-0 p-2 text-xs opacity-80">
              HARDCASE
            </div>
            
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                {achievement.icon}
              </div>
              <div className="ml-3">
                <h3 className="font-bold text-lg">{achievement.title}</h3>
                <p>{achievement.description}</p>
              </div>
            </div>
            
            <div className="flex justify-between items-end">
              <div className="text-3xl font-bold">{achievement.value}</div>
              <div className="text-sm opacity-80">{userName}</div>
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
                <div className="grid grid-cols-4 gap-3">
                  <button 
                    onClick={handleInstagramShare}
                    className="flex flex-col items-center justify-center gap-1 p-3 bg-gradient-to-br from-purple-600 to-pink-500 text-white rounded-lg hover:opacity-90 transition-opacity"
                  >
                    <Instagram className="w-6 h-6" />
                    <span className="text-xs">Instagram</span>
                  </button>
                  
                  <button 
                    onClick={handleFacebookShare}
                    className="flex flex-col items-center justify-center gap-1 p-3 bg-blue-600 text-white rounded-lg hover:opacity-90 transition-opacity"
                  >
                    <Facebook className="w-6 h-6" />
                    <span className="text-xs">Facebook</span>
                  </button>
                  
                  <button 
                    onClick={handleTwitterShare}
                    className="flex flex-col items-center justify-center gap-1 p-3 bg-blue-400 text-white rounded-lg hover:opacity-90 transition-opacity"
                  >
                    <Twitter className="w-6 h-6" />
                    <span className="text-xs">Twitter</span>
                  </button>

                  <button 
                    onClick={handleTelegramShare}
                    className="flex flex-col items-center justify-center gap-1 p-3 bg-sky-500 text-white rounded-lg hover:opacity-90 transition-opacity"
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