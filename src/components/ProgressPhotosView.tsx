import React, { useState, useEffect } from 'react';
import { Camera, Calendar, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { SidebarLayout } from './SidebarLayout';
import toast from 'react-hot-toast';
import { useClientNavigation } from '../lib/navigation';
import { MeasurementsInputModal } from './MeasurementsInputModal';

interface ProgressPhoto {
  url: string;
  date: string;
  filename: string;
}

// Функция для проверки принадлежности файла клиенту
const verifyFileOwnership = (fileName: string, clientId: string): boolean => {
  // Проверка: Имя файла должно начинаться с ID клиента
  return fileName.startsWith(`${clientId}-`);
};

// Функция для предотвращения кэширования изображений
const getUncachedImageUrl = (url: string) => {
  const cacheBreaker = `cache=${Date.now()}`;
  if (url.includes('?')) {
    return `${url}&${cacheBreaker}`;
  } else {
    return `${url}?${cacheBreaker}`;
  }
};

export function ProgressPhotosView() {
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [showMeasurementsModal, setShowMeasurementsModal] = useState(false);
  const navigate = useNavigate();

  // Определяем fetchPhotos внутри компонента
  const fetchPhotos = async () => {
    try {
      setLoading(true);
      console.log('Fetching progress photos for current client');

      // 1. Получаем текущего пользователя
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('Auth error:', userError);
        throw new Error('Не авторизован');
      }
      
      console.log('Current user:', user.id);

      // 2. Получаем профиль клиента
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (clientError) {
        console.error('Client error:', clientError);
        throw clientError;
      }
      
      const clientId = clientData.id;
      console.log('Client ID:', clientId);

      // 3. Получаем список файлов из хранилища
      const { data: files, error: storageError } = await supabase.storage
        .from('client-photos')
        .list('progress-photos');

      if (storageError) {
        console.error('Storage error:', storageError);
        throw storageError;
      }
      
      console.log('All files in progress-photos:', files);

      // 4. Фильтруем файлы, строго проверяя, что имя начинается с clientId
      const clientIdRegex = new RegExp(`^${clientId}-`);
      const clientFiles = files?.filter(file => clientIdRegex.test(file.name));
      
      console.log('Files for this client:', clientFiles);

      // 5. Обрабатываем каждый файл
      const processedPhotos = await Promise.all(
        (clientFiles || []).map(async file => {
          try {
            // Дополнительная проверка принадлежности файла
            if (!verifyFileOwnership(file.name, clientId)) {
              console.warn(`Skipping file ${file.name} as it doesn't belong to client ${clientId}`);
              return null;
            }
            
            // Получаем публичный URL файла
            const { data: { publicUrl } } = supabase.storage
              .from('client-photos')
              .getPublicUrl(`progress-photos/${file.name}`);
            
            // Используем created_at как основной источник даты
            let photoDate: Date;
            if (file.created_at) {
              photoDate = new Date(file.created_at);
              console.log(`Using created_at for ${file.name}: ${photoDate.toISOString()}`);
            } else {
              // Резервный вариант: парсим timestamp из имени файла
              const parts = file.name.split('-');
              const timestamp = parts.length >= 2 ? parseInt(parts[1]) : null;
              
              if (timestamp && !isNaN(timestamp) && timestamp > 946684800000) { // 01.01.2000 как минимальная дата
                photoDate = new Date(timestamp);
                console.log(`Using timestamp ${timestamp} for ${file.name}: ${photoDate.toISOString()}`);
              } else {
                console.warn(`Invalid or missing timestamp in ${file.name}, using file created_at or current date`);
                photoDate = new Date(file.updated_at || Date.now()); // Используем updated_at, если есть, или текущую дату
              }
            }

            // Проверка на корректность даты
            if (isNaN(photoDate.getTime())) {
              console.warn(`Invalid date for ${file.name}, using current date`);
              photoDate = new Date();
            }

            // Форматируем дату в фиксированный формат
            const formattedDate = photoDate.toLocaleString('ru-RU', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
            
            console.log(`File ${file.name} final date: ${formattedDate}`);
            
            return {
              url: publicUrl,
              filename: file.name,
              date: formattedDate
            };
          } catch (error) {
            console.error(`Error processing file ${file.name}:`, error);
            return null;
          }
        })
      );

      // 6. Фильтруем неудачные записи и сортируем по дате (новые сверху)
      const validPhotos = processedPhotos
        .filter((photo): photo is ProgressPhoto => photo !== null)
        .sort((a, b) => {
          try {
            const parseDate = (dateStr: string) => {
              const [datePart, timePart] = dateStr.split(', ');
              const [day, month, year] = datePart.split('.').map(Number);
              const [hours, minutes] = timePart.split(':').map(Number);
              return new Date(year, month - 1, day, hours, minutes);
            };
            
            const dateA = parseDate(a.date);
            const dateB = parseDate(b.date);
            
            return dateB.getTime() - dateA.getTime();
          } catch (error) {
            console.error('Error sorting photos by date:', error);
            return 0;
          }
        });
      
      console.log('Final processed photos:', validPhotos);
      setPhotos(validPhotos);
    } catch (error: any) {
      console.error('Error fetching photos:', error);
      toast.error('Ошибка при загрузке фотографий');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhotos();
  }, []); // Вызываем fetchPhotos при монтировании компонента

  const handleDeletePhoto = async (filename: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить это фото?')) {
      return;
    }

    try {
      const { error } = await supabase.storage
        .from('client-photos')
        .remove([`progress-photos/${filename}`]);

      if (error) throw error;

      setPhotos(photos => photos.filter(photo => photo.filename !== filename));
      toast.success('Фото удалено');
    } catch (error: any) {
      console.error('Error deleting photo:', error);
      toast.error('Ошибка при удалении фото');
    }
  };

  const handleOpenMeasurementsModal = () => {
    setShowMeasurementsModal(true);
  };

  const handleMenuItemClick = (action: string) => {
    setShowFabMenu(false);
    switch (action) {
      case 'activity':
        navigate('/client/activity/new');
        break;
      case 'photo':
        navigate('/client/progress-photo/new');
        break;
      case 'measurements':
        navigate('/client/measurements/new');
        break;
      case 'nutrition':
        navigate('/client/nutrition/new');
        break;
    }
  };

  const menuItems = useClientNavigation(showFabMenu, setShowFabMenu, handleMenuItemClick, handleOpenMeasurementsModal);

  return (
    <SidebarLayout
      title="Прогресс"
      menuItems={menuItems}
      variant="bottom"
      backTo="/client"
    >
      <div className="p-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Фото прогресса</h2>
            <Calendar className="w-5 h-5 text-gray-400" />
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
          ) : photos.length > 0 ? (
            <div className="space-y-4">
              {photos.map((photo, index) => (
                <div key={index} className="border rounded-lg overflow-hidden">
                  <div className="p-3 bg-gray-50 border-b">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{photo.date}</span>
                      <button
                        onClick={() => handleDeletePhoto(photo.filename)}
                        className="p-1 text-red-500 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors"
                        title="Удалить фото"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="p-3">
                    <img
                      src={getUncachedImageUrl(photo.url)}
                      alt={`Progress photo ${photo.date}`}
                      className="w-full h-[300px] object-contain rounded-lg"
                      loading="lazy"
                      onError={(e) => {
                        console.error(`Error loading image: ${photo.url}`);
                        // Повторная попытка загрузки с другим параметром кэша при ошибке
                        const target = e.target as HTMLImageElement;
                        const newSrc = getUncachedImageUrl(photo.url.split('?')[0]);
                        console.log(`Retrying with URL: ${newSrc}`);
                        target.src = newSrc;
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Camera className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">У вас пока нет фотографий прогресса</p>
              <button
                onClick={() => navigate('/client/progress-photo/new')}
                className="mt-4 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                Добавить первое фото
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Measurements Input Modal */}
      {showMeasurementsModal && (
        <MeasurementsInputModal
          isOpen={showMeasurementsModal}
          onClose={() => setShowMeasurementsModal(false)}
          onSave={() => {
            setShowMeasurementsModal(false);
            toast.success('Замеры сохранены');
          }}
        />
      )}
    </SidebarLayout>
  );
}