import React, { useState, useEffect } from 'react';
import { X, Info, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface Client {
  id: string;
  first_name: string;
  last_name: string;
}

interface Program {
  id: string;
  title: string;
  description?: string;
  exercises: {
    id: string;
    name: string;
    description?: string;
    sets: {
      set_number: number;
      reps: string;
      weight: string;
    }[];
    notes?: string;
  }[];
}

interface Workout {
  id: string;
  client_id: string;
  title: string;
  start_time: string;
  end_time: string;
  training_program_id?: string;
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
  end: 21,
};

export function WorkoutModal({
  isOpen,
  onClose,
  selectedDate,
  onWorkoutCreated,
  workout,
  program,
  clientId,
}: WorkoutModalProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(false);
  const [programLoading, setProgramLoading] = useState(false);
  const [formData, setFormData] = useState({
    clientId: '',
    title: '',
    startTime: '',
    duration: 60,
    date: '',
    programId: '',
  });
  const [clientPrograms, setClientPrograms] = useState<Program[]>([]);
  const [showProgramWarning, setShowProgramWarning] = useState(false);

  useEffect(() => {
    if (isOpen) {
      console.log('WorkoutModal opened with selectedDate:', selectedDate);
      fetchClients();
      fetchPrograms();
      setShowProgramWarning(false);

      const initializeForm = async () => {
        if (clientId && !workout) {
          const { data, error } = await supabase
            .from('client_profiles')
            .select('id, first_name, last_name')
            .eq('id', clientId)
            .single();

          if (error) {
            console.error('Error fetching client:', error);
            toast.error('Ошибка при загрузке данных клиента');
          } else {
            setSelectedClient(data);
          }
        }

        if (workout) {
          const workoutDate = new Date(workout.start_time);
          const startTime = workoutDate.toTimeString().slice(0, 5);
          const endDate = new Date(workout.end_time);
          const duration = (endDate.getTime() - workoutDate.getTime()) / (1000 * 60);

          setFormData({
            clientId: workout.client_id,
            title: workout.title,
            startTime: startTime,
            duration: duration,
            date: workoutDate.toISOString().split('T')[0],
            programId: workout.training_program_id || '',
          });

          const { data, error } = await supabase
            .from('client_profiles')
            .select('id, first_name, last_name')
            .eq('id', workout.client_id)
            .single();

          if (error) {
            console.error('Error fetching client for workout:', error);
          } else {
            setSelectedClient(data);
          }

          if (workout.client_id) {
            fetchClientPrograms(workout.client_id);
          }
        } else {
          const defaultTime = new Date(selectedDate);
          console.log('Default time before adjustment:', defaultTime);
          const currentHour = defaultTime.getHours();
          let hour = currentHour;
          if (currentHour < WORKING_HOURS.start) {
            hour = WORKING_HOURS.start;
          } else if (currentHour >= WORKING_HOURS.end) {
            hour = WORKING_HOURS.start;
            defaultTime.setDate(defaultTime.getDate() + 1);
          }
          defaultTime.setHours(hour, 0, 0, 0);
          console.log('Default time after adjustment:', defaultTime);

          setFormData({
            clientId: clientId || '',
            title: program ? `Тренировка: ${program.title}` : 'Персональная тренировка',
            startTime: defaultTime.toTimeString().slice(0, 5),
            duration: 60,
            date: defaultTime.toISOString().split('T')[0],
            programId: program?.id || '',
          });

          if (clientId) {
            fetchClientPrograms(clientId);
          }
        }
      };

      initializeForm();
    }
  }, [isOpen, selectedDate, workout, program, clientId]);

  const fetchClientPrograms = async (clientId: string) => {
    try {
      setProgramLoading(true);
      const { data, error } = await supabase
        .from('client_programs')
        .select(`
          program_id,
          training_programs (
            id, 
            title,
            description
          )
        `)
        .eq('client_id', clientId)
        .eq('status', 'active');

      if (error) throw error;

      const formattedPrograms = data
        ?.filter((item) => item.training_programs)
        .map((item) => ({
          id: item.training_programs.id,
          title: item.training_programs.title,
          description: item.training_programs.description,
          exercises: [],
        })) || [];

      setClientPrograms(formattedPrograms);

      if (formattedPrograms.length === 1 && !formData.programId) {
        updateFormWithProgram(formattedPrograms[0].id);
      }

      setShowProgramWarning(formattedPrograms.length === 0);
    } catch (error: any) {
      console.error('Error fetching client programs:', error);
    } finally {
      setProgramLoading(false);
    }
  };

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

  const fetchPrograms = async () => {
    try {
      const { data, error } = await supabase
        .from('training_programs')
        .select(`
          id,
          title,
          description,
          program_exercises (
            id,
            exercise_order,
            notes,
            strength_exercises (
              id,
              name,
              description
            ),
            exercise_sets (
              set_number,
              reps,
              weight
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedPrograms = data?.map((program) => ({
        id: program.id,
        title: program.title,
        description: program.description,
        exercises: (program.program_exercises || [])
          .sort((a, b) => a.exercise_order - b.exercise_order)
          .map((ex) => ({
            id: ex.strength_exercises.id,
            name: ex.strength_exercises.name,
            description: ex.strength_exercises.description,
            notes: ex.notes,
            sets: (ex.exercise_sets || [])
              .sort((a, b) => a.set_number - b.set_number)
              .map((set) => ({
                set_number: set.set_number,
                reps: set.reps,
                weight: set.weight,
              })),
          })),
      })) || [];

      setPrograms(formattedPrograms);
    } catch (error: any) {
      console.error('Error fetching programs:', error);
      toast.error('Ошибка при загрузке программ тренировок');
    }
  };

  const updateFormWithProgram = (programId: string) => {
    const program = [...programs, ...clientPrograms].find((p) => p.id === programId);
    if (program) {
      setFormData({
        ...formData,
        programId: programId,
        title: `Тренировка: ${program.title}`,
      });
    } else {
      setFormData({
        ...formData,
        programId: programId,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      console.log('User from supabase.auth.getUser():', data);

      // Проверка на наличие валидного trainerId
      const trainerId = data?.user?.id;
      if (!trainerId || typeof trainerId !== 'string' || trainerId.trim() === '') {
        throw new Error('Не удалось определить идентификатор тренера. Пожалуйста, войдите в систему заново.');
      }
      console.log('Trainer ID:', trainerId);

      // Проверка на наличие валидного clientId
      if (!formData.clientId || formData.clientId.trim() === '') {
        throw new Error('Клиент не выбран');
      }
      console.log('Client ID:', formData.clientId);

      if (!formData.date) throw new Error('Дата не указана');
      if (!formData.startTime) throw new Error('Время начала не указано');

      const [hours, minutes] = formData.startTime.split(':');
      const startDateTime = new Date(formData.date);
      console.log('Start date before setting time:', startDateTime);
      startDateTime.setHours(parseInt(hours), parseInt(minutes));
      console.log('Start date after setting time:', startDateTime);

      if (isNaN(startDateTime.getTime())) {
        throw new Error('Некорректное значение даты или времени начала');
      }

      const startHour = startDateTime.getHours();
      if (startHour < WORKING_HOURS.start || startHour >= WORKING_HOURS.end) {
        throw new Error(`Время тренировки должно быть между ${WORKING_HOURS.start}:00 и ${WORKING_HOURS.end}:00`);
      }

      const endDateTime = new Date(startDateTime);
      endDateTime.setMinutes(endDateTime.getMinutes() + formData.duration);
      console.log('End date:', endDateTime);

      if (isNaN(endDateTime.getTime())) {
        throw new Error('Некорректное значение даты или времени окончания');
      }

      const endHour = endDateTime.getHours();
      if (endHour >= WORKING_HOURS.end) {
        throw new Error(`Тренировка должна закончиться до ${WORKING_HOURS.end}:00`);
      }

      const workoutData = {
        client_id: formData.clientId,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        title: formData.title || 'Персональная тренировка',
        training_program_id: formData.programId || null,
        trainer_id: trainerId,
      };

      console.log('Workout data to be sent:', workoutData);

      if (!formData.programId) {
        const confirmNoProgram = window.confirm(
          'Вы не выбрали программу тренировок. Продолжить без программы?'
        );
        if (!confirmNoProgram) {
          setLoading(false);
          return;
        }
      }

      if (workout) {
        const { error: updateError } = await supabase
          .from('workouts')
          .update(workoutData)
          .eq('id', workout.id);

        if (updateError) throw updateError;
        toast.success('Тренировка обновлена');
      } else {
        const { error: insertError } = await supabase
          .from('workouts')
          .insert(workoutData);

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

  const handleClientChange = async (newClientId: string) => {
    setFormData({ ...formData, clientId: newClientId });
    const client = clients.find((c) => c.id === newClientId);
    setSelectedClient(client || null);
    if (newClientId) {
      fetchClientPrograms(newClientId);
    } else {
      setClientPrograms([]);
    }
  };

  if (!isOpen) return null;

  const timeOptions = [];
  for (let hour = WORKING_HOURS.start; hour < WORKING_HOURS.end; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeOptions.push(time);
    }
  }

  const availablePrograms = clientPrograms.length > 0 ? clientPrograms : programs;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Клиент</label>
            {clientId && !selectedClient ? (
              <div className="w-full p-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500">
                Загрузка клиента...
              </div>
            ) : clientId && selectedClient ? (
              <div className="w-full p-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700">
                {selectedClient.first_name} {selectedClient.last_name}
              </div>
            ) : (
              <select
                required
                value={formData.clientId}
                onChange={(e) => handleClientChange(e.target.value)}
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
            )}
          </div>

          <div className="border-2 border-orange-100 rounded-lg p-4 bg-orange-50">
            <label className="block text-sm font-medium text-gray-700 mb-1">Программа тренировки</label>
            {programLoading ? (
              <div className="py-2 text-sm text-gray-500">Загрузка программ...</div>
            ) : (
              <>
                {showProgramWarning && (
                  <div className="flex items-start gap-2 mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-yellow-700">
                      У клиента нет активных программ тренировок. Пожалуйста, создайте программу тренировок для клиента
                      перед планированием тренировки или выберите программу из общего списка.
                    </p>
                  </div>
                )}
                <select
                  value={formData.programId}
                  onChange={(e) => updateFormWithProgram(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">Выберите программу</option>
                  {availablePrograms.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.title}
                    </option>
                  ))}
                </select>
                <div className="flex items-center mt-1 text-xs text-gray-500">
                  <Info className="w-3 h-3 mr-1" />
                  Программа тренировки будет доступна клиенту
                </div>
              </>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Название тренировки</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Персональная тренировка"
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Дата</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Время начала</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Длительность (минут)</label>
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

          {formData.programId && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-700 mb-2">Упражнения:</h3>
              <ul className="list-disc list-inside text-sm text-gray-600">
                {programs
                  .find((p) => p.id === formData.programId)
                  ?.exercises.map((exercise, index) => (
                    <li key={index}>{exercise.name}</li>
                  ))}
                {clientPrograms
                  .find((p) => p.id === formData.programId)
                  ?.exercises.map((exercise, index) => (
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
            {loading ? 'Сохранение...' : workout ? 'Сохранить изменения' : 'Сохранить'}
          </button>
        </form>
      </div>
    </div>
  );
}