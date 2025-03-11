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
      console.log('Getting current user...');
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('User fetch error:', userError);
        throw userError;
      }
      
      if (!user) {
        console.error('No user found');
        throw new Error('Not authenticated');
      }
      
      console.log('User found, id:', user.id);

      // Находим ID клиента по user_id
      console.log('Fetching client data...');
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (clientError) {
        console.error('Client fetch error:', clientError);
        throw clientError;
      }
      
      console.log('Client found, id:', clientData.id);
      
      console.log('Preparing to upload', selectedFiles.length, 'files');
      
      // Добавим детальное логирование внутрь метода обработки каждого файла
      const uploadPromises = selectedFiles.map(async ({ file }, index) => {
        try {
          console.log(`Processing file ${index+1}/${selectedFiles.length}:`, file.name);
          
          const timestamp = Date.now();
          const filename = `${clientData.id}-${timestamp}-${file.name}`;
          const path = `progress-photos/${clientData.id}/${filename}`;
          
          console.log(`Uploading to path: ${path}`);
          console.log(`File details - size: ${file.size}, type: ${file.type}`);

          // Проверка на корректность Blob
          if (!(file instanceof Blob)) {
            console.error('File is not a valid Blob');
            throw new Error('Invalid file object');
          }

          // Проверяем, что файл доступен перед загрузкой
          try {
            const slice = file.slice(0, 10);
            console.log('File slice test successful, file is accessible');
          } catch (sliceError) {
            console.error('File slice test failed:', sliceError);
            throw new Error('File is not accessible');
          }

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('images')
            .upload(path, file, {
              cacheControl: '0', // Отключаем кеширование
              upsert: true // Перезаписывать при совпадении имени
            });

          if (uploadError) {
            console.error(`Upload error for file ${file.name}:`, uploadError);
            throw uploadError;
          }
          
          console.log('Upload successful, data:', uploadData);

          // Получаем публичный URL для фото
          console.log('Getting public URL...');
          const { data: { publicUrl } } = supabase.storage
            .from('images')
            .getPublicUrl(path);
            
          console.log('Public URL:', publicUrl);
          return publicUrl;
        } catch (fileError) {
          console.error(`Error processing file ${file.name}:`, fileError);
          throw fileError;
        }
      });

      console.log('Waiting for all uploads to complete...');
      const uploadedUrls = await Promise.all(uploadPromises);
      console.log('All uploads completed, URLs:', uploadedUrls);

      // Добавляем записи в progress_photos таблицу
      console.log('Inserting records into progress_photos...');
      const { data: insertData, error: insertError } = await supabase
        .from('progress_photos')
        .insert(
          uploadedUrls.map(url => ({
            client_id: clientData.id,
            url,
            date: new Date().toISOString()
          }))
        );

      if (insertError) {
        console.error('Insert error:', insertError);
        throw insertError;
      }
      
      console.log('Records inserted successfully:', insertData);

      // Очищаем ObjectURL для всех загруженных файлов
      console.log('Cleaning up object URLs...');
      selectedFiles.forEach(file => {
        if (file.preview.startsWith('blob:')) {
          URL.revokeObjectURL(file.preview);
          console.log('Revoked object URL for', file.file.name);
        }
      });

      console.log('Upload process completed successfully');
      toast.success('Фото успешно загружены');
      navigate('/client/progress');

    } catch (error: any) {
      console.error('Error uploading photos, details:', error);
      console.error('Error message:', error.message);
      if (error.stack) {
        console.error('Error stack:', error.stack);
      }
      
      // Более информативное сообщение об ошибке
      if (error.message) {
        toast.error(`Ошибка при загрузке фото: ${error.message}`);
      } else {
        toast.error('Ошибка при загрузке фото');
      }
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