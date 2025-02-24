import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Save, X, GripVertical, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Exercise {
  id: string;
  name: string;
  video_url?: string;
}

interface ExerciseSet {
  set_number: number;
  reps: string;
  weight?: string;
}

interface ProgramExercise {
  exercise_id: string;
  exercise_order: number;
  notes?: string;
  sets: ExerciseSet[];
}

interface ProgramBuilderProps {
  programId?: string;
  clientId: string;
  onSave: () => void;
  onCancel: () => void;
}

export function ProgramBuilder({ programId, clientId, onSave, onCancel }: ProgramBuilderProps) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [programExercises, setProgramExercises] = useState<ProgramExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [programTitle, setProgramTitle] = useState('');
  const [programDescription, setProgramDescription] = useState('');

  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true);
        await fetchExercises();
        if (programId) {
          await fetchProgramDetails();
        }
      } catch (error) {
        console.error('Error initializing data:', error);
        toast.error('Ошибка при загрузке данных');
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [programId]);

  const fetchExercises = async () => {
    try {
      const { data, error } = await supabase
        .from('strength_exercises')
        .select('*')
        .order('name');

      if (error) throw error;
      setExercises(data || []);
    } catch (error: any) {
      console.error('Error fetching exercises:', error);
      throw error;
    }
  };

  const fetchProgramDetails = async () => {
    try {
      const { data: programData, error: programError } = await supabase
        .from('training_programs')
        .select('*')
        .eq('id', programId)
        .single();

      if (programError) throw programError;

      setProgramTitle(programData.title);
      setProgramDescription(programData.description || '');

      const { data: exercisesData, error: exercisesError } = await supabase
        .from('program_exercises')
        .select(`
          id,
          exercise_id,
          exercise_order,
          notes,
          exercise_sets (
            set_number,
            reps,
            weight
          )
        `)
        .eq('program_id', programId)
        .order('exercise_order');

      if (exercisesError) throw exercisesError;

      const formattedExercises = exercisesData?.map(exercise => ({
        exercise_id: exercise.exercise_id,
        exercise_order: exercise.exercise_order,
        notes: exercise.notes,
        sets: exercise.exercise_sets || []
      })) || [];

      setProgramExercises(formattedExercises);
    } catch (error: any) {
      console.error('Error fetching program details:', error);
      throw error;
    }
  };

  const handleAddExercise = () => {
    const newExercise: ProgramExercise = {
      exercise_id: '',
      exercise_order: programExercises.length + 1,
      notes: '',
      sets: [{ set_number: 1, reps: '12', weight: '' }]
    };
    setProgramExercises([...programExercises, newExercise]);
  };

  const handleRemoveExercise = (index: number) => {
    const updatedExercises = programExercises.filter((_, i) => i !== index);
    const reorderedExercises = updatedExercises.map((exercise, i) => ({
      ...exercise,
      exercise_order: i + 1,
    }));
    setProgramExercises(reorderedExercises);
  };

  const handleExerciseChange = (index: number, field: keyof ProgramExercise, value: any) => {
    const updatedExercises = [...programExercises];
    updatedExercises[index] = {
      ...updatedExercises[index],
      [field]: value,
    };
    setProgramExercises(updatedExercises);
  };

  const handleAddSet = (exerciseIndex: number) => {
    const updatedExercises = [...programExercises];
    const exercise = updatedExercises[exerciseIndex];
    const newSetNumber = exercise.sets.length + 1;
    exercise.sets.push({
      set_number: newSetNumber,
      reps: '12',
      weight: ''
    });
    setProgramExercises(updatedExercises);
  };

  const handleRemoveSet = (exerciseIndex: number, setIndex: number) => {
    const updatedExercises = [...programExercises];
    const exercise = updatedExercises[exerciseIndex];
    exercise.sets.splice(setIndex, 1);
    // Renumber remaining sets
    exercise.sets = exercise.sets.map((set, idx) => ({
      ...set,
      set_number: idx + 1
    }));
    setProgramExercises(updatedExercises);
  };

  const handleSetChange = (exerciseIndex: number, setIndex: number, field: keyof ExerciseSet, value: string) => {
    const updatedExercises = [...programExercises];
    const exercise = updatedExercises[exerciseIndex];
    exercise.sets[setIndex] = {
      ...exercise.sets[setIndex],
      [field]: value
    };
    setProgramExercises(updatedExercises);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);

      if (!programTitle.trim()) {
        throw new Error('Введите название программы');
      }

      if (programExercises.some(e => !e.exercise_id)) {
        throw new Error('Выберите упражнение для каждой строки');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Не авторизован');

      // Create or update program
      const { data: programData, error: programError } = await supabase
        .from('training_programs')
        .upsert({
          id: programId,
          trainer_id: user.id,
          title: programTitle,
          description: programDescription,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (programError) throw programError;
      if (!programData) throw new Error('Не удалось сохранить программу');

      // Delete existing exercises and sets if updating
      if (programId) {
        const { error: deleteError } = await supabase
          .from('program_exercises')
          .delete()
          .eq('program_id', programId);

        if (deleteError) throw deleteError;
      }

      // Insert program exercises
      for (const exercise of programExercises) {
        const { data: exerciseData, error: exerciseError } = await supabase
          .from('program_exercises')
          .insert({
            program_id: programData.id,
            exercise_id: exercise.exercise_id,
            exercise_order: exercise.exercise_order,
            notes: exercise.notes
          })
          .select()
          .single();

        if (exerciseError) throw exerciseError;
        if (!exerciseData) throw new Error('Не удалось сохранить упражнение');

        // Insert sets for this exercise
        const setsToInsert = exercise.sets.map(set => ({
          program_exercise_id: exerciseData.id,
          set_number: set.set_number,
          reps: set.reps,
          weight: set.weight
        }));

        const { error: setsError } = await supabase
          .from('exercise_sets')
          .insert(setsToInsert);

        if (setsError) throw setsError;
      }

      // Assign program to client if new
      if (!programId) {
        const { error: assignError } = await supabase
          .from('client_programs')
          .insert({
            client_id: clientId,
            program_id: programData.id,
            status: 'active'
          });

        if (assignError) throw assignError;
      }

      toast.success(programId ? 'Программа обновлена' : 'Программа создана');
      onSave();
    } catch (error: any) {
      console.error('Error saving program:', error);
      toast.error(error.message || 'Ошибка при сохранении программы');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-gray-800">
          {programId ? 'Редактирование программы' : 'Новая программа'}
        </h3>
        <button
          onClick={onCancel}
          className="text-gray-600 hover:text-gray-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Название программы
          </label>
          <input
            type="text"
            value={programTitle}
            onChange={(e) => setProgramTitle(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="Например: Начальная программа силовых тренировок"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Описание программы
          </label>
          <textarea
            value={programDescription}
            onChange={(e) => setProgramDescription(e.target.value)}
            rows={3}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="Опишите цели и особенности программы"
          />
        </div>

        <div className="space-y-4">
          {programExercises.map((exercise, exerciseIndex) => (
            <div key={exerciseIndex} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
              <GripVertical className="w-5 h-5 text-gray-400 mt-2" />
              
              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Упражнение
                    </label>
                    <select
                      value={exercise.exercise_id}
                      onChange={(e) => handleExerciseChange(exerciseIndex, 'exercise_id', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="">Выберите упражнение</option>
                      {exercises.map((ex) => (
                        <option key={ex.id} value={ex.id}>
                          {ex.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Заметки
                    </label>
                    <input
                      type="text"
                      value={exercise.notes || ''}
                      onChange={(e) => handleExerciseChange(exerciseIndex, 'notes', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Дополнительные указания"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-sm font-medium text-gray-700">
                      Подходы
                    </label>
                    <button
                      type="button"
                      onClick={() => handleAddSet(exerciseIndex)}
                      className="text-orange-500 hover:text-orange-600 text-sm"
                    >
                      + Добавить подход
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {exercise.sets.map((set, setIndex) => (
                      <div key={setIndex} className="flex items-center gap-4">
                        <div className="w-12 text-sm text-gray-500 text-center">
                          #{set.set_number}
                        </div>
                        <div className="flex-1">
                          <input
                            type="text"
                            value={set.reps}
                            onChange={(e) => handleSetChange(exerciseIndex, setIndex, 'reps', e.target.value)}
                            placeholder="12 или 8-12"
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          />
                        </div>
                        <div className="flex-1">
                          <input
                            type="text"
                            value={set.weight || ''}
                            onChange={(e) => handleSetChange(exerciseIndex, setIndex, 'weight', e.target.value)}
                            placeholder="Вес (кг)"
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveSet(exerciseIndex, setIndex)}
                          className="p-2 text-red-500 hover:text-red-600"
                          disabled={exercise.sets.length === 1}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleRemoveExercise(exerciseIndex)}
                className="p-2 text-red-500 hover:text-red-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddExercise}
            className="flex items-center justify-center w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-500 hover:text-orange-500"
          >
            <Plus className="w-5 h-5 mr-2" />
            Добавить упражнение
          </button>
        </div>

        <div className="mt-6 flex justify-end space-x-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center"
          >
            <Save className="w-5 h-5 mr-2" />
            {saving ? 'Сохранение...' : 'Сохранить программу'}
          </button>
        </div>
      </form>
    </div>
  );
}