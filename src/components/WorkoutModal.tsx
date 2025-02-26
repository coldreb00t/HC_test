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
  }, [isOpen, selectedDate, workout, program