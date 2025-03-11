import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, FileText, Image, File } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { safeOpenCamera, isIOSWKWebView } from '../lib/cameraHelper';

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
  const [isIOS, setIsIOS] = useState(false);
  
  // Оптимизация для iOS WKWebView при монтировании компонента
  useEffect(() => {
    console.log('MedicalDataUploadView mounted, isIOSWKWebView:', isIOSWKWebView());
    setIsIOS(isIOSWKWebView());
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      
      // Validate each file
      const validFiles = files.filter(file => {
        // Check file size (25MB)
        if (file.size > 25 * 1024 * 1024) {
          toast.error(`${file.name} превышает допустимый размер 25MB`);
          return false;
        }

        return true;
      });

      // Create previews for valid files
      Promise.all(
        validFiles.map(file => {
          // Determine file type
          let type = 'document';
          if (file.type.startsWith('image/')) {
            type = 'image';
          } else if (file.type === 'application/pdf') {
            type = 'pdf';
          }

          // For images, create preview
          if (type === 'image') {
            return new Promise<FilePreview>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                resolve({
                  file,
                  preview: reader.result as string,
                  type
                });
              };
              reader.readAsDataURL(file);
            });
          }

          // For other files, just return file info
          return Promise.resolve({
            file,
            preview: null,
            type
          });
        })
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

  const handleOpenFileDialog = () => {
    // Используем новую утилиту вместо прямого клика
    safeOpenCamera(fileInputRef, handleFileSelect);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold">Загрузка медицинских документов</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-auto">
          {/* File Previews */}
          <div className="mb-4 space-y-3">
            {selectedFiles.map((file, index) => (
              <div key={index} className="border rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {file.preview ? (
                    <img src={file.preview} alt="Preview" className="w-12 h-12 object-cover rounded" />
                  ) : (
                    <span>{getFileIcon(file.type)}</span>
                  )}
                  <div className="truncate max-w-[150px]">
                    <p className="font-medium truncate">{file.file.name}</p>
                    <p className="text-xs text-gray-500">
                      {(file.file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveFile(index)}
                  className="text-red-500 hover:text-red-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>

          {/* Upload Area */}
          <div
            onClick={handleOpenFileDialog}
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center cursor-pointer hover:border-blue-500 transition-colors"
          >
            <Upload className="w-10 h-10 text-gray-400 mb-2" />
            <p className="text-gray-600">Нажмите, чтобы выбрать файлы</p>
            <p className="text-sm text-gray-400 mt-1">Изображения, PDF, документы до 25MB</p>
            {isIOS && <p className="text-xs text-orange-500 mt-1">* В режиме WKWebView выберите один файл за раз</p>}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            multiple={!isIOS}
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        <div className="p-4 border-t">
          <button
            onClick={handleUpload}
            disabled={uploading || selectedFiles.length === 0}
            className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {uploading ? 'Загрузка...' : 'Загрузить файлы'}
          </button>
        </div>
      </div>
    </div>
  );
}