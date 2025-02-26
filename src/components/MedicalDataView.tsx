import React, { useState, useEffect } from 'react';
import { FileText, Plus, Download, Trash2, Calendar, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { MedicalDataUploadView } from './MedicalDataUploadView';

interface MedicalFile {
  file_path: string;
  file_name: string;
  original_name: string;
  file_type: string;
  file_size: number;
}

interface MedicalRecord {
  id: string;
  client_id: string;
  category: string;
  description: string;
  date: string;
  files: MedicalFile[];
  created_at: string;
}

interface MedicalDataViewProps {
  clientId: string;
}

export function MedicalDataView({ clientId }: MedicalDataViewProps) {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [expandedRecords, setExpandedRecords] = useState<string[]>([]);

  useEffect(() => {
    fetchMedicalData();
  }, [clientId]);

  const fetchMedicalData = async () => {
    try {
      setLoading(true);
      console.log('Fetching medical data for client:', clientId);

      const { data, error } = await supabase
        .from('client_medical_data')
        .select('*')
        .eq('client_id', clientId)
        .order('date', { ascending: false });

      if (error) throw error;

      console.log('Medical data fetched:', data);
      setRecords(data || []);
    } catch (error: any) {
      console.error('Error fetching medical data:', error);
      toast.error('Ошибка при загрузке медицинских данных');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту запись?')) return;

    try {
      // Получаем данные о файлах перед удалением записи
      const { data: recordData, error: fetchError } = await supabase
        .from('client_medical_data')
        .select('files')
        .eq('id', recordId)
        .single();

      if (fetchError) throw fetchError;

      // Удаляем файлы из хранилища
      if (recordData?.files && recordData.files.length > 0) {
        const filePaths = recordData.files.map((file: MedicalFile) => file.file_path);
        
        const { error: storageError } = await supabase.storage
          .from('client-data')
          .remove(filePaths);

        if (storageError) {
          console.error('Error deleting files:', storageError);
          // Продолжаем даже при ошибке удаления файлов
        }
      }

      // Удаляем запись из БД
      const { error: deleteError } = await supabase
        .from('client_medical_data')
        .delete()
        .eq('id', recordId);

      if (deleteError) throw deleteError;

      toast.success('Запись удалена');
      setRecords(prev => prev.filter(record => record.id !== recordId));
    } catch (error: any) {
      console.error('Error deleting record:', error);
      toast.error('Ошибка при удалении записи');
    }
  };

  const handleDownloadFile = async (file: MedicalFile) => {
    try {
      // Получаем URL для скачивания файла
      const { data, error } = await supabase.storage
        .from('client-data')
        .download(file.file_path);

      if (error) throw error;

      // Создаем blob и ссылку для скачивания
      const blob = new Blob([data]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.original_name || file.file_name;
      document.body.appendChild(a);
      a.click();
      
      // Очищаем ресурсы
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (error: any) {
      console.error('Error downloading file:', error);
      toast.error('Ошибка при скачивании файла');
    }
  };

  const toggleExpandRecord = (recordId: string) => {
    setExpandedRecords(prev => 
      prev.includes(recordId) 
        ? prev.filter(id => id !== recordId) 
        : [...prev, recordId]
    );
  };

  const getCategoryText = (category: string) => {
    const categories: Record<string, string> = {
      blood_test: 'Анализ крови',
      urine_test: 'Анализ мочи',
      mri: 'МРТ',
      xray: 'Рентген',
      ultrasound: 'УЗИ',
      ecg: 'ЭКГ',
      consultation: 'Консультация врача',
      other: 'Другое'
    };
    return categories[category] || category;
  };

  // Определяем иконку для типа файла
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return '📊';
    return '📁';
  };

  // Форматируем размер файла
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Получаем URL для предпросмотра изображения
  const getImagePreviewUrl = async (filePath: string) => {
    const { data: { publicUrl } } = supabase.storage
      .from('client-data')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  if (showUploadForm) {
    return (
      <MedicalDataUploadView
        onClose={() => setShowUploadForm(false)}
        onUploadSuccess={fetchMedicalData}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-gray-800">Медицинские данные</h3>
        <button
          onClick={() => setShowUploadForm(true)}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2 inline-block" />
          Добавить запись
        </button>
      </div>

      {records.length > 0 ? (
        <div className="space-y-4">
          {records.map((record) => (
            <div key={record.id} className="border rounded-lg overflow-hidden">
              {/* Заголовок записи */}
              <div 
                className="bg-gray-50 p-4 flex justify-between items-center cursor-pointer"
                onClick={() => toggleExpandRecord(record.id)}
              >
                <div className="flex-1">
                  <div className="flex items-center">
                    <span className="py-1 px-3 bg-orange-100 text-orange-700 rounded-full text-xs mr-3">
                      {getCategoryText(record.category)}
                    </span>
                    <h4 className="font-medium">
                      {new Date(record.date).toLocaleDateString('ru-RU')}
                    </h4>
                  </div>
                  <p className="text-gray-600 mt-1 line-clamp-1">
                    {record.description}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteRecord(record.id);
                  }}
                  className="p-2 text-red-500 hover:text-red-600 rounded-full hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Содержимое записи (показывается, если запись развернута) */}
              {expandedRecords.includes(record.id) && (
                <div className="p-4 border-t">
                  {/* Полное описание */}
                  <div className="mb-4">
                    <h5 className="font-medium text-gray-700 mb-2">Описание:</h5>
                    <p className="text-gray-600 whitespace-pre-line">{record.description}</p>
                  </div>

                  {/* Список файлов */}
                  {record.files && record.files.length > 0 && (
                    <div>
                      <h5 className="font-medium text-gray-700 mb-2">Файлы:</h5>
                      <div className="space-y-2">
                        {record.files.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center">
                              <span className="text-2xl mr-3">{getFileIcon(file.file_type)}</span>
                              <div>
                                <p className="font-medium text-gray-800">{file.original_name}</p>
                                <p className="text-xs text-gray-500">{formatFileSize(file.file_size)}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleDownloadFile(file)}
                              className="p-2 text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-full"
                              title="Скачать файл"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Предпросмотр изображений (если есть) */}
                  {record.files && record.files.some(file => file.file_type.startsWith('image/')) && (
                    <div className="mt-4">
                      <h5 className="font-medium text-gray-700 mb-2">Предпросмотр изображений:</h5>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {record.files
                          .filter(file => file.file_type.startsWith('image/'))
                          .map((file, index) => {
                            const { data: { publicUrl } } = supabase.storage
                              .from('client-data')
                              .getPublicUrl(file.file_path);
                            
                            return (
                              <a
                                key={index}
                                href={publicUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block aspect-square rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
                              >
                                <img
                                  src={publicUrl}
                                  alt={file.original_name}
                                  className="w-full h-full object-cover"
                                />
                              </a>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">У клиента пока нет медицинских данных</p>
        </div>
      )}
    </div>
  );
}