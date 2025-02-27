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
  chest: string;
  waist: string;
  hips: string;
  biceps: string;
  calves: string;
}

export function MeasurementsInputModal({ isOpen, onClose, onSave }: MeasurementsInputModalProps) {
  const [loading, setLoading] = useState(false);
  const [measurements, setMeasurements] = useState<MeasurementData>({
    weight: '',
    height: '',
    chest: '',
    waist: '',
    hips: '',
    biceps: '',
    calves: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Позволяем только положительные числа с максимум одним десятичным знаком
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
        chest: measurements.chest ? parseFloat(measurements.chest) : null,
        waist: measurements.waist ? parseFloat(measurements.waist) : null,
        hips: measurements.hips ? parseFloat(measurements.hips) : null,
        biceps: measurements.biceps ? parseFloat(measurements.biceps) : null,
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
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">Ввод замеров тела</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        
        <div className="p-4">
          {/* Вес и Рост */}
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

          {/* Силуэт с замерами */}
          <div className="relative mb-6">
            <div className="aspect-[3/4] w-full bg-gray-50 rounded-lg flex items-center justify-center relative overflow-hidden">
              {/* SVG Силуэт */}
              <svg viewBox="0 0 200 300" className="h-full max-h-[350px] w-auto">
                {/* Человеческий силуэт с лучшими пропорциями */}
                <path d="M100,40 C120,40 135,25 135,0 L65,0 C65,25 80,40 100,40 Z" fill="#e5e7eb" /> {/* Голова */}
                <path d="M85,40 L115,40 L120,140 L80,140 Z" fill="#e5e7eb" /> {/* Торс */}
                <path d="M115,40 L130,45 L150,100 L130,115 L125,105 L130,80 L120,85 L115,65 Z" fill="#e5e7eb" /> {/* Правая рука */}
                <path d="M85,40 L70,45 L50,100 L70,115 L75,105 L70,80 L80,85 L85,65 Z" fill="#e5e7eb" /> {/* Левая рука */}
                <path d="M80,140 L75,240 L65,300 L90,300 L95,190 Z" fill="#e5e7eb" /> {/* Левая нога */}
                <path d="M120,140 L125,240 L135,300 L110,300 L105,190 Z" fill="#e5e7eb" /> {/* Правая нога */}
              </svg>

              {/* Грудь */}
              <div className="absolute top-[25%] left-1/2 transform -translate-x-1/2">
                <div className="bg-white bg-opacity-90 rounded-md shadow p-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Грудь (см)</label>
                  <input
                    type="text"
                    name="chest"
                    value={measurements.chest}
                    onChange={handleChange}
                    placeholder="0.0"
                    className="w-20 p-1 text-xs text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div className="absolute left-1/2 top-0 -translate-x-1/2 w-0.5 h-3 bg-orange-500"></div>
                <div className="absolute left-1/2 top-full -translate-x-1/2 w-0.5 h-3 bg-orange-500"></div>
              </div>

              {/* Талия */}
              <div className="absolute top-[41%] left-1/2 transform -translate-x-1/2">
                <div className="bg-white bg-opacity-90 rounded-md shadow p-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Талия (см)</label>
                  <input
                    type="text"
                    name="waist"
                    value={measurements.waist}
                    onChange={handleChange}
                    placeholder="0.0"
                    className="w-20 p-1 text-xs text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div className="absolute left-1/2 top-0 -translate-x-1/2 w-0.5 h-3 bg-orange-500"></div>
                <div className="absolute left-1/2 top-full -translate-x-1/2 w-0.5 h-3 bg-orange-500"></div>
              </div>

              {/* Бедра */}
              <div className="absolute top-[53%] left-1/2 transform -translate-x-1/2">
                <div className="bg-white bg-opacity-90 rounded-md shadow p-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Бедра (см)</label>
                  <input
                    type="text"
                    name="hips"
                    value={measurements.hips}
                    onChange={handleChange}
                    placeholder="0.0"
                    className="w-20 p-1 text-xs text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div className="absolute left-1/2 top-0 -translate-x-1/2 w-0.5 h-3 bg-orange-500"></div>
                <div className="absolute left-1/2 top-full -translate-x-1/2 w-0.5 h-3 bg-orange-500"></div>
              </div>

              {/* Бицепс */}
              <div className="absolute top-[30%] right-[10%]">
                <div className="bg-white bg-opacity-90 rounded-md shadow p-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Бицепс (см)</label>
                  <input
                    type="text"
                    name="biceps"
                    value={measurements.biceps}
                    onChange={handleChange}
                    placeholder="0.0"
                    className="w-20 p-1 text-xs text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div className="absolute left-1/2 top-full -translate-x-1/2 w-0.5 h-3 bg-orange-500"></div>
              </div>

              {/* Икры */}
              <div className="absolute top-[80%] right-[15%]">
                <div className="bg-white bg-opacity-90 rounded-md shadow p-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Икры (см)</label>
                  <input
                    type="text"
                    name="calves"
                    value={measurements.calves}
                    onChange={handleChange}
                    placeholder="0.0"
                    className="w-20 p-1 text-xs text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div className="absolute left-1/2 top-0 -translate-x-1/2 w-0.5 h-3 bg-orange-500"></div>
              </div>
            </div>
          </div>

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