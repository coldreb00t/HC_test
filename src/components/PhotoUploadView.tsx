import React, { useState, useRef } from 'react';
import { Camera, Upload, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { SidebarLayout } from './SidebarLayout';
import toast from 'react-hot-toast';

interface PhotoPreview {
  file: File;
  preview: string;
}

export function PhotoUploadView() {
  const [selectedFiles, setSelectedFiles] = useState<PhotoPreview[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleCameraClick = () => {
    if (fileInputRef.current) {
      // Сбрасываем value для повторной активации
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    
    if (!files || files.length === 0) {
      console.warn('No files selected');
      return;
    }
    
    console.log('Files selected:', files.length);
    
    // Обрабатываем только первый файл для максимальной совместимости
    const file = files[0];
    
    console.log('Processing file:', file.name, file.type, file.size);
    
    if (!file.type.startsWith('image/')) {
      toast.error(`Файл не является изображением`);
      return;
    }
    
    if (file.size > 25 * 1024 * 1024) {
      toast.error(`Файл превышает 25MB`);
      return;
    }
    
    // Простая обработка без FileReader для минимизации проблем
    // Используем создание превью через createObjectURL
    try {
      const preview = URL.createObjectURL(file);
      console.log('Created preview URL:', preview);
      
      setSelectedFiles(prev => [...prev, { file, preview }]);
    } catch (error) {
      console.error('Error creating preview:', error);
      toast.error('Не удалось создать превью файла');
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Пожалуйста, выберите фото');
      return;
    }

    try {
      setUploading(true);
      console.log('Starting photo upload');

      // Получаем текущего пользователя
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Находим ID клиента по user_id
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (clientError) throw clientError;

      const uploadPromises = selectedFiles.map(async ({ file }) => {
        const timestamp = Date.now();
        const filename = `${clientData.id}-${timestamp}-${file.name}`;
        const path = `progress-photos/${clientData.id}/${filename}`;

        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(path, file);

        if (uploadError) throw uploadError;

        // Получаем публичный URL для фото
        const { data: { publicUrl } } = supabase.storage
          .from('images')
          .getPublicUrl(path);

        return publicUrl;
      });

      const uploadedUrls = await Promise.all(uploadPromises);

      // Добавляем записи в progress_photos таблицу
      const { error: insertError } = await supabase
        .from('progress_photos')
        .insert(
          uploadedUrls.map(url => ({
            client_id: clientData.id,
            url,
            date: new Date().toISOString()
          }))
        );

      if (insertError) throw insertError;

      // Очищаем ObjectURL для всех загруженных файлов
      selectedFiles.forEach(file => {
        if (file.preview.startsWith('blob:')) {
          URL.revokeObjectURL(file.preview);
        }
      });

      toast.success('Фото успешно загружены');
      navigate('/client/progress');

    } catch (error: any) {
      console.error('Error uploading photos:', error);
      toast.error('Ошибка при загрузке фото');
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = (index: number) => {
    const fileToRemove = selectedFiles[index];
    
    // Очищаем ObjectURL перед удалением
    if (fileToRemove.preview.startsWith('blob:')) {
      URL.revokeObjectURL(fileToRemove.preview);
    }
    
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const menuItems = [
    {
      icon: <X className="w-6 h-6" />,
      label: 'Отмена',
      onClick: () => navigate('/client/progress')
    }
  ];

  return (
    <SidebarLayout
      title="Загрузка фото"
      menuItems={menuItems}
      variant="bottom"
      backTo="/client/progress"
    >
      <div className="p-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Добавить фото</h2>
            <Camera className="w-5 h-5 text-gray-400" />
          </div>

          {/* Photo Previews */}
          <div className="mb-4 space-y-4">
            {selectedFiles.map((photo, index) => (
              <div key={index} className="relative">
                <img
                  src={photo.preview}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-[300px] object-cover rounded-lg"
                />
                <button
                  onClick={() => handleRemovePhoto(index)}
                  className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ))}

            {/* Upload Area */}
            <div
              onClick={handleCameraClick}
              className="w-full h-[300px] border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-orange-500 transition-colors"
            >
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <p className="text-gray-500">Нажмите, чтобы выбрать фото</p>
              <p className="text-sm text-gray-400 mt-1">JPG, PNG до 25MB</p>
              <p className="text-sm text-gray-400">Выберите фото из галереи</p>
            </div>
          </div>

          {/* Hidden File Input с минимальными атрибутами для лучшей совместимости */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Submit Button */}
          <button
            onClick={handleUpload}
            disabled={uploading || selectedFiles.length === 0}
            className="w-full py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Загрузка...' : 'Загрузить фото'}
          </button>
        </div>
      </div>
    </SidebarLayout>
  );
}