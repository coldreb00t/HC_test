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
  biceps: string;
  chest: string;
  waist: string;
  hips: string;
  calves: string;
}

export function MeasurementsInputModal({ isOpen, onClose, onSave }: MeasurementsInputModalProps) {
  const [loading, setLoading] = useState(false);
  const [measurements, setMeasurements] = useState<MeasurementData>({
    weight: '',
    height: '',

    biceps: '',
    chest: '',
    waist: '',
    hips: '',
    calves: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Validate input - allow only numbers with up to one decimal place
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
        weight: measurements.weight ? parseFloat(measurements.weight) : null,
        height: measurements.height ? parseFloat(measurements.height) : null,
  
        biceps: measurements.biceps ? parseFloat(measurements.biceps) : null,
        chest: measurements.chest ? parseFloat(measurements.chest) : null,
        waist: measurements.waist ? parseFloat(measurements.waist) : null,
        hips: measurements.hips ? parseFloat(measurements.hips) : null,
        calves: measurements.calves ? parseFloat(measurements.calves) : null
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
          {/* All measurements organized in a simple grid */}
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

          {/* Organized body measurements */}
          <div className="mb-6">
            <h3 className="text-md font-medium text-gray-700 mb-3 border-b pb-2">Верхняя часть тела</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Бицепс (см)</label>
                <input
                  type="text"
                  name="biceps"
                  value={measurements.biceps}
                  onChange={handleChange}
                  placeholder="0.0"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              
              <div>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Бедра (см)</label>
                <input
                  type="text"
                  name="hips"
                  value={measurements.hips}
                  onChange={handleChange}
                  placeholder="0.0"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>

            <h3 className="text-md font-medium text-gray-700 mb-3 border-b pb-2">Нижняя часть тела</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Голень/Икры (см)</label>
                <input
                  type="text"
                  name="calves"
                  value={measurements.calves}
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