import React, { useState, useEffect, useRef } from 'react';
import { Apple, Plus, Trash2, Upload, X, Edit, Check, AlertTriangle, ChevronDown, ChevronUp, Camera } from 'lucide-react';
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
  created_at: string; // Добавляем поле для сортировки записей за день
  proteins: number | null;
  fats: number | null;
  carbs: number | null;
  calories: number | null;
  water: number | null;
  photos: string[];
}

// Интерфейс для группировки записей по дням
interface DayGroup {
  date: string;
  entries: NutritionEntry[];
  isOpen: boolean;
  totals: {
    proteins: number;
    fats: number;
    carbs: number;
    calories: number;
    water: number;
    photoCount: number;
  };
}

export function NutritionView() {
  const [entries, setEntries] = useState<NutritionEntry[]>([]);
  const [groupedEntries, setGroupedEntries] = useState<DayGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<PhotoPreview[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [showMeasurementsModal, setShowMeasurementsModal] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  
  // Новое состояние для управления диалогом подтверждения удаления
  const [confirmDeleteDialog, setConfirmDeleteDialog] = useState({
    show: false,
    entryId: '',
  });
  
  const [newEntry, setNewEntry] = useState<Omit<NutritionEntry, 'id' | 'created_at' | 'photos'>>({
    date: new Date().toISOString().split('T')[0],
    proteins: null,
    fats: null,
    carbs: null,
    calories: null,
    water: null,
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchNutritionData();
  }, []);

  // Группировка записей по датам при изменении entries
  useEffect(() => {
    if (entries.length > 0) {
      const groups: { [date: string]: NutritionEntry[] } = {};
      
      // Группируем записи по датам
      entries.forEach(entry => {
        if (!groups[entry.date]) {
          groups[entry.date] = [];
        }
        groups[entry.date].push(entry);
      });
      
      // Преобразуем объект групп в массив с подсчетом итогов
      const groupsArray: DayGroup[] = Object.keys(groups)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime()) // Сортировка по убыванию даты
        .map(date => {
          // Сортируем записи внутри дня по created_at (от новых к старым)
          const entriesForDay = groups[date].sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          
          // Вычисляем суммарные показатели за день
          const totals = entriesForDay.reduce((acc, entry) => {
            return {
              proteins: acc.proteins + (entry.proteins || 0),
              fats: acc.fats + (entry.fats || 0),
              carbs: acc.carbs + (entry.carbs || 0),
              calories: acc.calories + (entry.calories || 0),
              water: acc.water + (entry.water || 0),
              photoCount: acc.photoCount + (entry.photos?.length || 0),
            };
          }, { proteins: 0, fats: 0, carbs: 0, calories: 0, water: 0, photoCount: 0 });
          
          return {
            date,
            entries: entriesForDay,
            isOpen: false, // По умолчанию все группы закрыты
            totals,
          };
        });
      
      setGroupedEntries(groupsArray);
    } else {
      setGroupedEntries([]);
    }
  }, [entries]);

  // Эффект для лучшей обработки файлового инпута в iOS WKWebView
  useEffect(() => {
    // Функция для инициализации файлового инпута
    const initFileInput = () => {
      if (fileInputRef.current) {
        // Очищаем текущее значение, чтобы событие change срабатывало даже при выборе того же файла
        fileInputRef.current.value = '';
        
        // Добавляем обработчик клика с таймаутом для iOS WebView
        const clickHandler = async () => {
          console.log('NutritionView: File input clicked');
          // Небольшой таймаут для iOS WebView
          await new Promise(resolve => setTimeout(resolve, 100));
        };
        
        // Удаляем предыдущий обработчик, если он был
        fileInputRef.current.removeEventListener('click', clickHandler);
        fileInputRef.current.addEventListener('click', clickHandler);
      }
    };
    
    initFileInput();
    
    // Настраиваем инпут каждый раз перед его использованием
    const uploadArea = document.getElementById('nutrition-photo-upload-area');
    if (uploadArea) {
      uploadArea.addEventListener('click', () => {
        initFileInput();
        fileInputRef.current?.click();
      });
    }
    
    return () => {
      // Очистка при размонтировании
      if (uploadArea) {
        uploadArea.removeEventListener('click', () => {
          fileInputRef.current?.click();
        });
      }
    };
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

  // Функция для переключения состояния группы (открыта/закрыта)
  const toggleGroupOpen = (dateIndex: number) => {
    setGroupedEntries(prevGroups => {
      const newGroups = [...prevGroups];
      newGroups[dateIndex].isOpen = !newGroups[dateIndex].isOpen;
      return newGroups;
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      console.log('NutritionView: Files selected:', e.target.files.length);
      
      const files = Array.from(e.target.files);
      console.log('NutritionView: File types:', files.map(f => f.type).join(', '));
      
      const validFiles = files.filter(file => {
        if (!file.type.startsWith('image/')) {
          console.warn(`NutritionView: File rejected - not an image: ${file.name} (${file.type})`);
          toast.error(`${file.name} не является изображением`);
          return false;
        }

        if (file.size > 25 * 1024 * 1024) {
          console.warn(`NutritionView: File rejected - too large: ${file.name} (${file.size} bytes)`);
          toast.error(`${file.name} превышает допустимый размер 25MB`);
          return false;
        }

        return true;
      });

      if (validFiles.length === 0) {
        console.warn('NutritionView: No valid files found after filtering');
        return;
      }

      Promise.all(
        validFiles.map(file => new Promise<PhotoPreview>((resolve, reject) => {
          console.log(`NutritionView: Processing file: ${file.name}`);
          const reader = new FileReader();
          
          reader.onloadend = () => {
            console.log(`NutritionView: File loaded successfully: ${file.name}`);
            resolve({
              file,
              preview: reader.result as string
            });
          };
          
          reader.onerror = () => {
            console.error(`NutritionView: Error reading file: ${file.name}`, reader.error);
            reject(reader.error);
          };
          
          reader.readAsDataURL(file);
        }))
      ).then(previews => {
        console.log(`NutritionView: Generated ${previews.length} previews`);
        setSelectedFiles(prev => [...prev, ...previews]);
      }).catch(error => {
        console.error('NutritionView: Error processing files:', error);
        toast.error('Ошибка при обработке фото. Пожалуйста, попробуйте еще раз.');
      });
    } else {
      console.warn('NutritionView: No files selected or files object is null');
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
        water: newEntry.water || 0,
        client_id: clientData.id,
        date: newEntry.date,
        created_at: new Date().toISOString(), // Добавляем текущую дату и время при создании
      };

      let entryId;

      if (editingEntryId) {
        // Обновление существующей записи
        const { error: updateError } = await supabase
          .from('client_nutrition')
          .update(dataToSave)
          .eq('id', editingEntryId);

        if (updateError) throw updateError;
        entryId = editingEntryId;
        toast.success('Запись обновлена');
        setEditingEntryId(null);
      } else {
        // Всегда создаем новую запись
        const { data: insertedData, error: insertError } = await supabase
          .from('client_nutrition')
          .insert(dataToSave)
          .select('id');

        if (insertError) throw insertError;
        if (insertedData && insertedData.length > 0) {
          entryId = insertedData[0].id;
          toast.success('Запись сохранена');
        }
      }

      // Загрузка фотографий
      if (selectedFiles.length > 0 && entryId) {
        await Promise.all(
          selectedFiles.map(async (photo, index) => {
            const fileName = `${Date.now()}_${index}.${photo.file.name.split('.').pop()}`;
            const { error: uploadError } = await supabase.storage
              .from('client-photos')
              .upload(`nutrition-photos/${clientData.id}/${newEntry.date}/${fileName}`, photo.file);

            if (uploadError) throw uploadError;
          })
        );
      }

      // Очищаем форму и обновляем данные
      setSelectedFiles([]);
      setNewEntry({
        date: new Date().toISOString().split('T')[0],
        proteins: null,
        fats: null,
        carbs: null,
        calories: null,
        water: null
      });
      fetchNutritionData();

    } catch (error: any) {
      console.error('Error saving nutrition entry:', error);
      toast.error('Ошибка при сохранении. Пожалуйста, попробуйте еще раз.');
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const parsedValue = name === 'date' ? value : (value === '' ? null : Number(value));
    setNewEntry(prev => ({
      ...prev,
      [name]: parsedValue
    }));
  };

  const handleEdit = (entry: NutritionEntry) => {
    setEditingEntryId(entry.id);
    setNewEntry({
      date: entry.date,
      proteins: entry.proteins,
      fats: entry.fats,
      carbs: entry.carbs,
      calories: entry.calories,
      water: entry.water
    });
    
    // Очищаем предыдущий выбор фотографий
    setSelectedFiles([]);
    
    // Перемещаем взгляд к форме для удобства редактирования
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRemovePhoto = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
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
        setShowMeasurementsModal(true);
        break;
    }
  };

  const menuItems = useClientNavigation(showFabMenu, setShowFabMenu, handleMenuItemClick);

  const initiateDelete = (entryId: string) => {
    setConfirmDeleteDialog({ show: true, entryId });
  };

  const confirmDelete = async () => {
    try {
      const entryId = confirmDeleteDialog.entryId;
      const entryToDelete = entries.find(entry => entry.id === entryId);
      
      if (!entryToDelete) {
        toast.error('Запись не найдена');
        setConfirmDeleteDialog({ show: false, entryId: '' });
        return;
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (clientError) throw clientError;
      
      // Удаляем запись из базы данных
      const { error: deleteError } = await supabase
        .from('client_nutrition')
        .delete()
        .eq('id', entryId);

      if (deleteError) throw deleteError;
      
      // Если у записи были фотографии, удаляем их из хранилища
      if (entryToDelete.photos && entryToDelete.photos.length > 0) {
        const { data: files } = await supabase.storage
          .from('client-photos')
          .list(`nutrition-photos/${clientData.id}/${entryToDelete.date}`);
          
        if (files && files.length > 0) {
          const filesToDelete = files.map(file => 
            `nutrition-photos/${clientData.id}/${entryToDelete.date}/${file.name}`
          );
          
          const { error: storageError } = await supabase.storage
            .from('client-photos')
            .remove(filesToDelete);
            
          if (storageError) {
            console.error('Error deleting photos:', storageError);
          }
        }
      }
      
      // Обновляем UI, удаляя запись из локального состояния
      setEntries(prev => prev.filter(entry => entry.id !== entryId));
      
      toast.success('Запись удалена');
      setConfirmDeleteDialog({ show: false, entryId: '' });
    } catch (error: any) {
      console.error('Error deleting entry:', error);
      toast.error('Ошибка при удалении записи');
    }
  };

  const cancelDelete = () => {
    console.log('Отмена удаления записи');
    setConfirmDeleteDialog({ show: false, entryId: '' });
  };

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return '';
    }
  };

  return (
    <SidebarLayout
      menuItems={menuItems}
      variant="bottom"
      backTo="/client"
    >
      <div className="p-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Дневник питания</h2>
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
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={uploading}
                  className="w-full p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  {uploading ? 'Сохранение...' : (editingEntryId ? 'Обновить' : 'Сохранить')}
                </button>
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
                id="nutrition-photo-upload-area"
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
          </form>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
          ) : groupedEntries.length > 0 ? (
            <div className="space-y-4">
              {groupedEntries.map((dayGroup, dayIndex) => (
                <div key={dayGroup.date} className="border rounded-lg overflow-hidden">
                  {/* Заголовок дня (всегда виден) */}
                  <div 
                    className="bg-gray-50 p-4 flex justify-between items-center cursor-pointer"
                    onClick={() => toggleGroupOpen(dayIndex)}
                  >
                    <div className="flex-grow">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">
                          {new Date(dayGroup.date).toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </h3>
                        <div className="flex items-center space-x-2 text-gray-500 text-sm">
                          {dayGroup.totals.photoCount > 0 && (
                            <span className="flex items-center" title="Фотографии">
                              <Camera className="w-4 h-4 mr-1" />
                              {dayGroup.totals.photoCount}
                            </span>
                          )}
                          <span className="ml-2">
                            {dayGroup.isOpen ? (
                              <ChevronUp className="w-5 h-5" />
                            ) : (
                              <ChevronDown className="w-5 h-5" />
                            )}
                          </span>
                        </div>
                      </div>
                      
                      {/* Суммарные показатели */}
                      <div className="mt-1 text-sm text-gray-500 flex flex-wrap gap-3">
                        <span>Записей: {dayGroup.entries.length}</span>
                        {(dayGroup.totals.proteins > 0 || dayGroup.totals.fats > 0 || dayGroup.totals.carbs > 0 || dayGroup.totals.calories > 0 || dayGroup.totals.water > 0) && (
                          <>
                            <span>Б: {dayGroup.totals.proteins}г</span>
                            <span>Ж: {dayGroup.totals.fats}г</span>
                            <span>У: {dayGroup.totals.carbs}г</span>
                            <span>Ккал: {dayGroup.totals.calories}ккал</span>
                            <span>Вода: {dayGroup.totals.water}мл</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Содержимое дня (показывается только когда раскрыто) */}
                  {dayGroup.isOpen && (
                    <div className="p-2 divide-y">
                      {dayGroup.entries.map((entry) => (
                        <div key={entry.id} className="p-2">
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="text-sm text-gray-500">
                                  {entry.created_at && (
                                    <span>Время: {formatTime(entry.created_at)}</span>
                                  )}
                                </div>
                                <div className="mt-1 text-sm flex flex-wrap gap-2">
                                  {(entry.proteins || entry.fats || entry.carbs || entry.calories || entry.water) && (
                                    <>
                                      {entry.proteins && entry.proteins > 0 && <span>Б: {entry.proteins}г</span>}
                                      {entry.fats && entry.fats > 0 && <span>Ж: {entry.fats}г</span>}
                                      {entry.carbs && entry.carbs > 0 && <span>У: {entry.carbs}г</span>}
                                      {entry.calories && entry.calories > 0 && <span>Ккал: {entry.calories}ккал</span>}
                                      {entry.water && entry.water > 0 && <span>Вода: {entry.water}мл</span>}
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleEdit(entry)}
                                  className="p-2 text-blue-500 hover:text-blue-600 rounded-full hover:bg-blue-50 transition-colors"
                                  title="Редактировать запись"
                                  aria-label="Редактировать запись"
                                  type="button"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => initiateDelete(entry.id)}
                                  className="p-2 text-red-500 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors"
                                  title="Удалить запись"
                                  aria-label="Удалить запись"
                                  type="button"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            
                            {/* Фотографии еды */}
                            {entry.photos && entry.photos.length > 0 && (
                              <div className="mt-2 grid grid-cols-2 gap-2">
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
                        </div>
                      ))}
                      
                      {/* Кнопка для добавления еще записи на этот день */}
                      <div className="p-2">
                        <button
                          onClick={() => {
                            setNewEntry(prev => ({
                              ...prev,
                              date: dayGroup.date
                            }));
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="w-full p-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Добавить еще за этот день
                        </button>
                      </div>
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

      {/* Кастомный диалог подтверждения удаления */}
      {confirmDeleteDialog.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <div className="flex items-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-500 mr-2" />
              <h3 className="text-lg font-semibold">Подтверждение удаления</h3>
            </div>
            <p className="mb-6">Вы уверены, что хотите удалить эту запись? Это действие нельзя отменить.</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                type="button"
              >
                Отмена
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                type="button"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}