import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Scale } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Measurement {
  id: string;
  date: string;
  weight: number;
  height: number;
  chest: number;
  waist: number;
  hips: number;
  biceps: number;
  [key: string]: any;
}

interface BodyMeasurement {
  measurement_id: number;
  user_id: string;
  measurement_date: string;
  age: number | null;
  gender: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  bmi: number | null;
  body_fat_percent: number | null;
  fat_mass_kg: number | null;
  skeletal_muscle_mass_kg: number | null;
  visceral_fat_level: number | null;
  basal_metabolic_rate_kcal: number | null;
  inbody_score: number | null;
  notes: string | null;
  file_id: number | null;
}

interface BodyCompositionData {
  date: string;
  bodyFatPercentage: number | null;
  muscleMass: number | null;
  waterPercentage: number | null;
  bmi: number | null;
  visceralFatLevel: number | null;
  inbodyScore: number | null;
}

interface BodyCompositionTabProps {
  clientId: string;
  measurements: Measurement[];
  bodyMeasurements: BodyMeasurement[] | null | undefined;
}

export default function BodyCompositionTab({ clientId, measurements, bodyMeasurements }: BodyCompositionTabProps) {
  const navigate = useNavigate();
  const [bodyComposition, setBodyComposition] = useState<BodyCompositionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    measurementDate: '',
    age: '',
    gender: 'M' as const, // 'M' или 'F'
    heightCm: '',
    weightKg: '',
    bodyFatPercent: '',
    muscleMassKg: '',
    visceralFatLevel: '',
    bmi: '',
    inbodyScore: '',
    notes: '',
  });

  useEffect(() => {
    fetchBodyCompositionData();
  }, [clientId, measurements, bodyMeasurements]);

  const fetchBodyCompositionData = async () => {
    try {
      setLoading(true);

      // Используем существующие данные из body_measurements или measurements
      const compositionData = [...(bodyMeasurements || [])].map(measurement => ({
        date: new Date(measurement.measurement_date).toLocaleDateString('ru-RU'),
        bodyFatPercentage: measurement.body_fat_percent || null,
        muscleMass: measurement.skeletal_muscle_mass_kg || null,
        waterPercentage: null, // Устанавливаем null, если данные отсутствуют
        bmi: measurement.bmi || null,
        visceralFatLevel: measurement.visceral_fat_level || null,
        inbodyScore: measurement.inbody_score || null,
      }));

      // Если body_measurements пуст, пытаемся вычислить на основе measurements
      if (compositionData.length === 0 && measurements.length > 0) {
        compositionData.push(...measurements.map(measurement => {
          const weight = measurement.weight || 0;
          const height = measurement.height || 0;
          const waist = measurement.waist || 0;

          const bmi = weight > 0 && height > 0 ? (weight / ((height / 100) * (height / 100))) : null;
          const bodyFatPercentage = calculateBodyFatPercentage(weight, height, waist);
          const muscleMass = weight > 0 ? weight * 0.4 : null; // Устанавливаем null, если вес = 0
          const waterPercentage = weight > 0 ? weight * 0.6 : null; // Устанавливаем null, если вес = 0

          return {
            date: new Date(measurement.date).toLocaleDateString('ru-RU'),
            bodyFatPercentage,
            muscleMass,
            waterPercentage,
            bmi,
            visceralFatLevel: null, // Можно добавить логику
            inbodyScore: null, // Можно добавить логику
          };
        }));
      }

      setBodyComposition(compositionData);
    } catch (error: any) {
      console.error('Error fetching body composition data:', error);
      toast.error('Ошибка при загрузке данных о составе тела');
    } finally {
      setLoading(false);
    }
  };

  // Простая формула для расчёта процента жира (пример, замените на реальную)
  const calculateBodyFatPercentage = (weight: number, height: number, waist: number): number | null => {
    if (weight <= 0 || height <= 0 || waist <= 0) return null;
    // Пример формулы (U.S. Navy): для мужчин
    const bmi = weight / ((height / 100) * (height / 100));
    const bodyFat = (1.082 * bmi - 0.01295 * waist - 98.42) / 100;
    return Math.max(0, Math.min(100, bodyFat * 100)); // Ограничиваем диапазон 0-100%
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);

      // Получаем текущего пользователя
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('Пользователь не авторизован');

      const measurementData = {
        user_id: user.id, // Теперь безопасно, так как user не null
        client_id: clientId, // Используем ID клиента из параметров
        measurement_date: new Date(formData.measurementDate).toISOString(),
        age: formData.age ? parseInt(formData.age, 10) : null,
        gender: formData.gender || null,
        height_cm: formData.heightCm ? parseFloat(formData.heightCm) : null,
        weight_kg: formData.weightKg ? parseFloat(formData.weightKg) : null,
        bmi: formData.bmi ? parseFloat(formData.bmi) : null,
        body_fat_percent: formData.bodyFatPercent ? parseFloat(formData.bodyFatPercent) : null,
        fat_mass_kg: formData.weightKg && formData.bodyFatPercent 
          ? parseFloat(formData.weightKg) * (parseFloat(formData.bodyFatPercent) / 100) 
          : null,
        skeletal_muscle_mass_kg: formData.muscleMassKg ? parseFloat(formData.muscleMassKg) : null,
        visceral_fat_level: formData.visceralFatLevel ? parseInt(formData.visceralFatLevel, 10) : null,
        basal_metabolic_rate_kcal: null, // Можно добавить позже
        inbody_score: formData.inbodyScore ? parseInt(formData.inbodyScore, 10) : null,
        notes: formData.notes || null,
        file_id: null, // Ручной ввод, файл отсутствует
      };

      const { error } = await supabase
        .from('body_measurements')
        .insert(measurementData);

      if (error) throw error;

      // Сбрасываем форму
      setFormData({
        measurementDate: '',
        age: '',
        gender: 'M',
        heightCm: '',
        weightKg: '',
        bodyFatPercent: '',
        muscleMassKg: '',
        visceralFatLevel: '',
        bmi: '',
        inbodyScore: '',
        notes: '',
      });

      // Обновляем данные
      await fetchBodyCompositionData();
      toast.success('Данные о составе тела сохранены');
    } catch (error: any) {
      console.error('Error saving body measurement:', error);
      toast.error(error.message || 'Ошибка при сохранении данных');
    } finally {
      setLoading(false);
    }
  };

  const renderBodyCompositionChart = (data: BodyCompositionData[], field: 'bodyFatPercentage' | 'muscleMass' | 'waterPercentage' | 'bmi' | 'visceralFatLevel' | 'inbodyScore', title: string, unit: string, color: string) => {
    const validData = data.filter(item => item[field] !== null).map(item => ({
      date: item.date,
      value: item[field] as number,
    }));

    if (validData.length === 0) return null;

    return (
      <div className="mt-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">{title}</h4>
        <ResponsiveContainer width="100%" height={200}>
          <RechartsLineChart data={validData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis unit={` ${unit}`} />
            <Tooltip formatter={(value: number) => `${value} ${unit}`} />
            <Legend />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              name={title.split(' ')[1]}
              activeDot={{ r: 8 }}
            />
          </RechartsLineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const renderBodyCompositionTable = () => (
    <div className="overflow-x-auto mb-4">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-gray-50">
            <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Дата</th>
            <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Вес (кг)</th>
            <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Процент жира (%)</th>
            <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Мышечная масса (кг)</th>
            <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Вода (%)</th>
            <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ИМТ</th>
            <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Жир в брюшной полости</th>
            <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Оценка InBody</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {bodyComposition.map((item, index) => {
            // Преобразуем item.date в ISO-дату для сравнения (убираем время)
            const itemDate = new Date(item.date.split('.').reverse().join('-')).toISOString().split('T')[0];

            // Находим соответствующую запись в bodyMeasurements по дате
            const bodyMeasurement = bodyMeasurements?.find(m => 
              new Date(m.measurement_date).toISOString().split('T')[0] === itemDate
            );
            
            // Находим соответствующую запись в measurements по дате
            const measurement = measurements?.find(m => 
              new Date(m.date).toISOString().split('T')[0] === itemDate
            );

            // Получаем вес, приоритизируя bodyMeasurements
            const weight = bodyMeasurement?.weight_kg || measurement?.weight || null;

            return (
              <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="py-2 px-3 text-sm">{item.date}</td>
                <td className="py-2 px-3 text-sm">{weight?.toFixed(1) || '-'}</td>
                <td className="py-2 px-3 text-sm">{item.bodyFatPercentage?.toFixed(1) || '-'}</td>
                <td className="py-2 px-3 text-sm">{item.muscleMass?.toFixed(1) || '-'}</td>
                <td className="py-2 px-3 text-sm">{item.waterPercentage?.toFixed(1) || '-'}</td>
                <td className="py-2 px-3 text-sm">{item.bmi?.toFixed(1) || '-'}</td>
                <td className="py-2 px-3 text-sm">{item.visceralFatLevel || '-'}</td>
                <td className="py-2 px-3 text-sm">{item.inbodyScore || '-'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center mb-4">
            <Scale className="w-5 h-5 text-gray-500 mr-2" />
            <h3 className="font-semibold">Состав тела</h3>
          </div>

          {/* Форма для ручного ввода */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Ручной ввод данных о составе тела</h4>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Дата измерения</label>
                  <input
                    type="date"
                    name="measurementDate"
                    value={formData.measurementDate}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Возраст</label>
                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                    placeholder="Например, 26"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Пол</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                  >
                    <option value="M">Мужской</option>
                    <option value="F">Женский</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Рост (см)</label>
                  <input
                    type="number"
                    name="heightCm"
                    value={formData.heightCm}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                    placeholder="Например, 163"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Вес (кг)</label>
                  <input
                    type="number"
                    name="weightKg"
                    value={formData.weightKg}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                    placeholder="Например, 72.7"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Процент жира (%)</label>
                  <input
                    type="number"
                    name="bodyFatPercent"
                    value={formData.bodyFatPercent}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                    placeholder="Например, 26.1"
                    required
                  />
                </div>  
                <div>
                  <label className="block text-sm font-medium text-gray-700">Мышечная масса (кг)</label>
                  <input
                    type="number"
                    name="muscleMassKg"
                    value={formData.muscleMassKg}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                    placeholder="Например, 29.9"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Жир в брюшной полости</label>
                  <input
                    type="number"
                    name="visceralFatLevel"
                    value={formData.visceralFatLevel}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                    placeholder="Например, 7"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">ИМТ</label>
                  <input
                    type="number"
                    name="bmi"
                    value={formData.bmi}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                    placeholder="Например, 27.3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Оценка InBody</label>
                  <input
                    type="number"
                    name="inbodyScore"
                    value={formData.inbodyScore}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                    placeholder="Например, 87"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Примечания</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                    placeholder="Дополнительные заметки"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                Сохранить данные
              </button>
            </form>
          </div>

          {renderBodyCompositionTable()}

          {renderBodyCompositionChart(bodyComposition, 'bodyFatPercentage', 'Процент жира', '%', '#ff7300')}
          {renderBodyCompositionChart(bodyComposition, 'muscleMass', 'Мышечная масса', 'кг', '#387908')}
          {renderBodyCompositionChart(bodyComposition, 'waterPercentage', 'Вода', '%', '#8884d8')}
          {renderBodyCompositionChart(bodyComposition, 'bmi', 'Индекс массы тела', '', '#00c49f')}
          {renderBodyCompositionChart(bodyComposition, 'visceralFatLevel', 'Жир в брюшной полости', '', '#ff0000')}
          {renderBodyCompositionChart(bodyComposition, 'inbodyScore', 'Оценка InBody', '', '#0000ff')}
        </div>
      )}
    </div>
  );
}