import { useEffect, useState } from 'react';
import { X, Dumbbell, AlertCircle, Info, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';

// Интерфейсы с явными типами
interface Set {
  set_number: number;
  reps: string;
  weight: string;
}

interface StrengthExercise {
  id: string;
  name: string;
  description?: string;
}

interface ProgramExercise {
  id: string;
  exercise_order: number;
  notes?: string;
  exercise_id: string;
  strength_exercises?: StrengthExercise;
}

interface Exercise {
  id: string;
  name: string;
  description?: string;
  sets: Set[];
  notes?: string;
}

interface Program {
  id: string;
  title: string;
  description?: string;
  exercises: Exercise[];
}

interface WorkoutProgramModalProps {
  isOpen: boolean;
  onClose: () => void;
  program?: Program | null;
  title: string;
  time: string;
  training_program_id?: string;
}

export function WorkoutProgramModal({ isOpen, onClose, program: initialProgram, title, time, training_program_id }: WorkoutProgramModalProps) {
  const [debugMode, setDebugMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [program, setProgram] = useState<Program | null>(initialProgram || null);
  const [error, setError] = useState<string | null>(null);
  
  const toggleDebugMode = () => {
    setDebugMode(!debugMode);
  };

  useEffect(() => {
    const loadProgramData = async () => {
      // Не загружать данные, если program уже есть и это тот же самый training_program_id
      if (!training_program_id || (program && program.id === training_program_id)) return;
      
      try {
        setLoading(true);
        setError(null);
        console.log('Loading program data for ID:', training_program_id);
        
        // Загрузка данных программы
        const { data: programData, error: programError } = await supabase
          .from('training_programs')
          .select('id, title, description')
          .eq('id', training_program_id)
          .single();
          
        if (programError) {
          console.error('Error fetching program data:', programError);
          throw programError;
        }
        if (!programData) {
          console.error('Program not found for ID:', training_program_id);
          throw new Error('Программа не найдена');
        }
        
        console.log('Program data loaded:', programData);
        
        // Загрузка упражнений с явной типизацией
        const { data: exercisesData, error: exercisesError } = await supabase
          .from('program_exercises')
          .select(`
            id,
            exercise_order,
            notes,
            exercise_id,
            strength_exercises (
              id,
              name,
              description
            )
          `)
          .eq('program_id', training_program_id)
          .order('exercise_order') as { data: ProgramExercise[] | null; error: any };
          
        if (exercisesError) {
          console.error('Error fetching exercises:', exercisesError);
          throw exercisesError;
        }
        
        console.log('Exercises data loaded:', exercisesData);
        
        const formattedExercises: Exercise[] = [];
        
        if (exercisesData && exercisesData.length > 0) {
          for (const exercise of exercisesData) {
            try {
              const { data: setsData, error: setsError } = await supabase
                .from('exercise_sets')
                .select('set_number, reps, weight')
                .eq('program_exercise_id', exercise.id)
                .order('set_number');
                
              if (setsError) {
                console.error('Error fetching sets for exercise:', exercise.id, setsError);
                throw setsError;
              }
              
              formattedExercises.push({
                id: exercise.exercise_id,
                name: exercise.strength_exercises?.name || 'Упражнение',
                description: exercise.strength_exercises?.description,
                notes: exercise.notes,
                sets: setsData ? setsData.map(set => ({
                  set_number: set.set_number,
                  reps: set.reps,
                  weight: set.weight || ''
                })) : []
              });
            } catch (exerciseError) {
              console.error('Error processing exercise:', exerciseError);
              // Продолжаем с другими упражнениями вместо остановки всего процесса
            }
          }
        }
        
        console.log('Formatted exercises:', formattedExercises);
        
        setProgram({
          id: programData.id,
          title: programData.title,
          description: programData.description,
          exercises: formattedExercises
        });
      } catch (err: any) {
        console.error('Error loading program data:', err);
        setError(err.message || 'Ошибка при загрузке программы');
      } finally {
        setLoading(false);
      }
    };
    
    loadProgramData();
  }, [training_program_id]); // Убираем program из зависимостей, чтобы избежать зацикливания

  if (!isOpen) return null;

  // Определяем безопасное значение для цикла по упражнениям
  const exercises = program?.exercises || [];

  try {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b flex items-center justify-between">
            <div onDoubleClick={toggleDebugMode}>
              <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
              <p className="text-sm text-gray-600 mt-1">{time}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 overflow-y-auto max-h-[calc(90vh-5rem)]">
            {debugMode && (
              <div className="bg-gray-100 p-4 mb-4 rounded-lg">
                <h3 className="font-medium text-sm mb-2 flex items-center">
                  <Info className="w-4 h-4 mr-1" /> Отладочная информация
                </h3>
                <div className="text-xs font-mono overflow-x-auto">
                  <p>Training Program ID: {training_program_id || 'Отсутствует'}</p>
                  <p>Program Object: {program ? 'Присутствует' : 'Отсутствует'}</p>
                  <p>Loading: {loading ? 'Да' : 'Нет'}</p>
                  <p>Error: {error || 'Нет'}</p>
                  {program && (
                    <>
                      <p>Program ID: {program.id}</p>
                      <p>Program Title: {program.title}</p>
                      <p>Exercises Count: {exercises.length}</p>
                    </>
                  )}
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader className="w-10 h-10 text-orange-500 animate-spin mb-4" />
                <p className="text-gray-500">Загрузка программы тренировки...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">Ошибка при загрузке программы</p>
                <p className="text-gray-400 text-sm mt-2">{error}</p>
              </div>
            ) : !program || exercises.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">Программа тренировки не найдена</p>
                <p className="text-gray-400 text-sm mt-2">Обратитесь к своему тренеру для добавления программы</p>
              </div>
            ) : (
              <div className="space-y-6">
                {program.description && (
                  <div className="text-gray-600 bg-gray-50 p-4 rounded-lg">{program.description}</div>
                )}

                <div className="space-y-4">
                  {exercises.map((exercise, index) => (
                    <div key={exercise.id || index} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Dumbbell className="w-5 h-5 text-orange-500" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">#{index + 1}</span>
                            <h3 className="font-medium text-gray-900">{exercise.name || 'Упражнение'}</h3>
                          </div>
                          
                          {exercise.description && (
                            <p className="text-sm text-gray-600 mt-1">{exercise.description}</p>
                          )}

                          {/* Sets */}
                          <div className="mt-3 space-y-2">
                            {exercise.sets && exercise.sets.length > 0 ? (
                              exercise.sets.map((set) => (
                                <div 
                                  key={set.set_number}
                                  className="flex items-center text-sm bg-white p-2 rounded"
                                >
                                  <span className="w-8 text-gray-500">#{set.set_number}</span>
                                  <span className="flex-1">{set.reps} повторений</span>
                                  {set.weight && (
                                    <span className="text-gray-600">{set.weight} кг</span>
                                  )}
                                </div>
                              ))
                            ) : (
                              <div className="text-sm text-gray-500 italic">Нет информации о подходах</div>
                            )}
                          </div>

                          {exercise.notes && (
                            <p className="text-sm text-gray-500 mt-2 italic">{exercise.notes}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  } catch (renderError) {
    console.error('Error rendering modal:', renderError);
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Ошибка отображения</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>
          <div className="text-center py-8">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <p className="text-gray-700 font-medium">Произошла ошибка при отображении программы тренировки</p>
            <p className="text-gray-500 mt-2">Пожалуйста, попробуйте позже или обратитесь в поддержку</p>
          </div>
        </div>
      </div>
    );
  }
}