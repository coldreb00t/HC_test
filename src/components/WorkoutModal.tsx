import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface Client {
  id: string;
  first_name: string;
  last_name: string;
}

interface Workout {
  id: string;
  client_id: string;
  title: string;
  start_time: string;
  end_time: string;
}

interface Program {
  id: string;
  title: string;
  description: string;
  exercises: {
    name: string;
  }[];
}

interface WorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  onWorkoutCreated: () => void;
  workout?: Workout | null;
  program?: Program | null;
  clientId?: string;
}

const WORKING_HOURS = {
  start: 8,
  end: 21
};

export function WorkoutModal({ 
  isOpen, 
  onClose, 
  selectedDate, 
  onWorkoutCreated, 
  workout, 
  program,
  clientId 
}: WorkoutModalProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    clientId: '',
    title: '',
    startTime: '',
    duration: 60,
    date: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchClients();
      if (workout) {
        // If editing, set form data from workout
        const workoutDate = new Date(workout.start_time);
        const startTime = workoutDate.toTimeString().slice(0, 5);
        const endDate = new Date(workout.end_time);
        const duration = (endDate.getTime() - workoutDate.getTime()) / (1000 * 60); // Convert to minutes

        setFormData({
          clientId: workout.client_id,
          title: workout.title,
          startTime: startTime,
          duration: duration,
          date: workoutDate.toISOString().split('T')[0]
        });
      } else {
        // If creating new, set default time to next available hour
        const defaultTime = new Date(selectedDate);
        const currentHour = defaultTime.getHours();
        
        // If current hour is before working hours, set to start of working hours
        // If current hour is after working hours, set to start of working hours next day
        // If current hour is within working hours, use current hour
        let hour = currentHour;
        if (currentHour < WORKING_HOURS.start) {
          hour = WORKING_HOURS.start;
        } else if (currentHour >= WORKING_HOURS.end) {
          hour = WORKING_HOURS.start;
          defaultTime.setDate(defaultTime.getDate() + 1);
        }
        
        defaultTime.setHours(hour, 0, 0, 0);
        
        setFormData({
          clientId: clientId || '',
          title: program ? `Тренировка: ${program.title}` : 'Персональная тренировка',
          startTime: defaultTime.toTimeString().slice(0, 5),
          duration: 60,
          date: defaultTime.toISOString().split('T')[0]
        });
      }
    }
  }, [isOpen, selectedDate, workout, program, clientId]);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('client_profiles')
        .select('id, first_name, last_name')
        .order('first_name');

      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      toast.error('Ошибка при загрузке списка клиентов');
      console.error('Error fetching clients:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('Пользователь не аутентифицирован');

      const [hours, minutes] = formData.startTime.split(':');
      const startDateTime = new Date(formData.date);
      startDateTime.setHours(parseInt(hours), parseInt(minutes));

      // Validate working hours
      const startHour = startDateTime.getHours();
      if (startHour < WORKING_HOURS.start || startHour >= WORKING_HOURS.end) {
        throw new Error(`Время тренировки должно быть между ${WORKING_HOURS.start}:00 и ${WORKING_HOURS.end}:00`);
      }

      const endDateTime = new Date(startDateTime);
      endDateTime.setMinutes(endDateTime.getMinutes() + formData.duration);

      // Validate end time
      const endHour = endDateTime.getHours();
      if (endHour >= WORKING_HOURS.end) {
        throw new Error(`Тренировка должна закончиться до ${WORKING_HOURS.end}:00`);
      }

      if (workout) {
        // Update existing workout
        const { error: updateError } = await supabase
          .from('workouts')
          .update({
            client_id: formData.clientId,
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
            title: formData.title || 'Персональная тренировка',
          })
          .eq('id', workout.id);

        if (updateError) throw updateError;
        toast.success('Тренировка обновлена');
      } else {
        // Create new workout
        const { error: insertError } = await supabase
          .from('workouts')
          .insert({
            client_id: formData.clientId,
            trainer_id: user.id,
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
            title: formData.title || 'Персональная тренировка',
          });

        if (insertError) throw insertError;
        toast.success('Тренировка запланирована');
      }

      onWorkoutCreated();
      onClose();
    } catch (error: any) {
      console.error('Error managing workout:', error);
      toast.error(error.message || 'Ошибка при сохранении тренировки');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Generate time options for the select
  const timeOptions = [];
  for (let hour = WORKING_HOURS.start; hour < WORKING_HOURS.end; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeOptions.push(time);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X size={24} />
        </button>

        <h2 className="text-xl font-semibold mb-4">
          {workout ? 'Редактировать тренировку' : 'Запланировать тренировку'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Клиент
            </label>
            <select
              required
              value={formData.clientId}
              onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              disabled={!!clientId}
            >
              <option value="">Выберите клиента</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.first_name} {client.last_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Название тренировки
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Персональная тренировка"
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Дата
            </label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Время начала
            </label>
            <select
              required
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              {timeOptions.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Длительность (минут)
            </label>
            <select
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="30">30 минут</option>
              <option value="45">45 минут</option>
              <option value="60">1 час</option>
              <option value="90">1.5 часа</option>
              <option value="120">2 часа</option>
            </select>
          </div>

          {program && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-700 mb-2">Упражнения:</h3>
              <ul className="list-disc list-inside text-sm text-gray-600">
                {program.exercises.map((exercise, index) => (
                  <li key={index}>{exercise.name}</li>
                ))}
              </ul>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600 transition-colors duration-300 disabled:opacity-50"
          >
            {loading ? 'Сохранение...' : (workout ? 'Сохранить изменения' : 'Сохранить')}
          </button>
        </form>
      </div>
    </div>
  );
}