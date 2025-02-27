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

interface UploadedFile {
  file_id: number;
  user_id: string;
  file_url: string;
  uploaded_at: string;
  filename: string;
}

interface BodyMeasurement {
  measurement_id: number;
  user_id: string;
  measurement_date: string;
  age: number;
  gender: string;
  height_cm: number;
  weight_kg: number;
  bmi: number;
  body_fat_percent: number;
  fat_mass_kg: number;
  skeletal_muscle_mass_kg: number;
  visceral_fat_level: number;
  basal_metabolic_rate_kcal: number;
  inbody_score: number;
  notes: string;
  file_id: number;
}

interface BodyCompositionData {
  date: string;
  bodyFatPercentage: number | null;
  muscleMass: number | null;
  waterPercentage: number | null; // Можно добавить, если данные доступны
  bmi: number | null;
  visceralFatLevel: number | null;
  inbodyScore: number | null;
}

interface BodyCompositionTabProps {
  clientId: string;
  measurements: Measurement[];
  bodyMeasurements: BodyMeasurement[];
}

export default function BodyCompositionTab({ clientId, measurements, bodyMeasurements }: BodyCompositionTabProps) {
  const navigate = useNavigate();
  const [bodyComposition, setBodyComposition] = useState<BodyCompositionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  useEffect(() => {
    fetchBodyCompositionAndFiles();
  }, [clientId, measurements, bodyMeasurements]);

  const fetchBodyCompositionAndFiles = async () => {
    try {
      setLoading(true);

      // Получаем данные о загруженных файлах
      const { data: files, error: filesError } = await supabase
        .from('uploaded_files')
        .select('*')
        .eq('user_id', clientId)
        .order('uploaded_at', { ascending: true });

      if (filesError) throw filesError;
      setUploadedFiles(files || []);

      // Используем существующие данные из body_measurements или measurements
      const compositionData = [...bodyMeasurements].map(measurement => ({
        date: new Date(measurement.measurement_date).toLocaleDateString('ru-RU'),
        bodyFatPercentage: measurement.body_fat_percent || null,
        muscleMass: measurement.skeletal_muscle_mass_kg || null,
        waterPercentage: null, // Можно добавить, если данные доступны в таблице
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
          const muscleMass = weight * 0.4; // Примерная формула, замените на реальную
          const waterPercentage = weight * 0.6; // Примерная формула

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
      console.error('Error fetching body composition and files:', error);
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

  // Обработка загрузки файла
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);

      // 1. Сохраняем файл в Supabase Storage
      const fileName = `${clientId}-${Date.now()}-${file.name}`;
      const { data, error: storageError } = await supabase.storage
        .from('client-photos')
        .upload(`inbody-reports/${fileName}`, file, {
          upsert: false,
        });

      if (storageError) throw storageError;

      const fileUrl = supabase.storage
        .from('client-photos')
        .getPublicUrl(`inbody-reports/${fileName}`).data.publicUrl;

      // 2. Сохраняем метаданные в таблице uploaded_files
      const { data: fileData, error: fileError } = await supabase
        .from('uploaded_files')
        .insert({
          user_id: clientId,
          file_url: fileUrl,
          uploaded_at: new Date().toISOString(),
          filename: fileName,
        })
        .select('file_id')
        .single();

      if (fileError) throw fileError;

      // 3. Отправляем файл на OCR + GPT для распознавания
      const ocrResult = await processFileWithOCR(fileUrl); // Функция для OCR (нужно реализовать на бэкенде)
      const gptResponse = await processWithGPT(ocrResult); // Функция для обработки через GPT (нужно реализовать)

      // 4. Сохраняем структурированные данные в body_measurements
      await saveBodyMeasurement(clientId, fileData.file_id, gptResponse);

      // 5. Обновляем данные в состоянии
      await fetchBodyCompositionAndFiles();
      toast.success('Файл загружен и обработан');
    } catch (error: any) {
      console.error('Error uploading and processing file:', error);
      toast.error('Ошибка при загрузке файла');
    } finally {
      setLoading(false);
    }
  };

  // Функция для обработки файла через OCR (пример)
  const processFileWithOCR = async (fileUrl: string): Promise<string> => {
    // Здесь должна быть интеграция с OCR (например, Tesseract, Google Cloud Vision)
    // Пример: отправляем файл на сервер, который использует OCR
    // Возвращаем текст, извлечённый из изображения/PDF
    // Это требует бэкенда, поэтому пока возвращаем заглушки
    console.log('Processing file with OCR:', fileUrl);
    return `InBody Report: Weight 72.7 kg, Body Fat 26.1%, Muscle Mass 29.9 kg, Date 2025-02-27, Age 26, Gender F, Height 163 cm, Visceral Fat 7, BMI 27.3, InBody Score 87...`; // Замените на реальную логику
  };

  // Функция для обработки через GPT (пример)
  const processWithGPT = async (text: string): Promise<any> => {
    // Здесь должна быть интеграция с OpenAI API или другой LLM
    // Пример: отправляем текст на GPT с промптом для структурирования
    // Возвращаем JSON с данными
    console.log('Processing with GPT:', text);
    return {
      measurement_date: "2025-02-27T08:26:00",
      age: 26,
      gender: "F",
      height_cm: 163,
      weight_kg: 72.7,
      body_fat_percent: 26.1,
      skeletal_muscle_mass_kg: 29.9,
      visceral_fat_level: 7,
      bmi: 27.3,
      inbody_score: 87,
    }; // Замените на реальную логику с OpenAI API
  };

  // Функция для сохранения данных о составе тела в Supabase
  const saveBodyMeasurement = async (clientId: string, fileId: number, data: any) => {
    const { error } = await supabase
      .from('body_measurements')
      .insert({
        user_id: clientId,
        measurement_date: data.measurement_date,
        age: data.age || null,
        gender: data.gender || null,
        height_cm: data.height_cm || null,
        weight_kg: data.weight_kg || null,
        bmi: data.bmi || null,
        body_fat_percent: data.body_fat_percent || null,
        fat_mass_kg: (data.weight_kg || 0) * (data.body_fat_percent || 0) / 100 || null,
        skeletal_muscle_mass_kg: data.skeletal_muscle_mass_kg || null,
        visceral_fat_level: data.visceral_fat_level || null,
        basal_metabolic_rate_kcal: null, // Можно добавить логику
        inbody_score: data.inbody_score || null,
        notes: null, // Можно добавить
        file_id: fileId,
      });

    if (error) throw error;
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

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      ) : bodyComposition.length > 0 ? (
        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center mb-4">
            <Scale className="w-5 h-5 text-gray-500 mr-2" />
            <h3 className="font-semibold">Состав тела</h3>
          </div>

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
                {bodyComposition.map((item, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="py-2 px-3 text-sm">{item.date}</td>
                    <td className="py-2 px-3 text-sm">{(measurements.find(m => new Date(m.date).toLocaleDateString('ru-RU') === item.date)?.weight || item.bmi)?.toFixed(1) || '-'}</td>
                    <td className="py-2 px-3 text-sm">{item.bodyFatPercentage?.toFixed(1) || '-'}</td>
                    <td className="py-2 px-3 text-sm">{item.muscleMass?.toFixed(1) || '-'}</td>
                    <td className="py-2 px-3 text-sm">{item.waterPercentage?.toFixed(1) || '-'}</td>
                    <td className="py-2 px-3 text-sm">{item.bmi?.toFixed(1) || '-'}</td>
                    <td className="py-2 px-3 text-sm">{item.visceralFatLevel || '-'}</td>
                    <td className="py-2 px-3 text-sm">{item.inbodyScore || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Добавляем интерфейс для загрузки файла */}
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Загрузить новый отчёт InBody</h4>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileUpload}
              className="mb-2"
            />
          </div>

          {renderBodyCompositionChart(bodyComposition, 'bodyFatPercentage', 'Процент жира', '%', '#ff7300')}
          {renderBodyCompositionChart(bodyComposition, 'muscleMass', 'Мышечная масса', 'кг', '#387908')}
          {renderBodyCompositionChart(bodyComposition, 'waterPercentage', 'Вода', '%', '#8884d8')}
          {renderBodyCompositionChart(bodyComposition, 'bmi', 'Индекс массы тела', '', '#00c49f')}
          {renderBodyCompositionChart(bodyComposition, 'visceralFatLevel', 'Жир в брюшной полости', '', '#ff0000')}
          {renderBodyCompositionChart(bodyComposition, 'inbodyScore', 'Оценка InBody', '', '#0000ff')}
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-6 text-center">
          <Scale className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Нет данных о составе тела</p>
          <button
            onClick={() => navigate('/client/body-composition/new')}
            className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Добавить данные о составе тела
          </button>
        </div>
      )}
    </div>
  );
}