import React, { useState, useRef, useEffect } from 'react';
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
  
  // Эффект для лучшей обработки камеры в iOS WKWebView
  useEffect(() => {
    // Функция для инициализации файлового инпута
    const initFileInput = () => {
      if (fileInputRef.current) {
        // Очищаем текущее значение, чтобы событие change срабатывало даже при выборе того же файла
        fileInputRef.current.value = '';
        
        // Добавляем обработчик клика с таймаутом для iOS WebView
        const clickHandler = async () => {
          console.log('File input clicked');
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
    const uploadArea = document.getElementById('photo-upload-area');
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      console.log('Files selected:', e.target.files.length);
      
      const files = Array.from(e.target.files);
      console.log('File types:', files.map(f => f.type).join(', '));
      console.log('File sizes:', files.map(f => f.size).join(', '));
      
      // Validate each file
      const validFiles = files.filter(file => {
        // Check file type
        if (!file.type.startsWith('image/')) {
          console.warn(`File rejected - not an image: ${file.name} (${file.type})`);
          toast.error(`${file.name} не является изображением`);
          return false;
        }

        // Check file size (25MB)
        if (file.size > 25 * 1024 * 1024) {
          console.warn(`File rejected - too large: ${file.name} (${file.size} bytes)`);
          toast.error(`${file.name} превышает допустимый размер 25MB`);
          return false;
        }

        return true;
      });

      if (validFiles.length === 0) {
        console.warn('No valid files found after filtering');
        return;
      }

      // Create previews for valid files
      Promise.all(
        validFiles.map(file => new Promise<PhotoPreview>((resolve, reject) => {
          console.log(`Processing file: ${file.name} (${file.type})`);
          const reader = new FileReader();
          
          reader.onloadend = () => {
            console.log(`File loaded successfully: ${file.name}`);
            resolve({
              file,
              preview: reader.result as string
            });
          };
          
          reader.onerror = () => {
            console.error(`Error reading file: ${file.name}`, reader.error);
            reject(reader.error);
          };
          
          reader.readAsDataURL(file);
        }))
      ).then(previews => {
        console.log(`Generated ${previews.length} previews`);
        setSelectedFiles(prev => [...prev, ...previews]);
      }).catch(error => {
        console.error('Error processing files:', error);
        toast.error('Ошибка при обработке фото. Пожалуйста, попробуйте еще раз.');
      });
    } else {
      console.warn('No files selected or files object is null');
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
              id="photo-upload-area"
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
            className="hidden"
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