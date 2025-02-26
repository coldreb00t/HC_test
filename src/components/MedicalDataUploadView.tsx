import React, { useState, useRef } from 'react';
import { FileText, Upload, X, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

interface FilePreview {
  file: File;
  preview: string | null;
  type: string;
}

interface MedicalDataUploadViewProps {
  onClose: () => void;
  onUploadSuccess: () => void;
}

export function MedicalDataUploadView({ onClose, onUploadSuccess }: MedicalDataUploadViewProps) {
  const { clientId } = useParams<{ clientId: string }>();
  const [selectedFiles, setSelectedFiles] = useState<FilePreview[]>([]);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState('blood_test'); // По умолчанию анализ крови
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      
      // Валидация файлов
      const validFiles = files.filter(file => {
        // Проверка размера (25MB максимум)
        if (file.size > 25 * 1024 * 1024) {
          toast.error(`${file.name} превышает допустимый размер 25MB`);
          return false;
        }

        return true;
      });

      // Создаем превью для выбранных файлов
      Promise.all(
        validFiles.map(file => new Promise<FilePreview>((resolve) => {
          // Для изображений создаем превью
          if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
              resolve({
                file,
                preview: reader.result as string,
                type: 'image'
              });
            };
            reader.readAsDataURL(file);
          } else {
            // Для других типов файлов (PDF, документы) просто показываем иконку
            resolve({
              file,
              preview: null,
              type: file.type
            });
          }
        }))
      ).then(previews => {
        setSelectedFiles(prev => [...prev, ...previews]);
      });
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Пожалуйста, выберите файлы');
      return;
    }

    if (!description.trim()) {
      toast.error('Пожалуйста, добавьте описание');
      return;
    }

    try {
      setUploading(true);
      
      // Проверка аутентификации
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      
      if (!clientId) {
        toast.error('ID клиента не найден');
        return;
      }

      console.log('Starting medical data upload for client:', clientId);
      
      // Используем текущее время для создания уникальных имен файлов
      const timestamp = Date.now();
      
      // Загружаем каждый файл
      const uploadResults = await Promise.all(
        selectedFiles.map(async ({ file }, index) => {
          const fileExt = file.name.split('.').pop() || '';
          const uniqueId = crypto.randomUUID();
          // Формируем имя файла с clientId для обеспечения приватности
          const fileName = `${clientId}-${timestamp + index}-${uniqueId}.${fileExt}`;
          const filePath = `medical-data/${fileName}`;

          console.log(`Uploading file to ${filePath}`);

          const { error: uploadError, data } = await supabase.storage
            .from('client-data')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) throw uploadError;

          return {
            file_path: filePath,
            file_name: fileName,
            original_name: file.name,
            file_type: file.type,
            file_size: file.size
          };
        })
      );

      // Сохраняем запись в БД о медицинских данных
      const { error: dbError } = await supabase
        .from('client_medical_data')
        .insert({
          client_id: clientId,
          category: category,
          description: description,
          date: date,
          files: uploadResults,
          created_by: user?.id,
          created_at: new Date().toISOString()
        });

      if (dbError) throw dbError;

      toast.success('Данные успешно загружены');
      onUploadSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error uploading medical data:', error);
      toast.error('Ошибка при загрузке данных: ' + (error.message || error));
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return '📊';
    return '📁';
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">
          Загрузка медицинских данных
        </h2>
        <button
          onClick={onClose}
          className="text-gray-600 hover:text-gray-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Категория
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="blood_test">Анализ крови</option>
            <option value="urine_test">Анализ мочи</option>
            <option value="mri">МРТ</option>
            <option value="xray">Рентген</option>
            <option value="ultrasound">УЗИ</option>
            <option value="ecg">ЭКГ</option>
            <option value="consultation">Консультация врача</option>
            <option value="other">Другое</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Дата
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Описание
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="Введите описание или результаты анализа"
            required
          />
        </div>

        {/* Превью файлов */}
        <div className="space-y-4">
          {selectedFiles.map((fileData, index) => (
            <div key={index} className="bg-gray-50 p-3 rounded-lg relative flex items-center">
              <div className="flex-shrink-0 mr-3 text-2xl">
                {fileData.preview ? (
                  <img 
                    src={fileData.preview} 
                    alt="Preview" 
                    className="w-12 h-12 object-cover rounded" 
                  />
                ) : (
                  <span>{getFileIcon(fileData.type)}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {fileData.file.name}
                </p>
                <p className="text-xs text-gray-500">
                  {(fileData.file.size / 1024).toFixed(1)} KB • {fileData.file.type || 'Неизвестный формат'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveFile(index)}
                className="ml-2 text-red-500 hover:text-red-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ))}

          {/* Кнопка выбора файлов */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-orange-500 transition-colors"
          >
            <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
            <p className="text-gray-600">Нажмите, чтобы выбрать файлы</p>
            <p className="text-sm text-gray-500 mt-1">JPG, PNG, PDF до 25MB</p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading || selectedFiles.length === 0}
            className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
          >
            {uploading ? 'Загрузка...' : 'Сохранить'}
          </button>
        </div>
      </form>
    </div>
  );
}