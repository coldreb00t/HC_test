import React, { useState } from 'react';
import { X, Save, Scale } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface MeasurementsInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
}

interface MeasurementData {
  weight: string;
  height: string;
  
  // Верхняя часть тела
  bicepsRight: string;
  bicepsLeft: string;
  chest: string;
  wristRight: string;
  wristLeft: string;
  
  // Средняя часть тела
  waist: string;
  stomach: string;
  
  // Нижняя часть тела
  pelvis: string;
  thighRight: string;
  thighLeft: string;
  calfRight: string;
  calfLeft: string;
}

export function MeasurementsInputModal({ isOpen, onClose, onSave }: MeasurementsInputModalProps) {
  const [loading, setLoading] = useState(false);
  const [measurements, setMeasurements] = useState<MeasurementData>({
    // Основные параметры
    weight: '',
    height: '',

    // Верхняя часть тела
    bicepsRight: '',
    bicepsLeft: '',
    chest: '',
    wristRight: '',
    wristLeft: '',
    
    // Средняя часть тела
    waist: '',
    stomach: '',
    
    // Нижняя часть тела
    pelvis: '',
    thighRight: '',
    thighLeft: '',
    calfRight: '',
    calfLeft: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Валидация - разрешаем только числа с одним десятичным знаком
    if (value === '' || /^\d+(\.\d{0,1})?$/.test(value)) {
      setMeasurements(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      // Получаем текущего пользователя
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      // Получаем профиль клиента
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (clientError) throw clientError;

      // Преобразуем строки в числа, используя null для пустых значений
      const measurementsData = {
        client_id: clientData.id,
        date: new Date().toISOString(),
        
        // Основные параметры
        weight: measurements.weight ? parseFloat(measurements.weight) : null,
        height: measurements.height ? parseFloat(measurements.height) : null,
  
        // Верхняя часть тела
        biceps_right: measurements.bicepsRight ? parseFloat(measurements.bicepsRight) : null,
        biceps_left: measurements.bicepsLeft ? parseFloat(measurements.bicepsLeft) : null,
        chest: measurements.chest ? parseFloat(measurements.chest) : null,
        wrist_right: measurements.wristRight ? parseFloat(measurements.wristRight) : null,
        wrist_left: measurements.wristLeft ? parseFloat(measurements.wristLeft) : null,
        
        // Средняя часть тела
        waist: measurements.waist ? parseFloat(measurements.waist) : null,
        stomach: measurements.stomach ? parseFloat(measurements.stomach) : null,
        
        // Нижняя часть тела
        pelvis: measurements.pelvis ? parseFloat(measurements.pelvis) : null,
        thigh_right: measurements.thighRight ? parseFloat(measurements.thighRight) : null,
        thigh_left: measurements.thighLeft ? parseFloat(measurements.thighLeft) : null,
        calf_right: measurements.calfRight ? parseFloat(measurements.calfRight) : null,
        calf_left: measurements.calfLeft ? parseFloat(measurements.calfLeft) : null
      };

      // Вставляем данные в базу
      const { error: insertError } = await supabase
        .from('client_measurements')
        .insert(measurementsData);

      if (insertError) throw insertError;

      toast.success('Замеры сохранены');
      if (onSave) onSave();
      onClose();
    } catch (error: any) {
      console.error('Ошибка при сохранении замеров:', error);
      toast.error('Ошибка при сохранении замеров');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">Ввод замеров тела</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        
        <div className="p-4 max-h-[80vh] overflow-y-auto">
          {/* Основные параметры */}
          <h3 className="text-md font-medium text-gray-700 mb-3 border-b pb-2">Основные параметры</h3>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Вес (кг)</label>
              <div className="relative">
                <input
                  type="text"
                  name="weight"
                  value={measurements.weight}
                  onChange={handleChange}
                  placeholder="0.0"
                  className="w-full p-2 pl-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <Scale className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Рост (см)</label>
              <div className="relative">
                <input
                  type="text"
                  name="height"
                  value={measurements.height}
                  onChange={handleChange}
                  placeholder="0.0"
                  className="w-full p-2 pl-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <Scale className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Верхняя часть тела */}
          <div className="mb-6">
            <h3 className="text-md font-medium text-gray-700 mb-3 border-b pb-2">Верхняя часть тела</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Бицепс (П) (см)</label>
                <input
                  type="text"
                  name="bicepsRight"
                  value={measurements.bicepsRight}
                  onChange={handleChange}
                  placeholder="0.0"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Бицепс (Л) (см)</label>
                <input
                  type="text"
                  name="bicepsLeft"
                  value={measurements.bicepsLeft}
                  onChange={handleChange}
                  placeholder="0.0"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Запястье (П) (см)</label>
                <input
                  type="text"
                  name="wristRight"
                  value={measurements.wristRight}
                  onChange={handleChange}
                  placeholder="0.0"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Запястье (Л) (см)</label>
                <input
                  type="text"
                  name="wristLeft"
                  value={measurements.wristLeft}
                  onChange={handleChange}
                  placeholder="0.0"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Грудь (см)</label>
                <input
                  type="text"
                  name="chest"
                  value={measurements.chest}
                  onChange={handleChange}
                  placeholder="0.0"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Средняя часть тела */}
            <h3 className="text-md font-medium text-gray-700 mb-3 border-b pb-2">Средняя часть тела</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Талия (см)</label>
                <input
                  type="text"
                  name="waist"
                  value={measurements.waist}
                  onChange={handleChange}
                  placeholder="0.0"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Живот (см)</label>
                <input
                  type="text"
                  name="stomach"
                  value={measurements.stomach}
                  onChange={handleChange}
                  placeholder="0.0"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Нижняя часть тела */}
            <h3 className="text-md font-medium text-gray-700 mb-3 border-b pb-2">Нижняя часть тела</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Таз (см)</label>
                <input
                  type="text"
                  name="pelvis"
                  value={measurements.pelvis}
                  onChange={handleChange}
                  placeholder="0.0"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Бедро (П) (см)</label>
                <input
                  type="text"
                  name="thighRight"
                  value={measurements.thighRight}
                  onChange={handleChange}
                  placeholder="0.0"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Бедро (Л) (см)</label>
                <input
                  type="text"
                  name="thighLeft"
                  value={measurements.thighLeft}
                  onChange={handleChange}
                  placeholder="0.0"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Голень (П) (см)</label>
                <input
                  type="text"
                  name="calfRight"
                  value={measurements.calfRight}
                  onChange={handleChange}
                  placeholder="0.0"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Голень (Л) (см)</label>
                <input
                  type="text"
                  name="calfLeft"
                  value={measurements.calfLeft}
                  onChange={handleChange}
                  placeholder="0.0"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {loading ? 'Сохранение...' : 'Сохранить замеры'}
          </button>
        </div>
      </div>
    </div>
  );
}