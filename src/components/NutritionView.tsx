import React, { useState, useEffect, useRef } from 'react';
import { Apple, Plus, Trash2, Upload, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { SidebarLayout } from './SidebarLayout';
import toast from 'react-hot-toast';
import { useClientNavigation } from '../lib/navigation';
import { MeasurementsInputModal } from './MeasurementsInputModal';

interface PhotoPreview {
  file: File;
  preview: string;
}

interface NutritionEntry {
  id: string;
  date: string;
  proteins: number | null;
  fats: number | null;
  carbs: number | null;
  calories: number | null; // Добавлено поле для калорий
  water: number | null;
  photos: string[];
}

export function NutritionView() {
  const [entries, setEntries] = useState<NutritionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<PhotoPreview[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [showMeasurementsModal, setShowMeasurementsModal] = useState(false);
  const [newEntry, setNewEntry] = useState<Omit<NutritionEntry, 'id'>>({
    date: new Date().toISOString().split('T')[0],
    proteins: null,
    fats: null,
    carbs: null,
    calories: null,
    water: null,
    photos: []
  });
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNutritionData();
  }, []);

  const fetchNutritionData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (clientError) throw clientError;

      const { data: entriesData, error: entriesError } = await supabase
        .from('client_nutrition')
        .select('*')
        .eq('client_id', clientData.id)
        .order('date', { ascending: false });

      if (entriesError) throw entriesError;

      const entriesWithPhotos = await Promise.all(
        (entriesData || []).map(async (entry) => {
          const { data: files } = await supabase.storage
            .from('client-photos')
            .list(`nutrition-photos/${clientData.id}/${entry.date}`);

          const photos = (files || []).map(file => {
            const { data: { publicUrl } } = supabase.storage
              .from('client-photos')
              .getPublicUrl(`nutrition-photos/${clientData.id}/${entry.date}/${file.name}`);
              
            return publicUrl;
          });

          return {
            ...entry,
            photos
          };
        })
      );

      setEntries(entriesWithPhotos);
    } catch (error: any) {
      console.error('Error fetching nutrition data:', error);
      toast.error('Ошибка при загрузке данных');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      
      const validFiles = files.filter(file => {
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} не является изображением`);
          return false;
        }

        if (file.size > 25 * 1024 * 1024) {
          toast.error(`${file.name} превышает допустимый размер 25MB`);
          return false;
        }

        return true;
      });

      Promise.all(
        validFiles.map(file => new Promise<PhotoPreview>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve({
              file,
              preview: reader.result as string
            });
          };
          reader.readAsDataURL(file);
        }))
      ).then(previews => {
        setSelectedFiles(prev => [...prev, ...previews]);
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (clientError) throw clientError;

      // Преобразуем null в 0 только при отправке данных
      const dataToSave = {
        proteins: newEntry.proteins || 0,
        fats: newEntry.fats || 0,
        carbs: newEntry.carbs || 0,
        calories: newEntry.calories || 0,
        water: newEntry.water || 0
      };

      // Обработка редактирования
      if (editingEntryId) {
        const { error: updateError } = await supabase
          .from('client_nutrition')
          .update(dataToSave)
          .eq('id', editingEntryId);

        if (updateError) throw updateError;
        toast.success('Данные обновлены');
        
        // Сбрасываем режим редактирования
        setEditingEntryId(null);
      } else {
        // Проверка на существующую запись по дате
        const existingEntry = entries.find(entry => entry.date === newEntry.date);

        if (existingEntry) {
          const { error: updateError } = await supabase
            .from('client_nutrition')
            .update(dataToSave)
            .eq('id', existingEntry.id);

          if (updateError) throw updateError;
          toast.success('Данные обновлены');
        } else {
          const { error: insertError } = await supabase
            .from('client_nutrition')
            .insert({
              client_id: clientData.id,
              date: newEntry.date,
              ...dataToSave
            });

          if (insertError) throw insertError;
          toast.success('Данные сохранены');
        }
      }

      if (selectedFiles.length > 0) {
        const uploadPromises = selectedFiles.map(async ({ file }, index) => {
          const fileExt = file.name.split('.').pop();
          const uniqueId = crypto.randomUUID();
          const fileName = `${Date.now()}-${index}-${uniqueId}.${fileExt}`;
          const filePath = `nutrition-photos/${clientData.id}/${newEntry.date}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('client-photos')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) throw uploadError;
        });

        await Promise.all(uploadPromises);
      }

      await fetchNutritionData();
      resetForm();
    } catch (error: any) {
      console.error('Error saving nutrition data:', error);
      toast.error('Ошибка при сохранении данных');
    } finally {
      setUploading(false);
    }
  };

  // Функция для сброса формы
  const resetForm = () => {
    setNewEntry({
      date: new Date().toISOString().split('T')[0],
      proteins: null,
      fats: null,
      carbs: null,
      calories: null,
      water: null,
      photos: []
    });
    setSelectedFiles([]);
    setEditingEntryId(null);
  };

  // Функция начала редактирования записи
  const handleEdit = (entry: NutritionEntry) => {
    // Прокручиваем страницу вверх к форме
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
    
    // Устанавливаем данные записи в форму
    setNewEntry({
      date: entry.date,
      proteins: entry.proteins,
      fats: entry.fats,
      carbs: entry.carbs,
      calories: entry.calories,
      water: entry.water,
      photos: entry.photos
    });
    
    // Устанавливаем ID редактируемой записи
    setEditingEntryId(entry.id);
  };

  // Функция отмены редактирования
  const handleCancelEdit = () => {
    resetForm();
  };

  const handleDelete = async (entryId: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту запись?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('client_nutrition')
        .delete()
        .eq('id', entryId);

      if (error) throw error;

      toast.success('Запись удалена');
      fetchNutritionData();
    } catch (error: any) {
      console.error('Error deleting entry:', error);
      toast.error('Ошибка при удалении записи');
    }
  };

  const handleRemovePhoto = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    let parsedValue: number | null = null;
    if (value !== '') {
      parsedValue = parseFloat(value);
      if (isNaN(parsedValue)) {
        parsedValue = null;
      }
    }
    
    setNewEntry({
      ...newEntry,
      [name]: parsedValue
    });
  };

  const menuItems = useClientNavigation(showFabMenu, setShowFabMenu, handleMenuItemClick, handleOpenMeasurementsModal);

  return (
    <SidebarLayout
      menuItems={menuItems}
      variant="bottom"
      backTo="/client"
    >
      <div className="p-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              {editingEntryId ? 'Редактирование записи' : 'Дневник питания'}
            </h2>
            <Apple className="w-5 h-5 text-gray-400" />
          </div>

          <form onSubmit={handleSubmit} className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Дата
                </label>
                <input
                  type="date"
                  value={newEntry.date}
                  onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Белки (г)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  name="proteins"
                  value={newEntry.proteins === null ? '' : newEntry.proteins}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Жиры (г)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  name="fats"
                  value={newEntry.fats === null ? '' : newEntry.fats}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Углеводы (г)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  name="carbs"
                  value={newEntry.carbs === null ? '' : newEntry.carbs}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Калории (ккал)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  name="calories"
                  value={newEntry.calories === null ? '' : newEntry.calories}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Вода (мл)
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  name="water"
                  value={newEntry.water === null ? '' : newEntry.water}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="mb-4 space-y-4">
                {selectedFiles.map((photo, index) => (
                  <div key={index} className="relative">
                    <img
                      src={photo.preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full max-h-[200px] object-contain rounded-lg"
                    />
                    <button
                      onClick={() => handleRemovePhoto(index)}
                      className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md hover:bg-gray-100"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-[200px] border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-orange-500 transition-colors"
              >
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <p className="text-gray-500">Нажмите, чтобы добавить фото еды</p>
                <p className="text-sm text-gray-400 mt-1">JPG, PNG до 25MB</p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            <div className="flex space-x-2">
              <button
                type="submit"
                disabled={uploading}
                className={`px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {uploading ? 'Сохранение...' : (editingEntryId ? 'Сохранить изменения' : 'Сохранить')}
              </button>
              
              {editingEntryId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Отменить редактирование
                </button>
              )}
            </div>
          </form>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
          ) : entries.length > 0 ? (
            <div className="space-y-6">
              {entries.map((entry) => (
                <div key={entry.id} className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 p-4 flex justify-between items-center">
                    <div>
                      <h3 className="font-medium">{new Date(entry.date).toLocaleDateString('ru-RU')}</h3>
                      <div className="mt-1 text-sm text-gray-500 space-x-4">
                        <span>Б: {entry.proteins}г</span>
                        <span>Ж: {entry.fats}г</span>
                        <span>У: {entry.carbs}г</span>
                        <span>Ккал: {entry.calories}ккал</span>
                        <span>Вода: {entry.water}мл</span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(entry)}
                        className="text-blue-500 hover:text-blue-600 transition-colors"
                        title="Редактировать"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="text-red-500 hover:text-red-600 transition-colors"
                        title="Удалить"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {entry.photos && entry.photos.length > 0 && (
                    <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {entry.photos.map((photo, index) => (
                        <a
                          key={index}
                          href={photo}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block aspect-square rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
                        >
                          <img
                            src={photo}
                            alt={`Фото еды ${new Date(entry.date).toLocaleDateString('ru-RU')} #${index + 1}`}
                            className="w-full h-full object-contain"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Apple className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Нет записей о питании</p>
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