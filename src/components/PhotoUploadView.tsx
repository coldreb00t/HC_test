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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      
      // Validate each file
      const validFiles = files.filter(file => {
        // Check file type
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} не является изображением`);
          return false;
        }

        // Check file size (25MB)
        if (file.size > 25 * 1024 * 1024) {
          toast.error(`${file.name} превышает допустимый размер 25MB`);
          return false;
        }

        return true;
      });

      // Create previews for valid files
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

// Для PhotoUploadView.tsx и MeasurementsUploadView.tsx
// Полностью заменяем функцию handleUpload

const handleUpload = async () => {
  if (selectedFiles.length === 0) {
    toast.error('Пожалуйста, выберите фото');
    return;
  }

  try {
    setUploading(true);
    console.log('Starting photo upload');

    // 1. Получаем текущего пользователя
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error('Auth error:', userError);
      throw userError;
    }
    
    if (!user) {
      toast.error('Пожалуйста, войдите в систему');
      navigate('/login');
      return;
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

    // 3. Загружаем каждый файл
    const uploadPromises = selectedFiles.map(async ({ file }, index) => {
      // Формируем имя файла с гарантированно корректной структурой
      const fileExt = file.name.split('.').pop() || 'jpg';
      const uniqueId = crypto.randomUUID();
      const timestamp = Date.now() + index; // Используем текущее время + индекс для уникальности
      
      // Строго форматируем имя файла: clientId-timestamp-uuid.ext
      const fileName = `${clientId}-${timestamp}-${uniqueId}.${fileExt}`;
      
      // Формируем путь к файлу (progress-photos или measurements-photos в зависимости от компонента)
      const folderName = window.location.pathname.includes('measurements') ? 
        'measurements-photos' : 'progress-photos';
      const filePath = `${folderName}/${fileName}`;
      
      console.log(`Uploading file to ${filePath}`);

      // Загружаем файл
      const { error: uploadError } = await supabase.storage
        .from('client-photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }
      
      return fileName;
    });

    const uploadedFiles = await Promise.all(uploadPromises);
    console.log('Successfully uploaded files:', uploadedFiles);

    toast.success('Фото успешно загружены');
    navigate(window.location.pathname.includes('measurements') ? 
      '/client/measurements' : '/client/progress');
  } catch (error: any) {
    console.error('Error uploading photos:', error);
    toast.error('Ошибка при загрузке фото: ' + (error.message || error));
  } finally {
    setUploading(false);
  }
};

  const handleRemovePhoto = (index: number) => {
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
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-[300px] border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-orange-500 transition-colors"
            >
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <p className="text-gray-500">Нажмите, чтобы выбрать фото</p>
              <p className="text-sm text-gray-400 mt-1">JPG, PNG до 25MB</p>
              <p className="text-sm text-gray-400">Можно выбрать несколько фото</p>
            </div>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={selectedFiles.length === 0 || uploading}
            className="w-full py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Загрузка...' : `Загрузить фото (${selectedFiles.length})`}
          </button>
        </div>
      </div>
    </SidebarLayout>
  );
}