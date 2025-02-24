import React, { useState, useEffect } from 'react';
import { Camera, Calendar, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { SidebarLayout } from './SidebarLayout';
import toast from 'react-hot-toast';
import { useClientNavigation } from '../lib/navigation';

interface ProgressPhoto {
  url: string;
  date: string;
  filename: string;
}

export function ProgressPhotosView() {
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPhotos();
  }, []);

  const fetchPhotos = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get client profile
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id, photo_url')
        .eq('user_id', user.id)
        .single();

      if (clientError) throw clientError;

      // Get all photos from storage
      const { data: files, error: storageError } = await supabase.storage
        .from('client-photos')
        .list('progress-photos', {
          limit: 100,
          offset: 0,
          sortBy: { column: 'name', order: 'desc' }
        });

      if (storageError) throw storageError;

      // Filter files for this client and get their URLs
      const clientPhotos = files
        ?.filter(file => file.name.startsWith(clientData.id))
        .map(file => {
          const { data: { publicUrl } } = supabase.storage
            .from('client-photos')
            .getPublicUrl(`progress-photos/${file.name}`);

          // Extract timestamp from filename (format: clientId-timestamp-uuid.ext)
          const parts = file.name.split('-');
          if (parts.length >= 2) {
            const timestamp = parseInt(parts[1]);
            if (!isNaN(timestamp)) {
              const date = new Date(timestamp);
              return {
                url: publicUrl,
                filename: file.name,
                date: date.toLocaleString('ru-RU', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              };
            }
          }

          // Get current server timestamp for files without valid timestamp
          return {
            url: publicUrl,
            filename: file.name,
            date: new Date().toLocaleString('ru-RU', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })
          };
        })
        .sort((a, b) => {
          // Sort by date in descending order (newest first)
          const dateA = new Date(a.date.split(',')[0].split('.').reverse().join('-'));
          const dateB = new Date(b.date.split(',')[0].split('.').reverse().join('-'));
          return dateB.getTime() - dateA.getTime();
        }) || [];

      setPhotos(clientPhotos);
    } catch (error: any) {
      console.error('Error fetching photos:', error);
      toast.error('Ошибка при загрузке фотографий');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePhoto = async (filename: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить это фото?')) {
      return;
    }

    try {
      const { error } = await supabase.storage
        .from('client-photos')
        .remove([`progress-photos/${filename}`]);

      if (error) throw error;

      // Update local state to remove the deleted photo
      setPhotos(photos => photos.filter(photo => photo.filename !== filename));
      toast.success('Фото удалено');
    } catch (error: any) {
      console.error('Error deleting photo:', error);
      toast.error('Ошибка при удалении фото');
    }
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

  const menuItems = useClientNavigation(showFabMenu, setShowFabMenu, handleMenuItemClick);

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
                      src={photo.url}
                      alt={`Progress photo ${photo.date}`}
                      className="w-full rounded-lg"
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
    </SidebarLayout>
  );
}