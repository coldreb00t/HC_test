import React from 'react';
import { X } from 'lucide-react';

interface ExerciseVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  exerciseName: string;
}

export function ExerciseVideoModal({ isOpen, onClose, videoUrl, exerciseName }: ExerciseVideoModalProps) {
  if (!isOpen) return null;

  // Функция для обработки различных форматов видео-URL
  const getEmbedUrl = (url: string) => {
    // Если это уже iframe код
    if (url.includes('<iframe')) {
      // Извлекаем URL из iframe кода
      const srcMatch = url.match(/src=["'](.*?)["']/);
      return srcMatch ? srcMatch[1] : '';
    }
    
    // Обработка YouTube URL
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoIdMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
      if (videoIdMatch && videoIdMatch[1]) {
        return `https://www.youtube.com/embed/${videoIdMatch[1]}`;
      }
    }
    
    // Если это какой-то другой URL, возвращаем как есть
    return url;
  };

  const embedUrl = getEmbedUrl(videoUrl);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">
            {exerciseName}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        
        <div className="aspect-video w-full">
          {embedUrl ? (
            <iframe
              src={embedUrl}
              className="w-full h-full"
              title={`Видео упражнения ${exerciseName}`}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <p className="text-gray-500">Видео недоступно</p>
            </div>
          )}
        </div>
        
        <div className="p-4 bg-gray-50">
          <p className="text-sm text-gray-600">
            Внимательно следите за техникой выполнения упражнения для максимальной эффективности и безопасности.
          </p>
        </div>
      </div>
    </div>
  );
}