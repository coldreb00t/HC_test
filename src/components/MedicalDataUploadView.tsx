import React, { useState, useRef } from 'react';
import { Upload, X, FileText, Image, File } from 'lucide-react';
import { supabase } from '../lib/supabase';
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
  const [selectedFiles, setSelectedFiles] = useState<FilePreview[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    try {
      setUploading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get client id
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (clientError) throw clientError;

      const uploadPromises = selectedFiles.map(async ({ file }) => {
        const timestamp = Date.now();
        const filename = `${clientData.id}-${timestamp}-${file.name}`;
        const path = `medical-documents/${clientData.id}/${filename}`;

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(path, file);

        if (uploadError) throw uploadError;

        // Get public URL for file
        const { data: { publicUrl } } = supabase.storage
          .from('documents')
          .getPublicUrl(path);

        return {
          url: publicUrl,
          filename: file.name,
          type: file.type
        };
      });

      const uploadedFiles = await Promise.all(uploadPromises);

      // Add records to medical_data table
      const { error: insertError } = await supabase
        .from('medical_data')
        .insert(
          uploadedFiles.map(file => ({
            client_id: clientData.id,
            file_url: file.url,
            file_name: file.filename,
            file_type: file.type,
            upload_date: new Date().toISOString()
          }))
        );

      if (insertError) throw insertError;

      toast.success('Файлы успешно загружены');
      onUploadSuccess();
      onClose();

    } catch (error: any) {
      console.error('Error uploading files:', error);
      toast.error('Ошибка при загрузке файлов');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'image':
        return <Image className="w-12 h-12 text-blue-500" />;
      case 'pdf':
        return <FileText className="w-12 h-12 text-red-500" />;
      default:
        return <File className="w-12 h-12 text-gray-500" />;
    }
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
                    getFileIcon(file.type)
                  )}
                  <div className="truncate max-w-[150px]">
                    <p className="font-medium truncate">{file.file.name}</p>
                    <p className="text-xs text-gray-500">
                      {Math.round(file.file.size / 1024)} KB
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
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center cursor-pointer hover:border-blue-500 transition-colors"
          >
            <Upload className="w-10 h-10 text-gray-400 mb-2" />
            <p className="text-gray-600">Нажмите, чтобы выбрать файлы</p>
            <p className="text-sm text-gray-400 mt-1">Изображения, PDF, документы до 25MB</p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
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