import { useState, useEffect } from 'react';
import { 
  Dumbbell, 
  Clock, 
  Calendar,
  CheckCircle,
  XCircle,
  Play
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { SidebarLayout } from './SidebarLayout';
import { useClientNavigation } from '../lib/navigation';
import { ExerciseVideoModal } from './ExerciseVideoModal';
import { MeasurementsInputModal } from './MeasurementsInputModal';

interface StrengthExercise {
  id: string;
  name: string;
  description?: string;
  video_url?: string;
}

interface ExerciseSet {
  set_number: number;
  reps: string;
  weight: string;
}

interface ProgramExercise {
  id: string;
  exercise_order: number;
  notes?: string;
  strength_exercises: StrengthExercise;
  exercise_sets: ExerciseSet[];
}

interface Exercise {
  id: string;
  name: string;
  description?: string;
  video_url?: string;
  sets: {
    set_number: number;
    reps: string;
    weight: string;
    completed: boolean;
  }[];
  notes?: string;
}

interface Workout {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  training_program_id?: string;
  completed: boolean;
  feedback?: string;
  exercises: Exercise[];
}

export function WorkoutDetailsView() {
  const { workoutId } = useParams<{ workoutId: string }>();
  const navigate = useNavigate();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [showMeasurementsModal, setShowMeasurementsModal] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<{name: string, video_url: string} | null>(null);

  useEffect(() => {
    if (workoutId) {
      fetchWorkoutDetails();
    }
  }, [workoutId]);

  const fetchWorkoutDetails = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (clientError) throw clientError;

      const { data: workoutData, error: workoutError } = await supabase
        .from('workouts')
        .select('*')
        .eq('id', workoutId)
        .eq('client_id', clientData.id)
        .single();

      if (workoutError) throw workoutError;
      
      if (!workoutData) {
        toast.error('Тренировка не найдена');
        navigate('/client/workouts');
        return;
      }

      const { data: completionData } = await supabase
        .from('workout_completions')
        .select('*')
        .eq('workout_id', workoutId)
        .eq('client_id', clientData.id)
        .maybeSingle();

      const initialWorkout: Workout = {
        ...workoutData,
        completed: completionData?.completed || false,
        feedback: completionData?.feedback || '',
        exercises: []
      };
      
      setWorkout(initialWorkout);
      setFeedback(initialWorkout.feedback || '');

      if (workoutData.training_program_id) {
        const { data: programExercises, error: programError } = await supabase
          .from('program_exercises')
          .select(`
            id,
            exercise_order,
            notes,
            strength_exercises (
              id,
              name,
              description,
              video_url
            ),
            exercise_sets (
              set_number,
              reps,
              weight
            )
          `)
          .eq('program_id', workoutData.training_program_id)
          .order('exercise_order') as { data: ProgramExercise[] | null, error: any };

        if (programError) throw programError;

        const formattedExercises: Exercise[] = (programExercises || []).map(exercise => ({
          id: exercise.strength_exercises.id,
          name: exercise.strength_exercises.name,
          description: exercise.strength_exercises.description,
          video_url: exercise.strength_exercises.video_url,
          notes: exercise.notes,
          sets: (exercise.exercise_sets || []).map(set => ({
            set_number: set.set_number,
            reps: set.reps,
            weight: set.weight || '',
            completed: false
          }))
        }));

        const { data: exerciseCompletions } = await supabase
          .from('exercise_completions')
          .select('*')
          .eq('workout_id', workoutId)
          .eq('client_id', clientData.id);

        if (exerciseCompletions && exerciseCompletions.length > 0) {
          exerciseCompletions.forEach(completion => {
            const exerciseIndex = formattedExercises.findIndex(ex => ex.id === completion.exercise_id);
            if (exerciseIndex >= 0 && completion.completed_sets) {
              completion.completed_sets.forEach((completed: boolean, index: number) => {
                if (formattedExercises[exerciseIndex].sets[index]) {
                  formattedExercises[exerciseIndex].sets[index].completed = completed;
                }
              });
            }
          });
        }

        setExercises(formattedExercises);
        setWorkout(prev => prev ? { ...prev, exercises: formattedExercises } : null);
      }
    } catch (error: any) {
      console.error('Error fetching workout details:', error);
      toast.error('Ошибка при загрузке тренировки');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSet = (exerciseIndex: number, setIndex: number) => {
    const updatedExercises = [...exercises];
    updatedExercises[exerciseIndex].sets[setIndex].completed = !updatedExercises[exerciseIndex].sets[setIndex].completed;
    setExercises(updatedExercises);
    
    setWorkout(prev => prev ? { ...prev, exercises: updatedExercises } : null);
  };

  const handleToggleWorkoutCompleted = () => {
    if (!workout) return;
    
    const newStatus = !workout.completed;
    setWorkout({ ...workout, completed: newStatus });
    
    if (newStatus) {
      toast.success('Тренировка отмечена как выполненная! 💪', {
        icon: '🏆',
        duration: 3000,
      });
    } else {
      toast('Тренировка отмечена как не выполненная', {
        icon: '📝',
        duration: 2000,
      });
    }
  };

  const handleSaveProgress = async () => {
    if (!workout) return;
    
    try {
      setSaving(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (clientError) throw clientError;

      const { data: existingCompletion, error: checkError } = await supabase
        .from('workout_completions')
        .select('id')
        .eq('workout_id', workout.id)
        .eq('client_id', clientData.id)
        .maybeSingle();
        
      if (checkError) throw checkError;
      
      if (existingCompletion) {
        const { error } = await supabase
          .from('workout_completions')
          .update({
            completed: workout.completed,
            feedback: feedback,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingCompletion.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('workout_completions')
          .insert({
            workout_id: workout.id,
            client_id: clientData.id,
            completed: workout.completed,
            feedback: feedback,
            updated_at: new Date().toISOString()
          });
        
        if (error) throw error;
      }

      const exerciseCompletions = exercises.map(exercise => ({
        workout_id: workout.id,
        client_id: clientData.id,
        exercise_id: exercise.id,
        completed_sets: exercise.sets.map(set => set.completed),
        updated_at: new Date().toISOString()
      }));

      const { error: deleteError } = await supabase
        .from('exercise_completions')
        .delete()
        .eq('workout_id', workout.id)
        .eq('client_id', clientData.id);

      if (deleteError) throw deleteError;

      if (exerciseCompletions.length > 0) {
        const { error: insertError } = await supabase
          .from('exercise_completions')
          .insert(exerciseCompletions);

        if (insertError) throw insertError;
      }

      toast.success('Прогресс сохранен');
    } catch (error: any) {
      console.error('Error saving progress:', error);
      toast.error('Ошибка при сохранении прогресса');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenMeasurementsModal = () => {
    setShowMeasurementsModal(true);
  };

  const handleMenuItemClick = (action: string) => {
    setShowFabMenu(false);
    switch (action) {
      case 'activity':
        navigate('/client/activity/new');
        break;
      case 'photo':
        navigate('/client/progress-photo/new');
        break;
      case 'measurements':
        navigate('/client/measurements/new');
        break;
      case 'nutrition':
        navigate('/client/nutrition/new');
        break;
    }
  };
  
  const handleOpenVideo = (exercise: Exercise) => {
    if (!exercise.video_url) {
      toast.error('Видео для этого упражнения не доступно');
      return;
    }
    
    setSelectedExercise({
      name: exercise.name,
      video_url: exercise.video_url
    });
    setShowVideoModal(true);
  };

  const menuItems = useClientNavigation(showFabMenu, setShowFabMenu, handleMenuItemClick, handleOpenMeasurementsModal);
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateDuration = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMinutes = Math.round((end.getTime() - start.getTime()) / 1000 / 60);
    
    if (durationMinutes < 60) {
      return `${durationMinutes} мин`;
    } else {
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;
      return minutes > 0 ? `${hours} ч ${minutes} мин` : `${hours} ч`;
    }
  };

  if (loading) {
    return (
      <SidebarLayout
        menuItems={menuItems}
        variant="bottom"
        backTo="/client/workouts"
      >
        <div className="p-4">
          <div className="bg-white rounded-xl shadow-sm p-4 flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  if (!workout) {
    return (
      <SidebarLayout
        menuItems={menuItems}
        variant="bottom"
        backTo="/client/workouts"
      >
        <div className="p-4">
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <p className="text-gray-500">Тренировка не найдена</p>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout
      menuItems={menuItems}
      variant="bottom"
      backTo="/client/workouts"
    >
      <div className="p-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800">{workout.title}</h2>
            <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <div className="flex items-center text-gray-600">
                <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                {formatDate(workout.start_time)}
              </div>
              <div className="flex items-center text-gray-600">
                <Clock className="w-4 h-4 mr-2 text-gray-400" />
                {formatTime(workout.start_time)} - {formatTime(workout.end_time)} 
                ({calculateDuration(workout.start_time, workout.end_time)})
              </div>
            </div>
          </div>

          <div className="mb-6">
            <button
              onClick={handleToggleWorkoutCompleted}
              className={`w-full py-3 px-4 rounded-lg flex items-center justify-center font-medium ${
                workout.completed
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              } transition-colors transform active:scale-95 duration-200`}
            >
              {workout.completed ? (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Тренировка окончена
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 mr-2" />
                  Тренировка окончена
                </>
              )}
            </button>
            {workout.completed && (
              <p className="text-sm text-green-600 mt-2 text-center">
                Отлично! Вы завершили эту тренировку.
              </p>
            )}
          </div>

          {exercises.length > 0 ? (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Упражнения</h3>
              <div className="space-y-4">
                {exercises.map((exercise, exerciseIndex) => (
                  <div key={exercise.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Dumbbell className="w-5 h-5 text-orange-500" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">#{exerciseIndex + 1}</span>
                            <h4 className="font-medium text-gray-900">{exercise.name}</h4>
                          </div>
                          {exercise.video_url && (
                            <button
                              onClick={() => handleOpenVideo(exercise)}
                              className="p-1.5 bg-orange-100 rounded-full hover:bg-orange-200 transition-colors"
                              title="Посмотреть видео техники"
                            >
                              <Play className="w-4 h-4 text-orange-500" />
                            </button>
                          )}
                        </div>
                        
                        {exercise.description && (
                          <p className="text-sm text-gray-600 mt-1">{exercise.description}</p>
                        )}

                        <div className="mt-3 space-y-2">
                          {exercise.sets.map((set, setIndex) => (
                            <div 
                              key={set.set_number}
                              className={`flex items-center text-sm p-2 rounded cursor-pointer ${
                                set.completed ? 'bg-green-50' : 'bg-white'
                              }`}
                              onClick={() => handleToggleSet(exerciseIndex, setIndex)}
                            >
                              <div className="flex items-center">
                                <div className={`w-5 h-5 rounded-full mr-2 flex items-center justify-center ${
                                  set.completed 
                                    ? 'bg-green-500 text-white' 
                                    : 'border border-gray-300'
                                }`}>
                                  {set.completed && <CheckCircle className="w-4 h-4" />}
                                </div>
                              </div>
                              <span className="w-8 text-gray-500">#{set.set_number}</span>
                              <span className="flex-1">{set.reps} повторений</span>
                              {set.weight && (
                                <span className="text-gray-600">{set.weight} кг</span>
                              )}
                            </div>
                          ))}
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
          ) : (
            <div className="bg-gray-50 rounded-lg p-6 text-center mb-6">
              <Dumbbell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">К этой тренировке не привязана программа упражнений</p>
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Заметки о тренировке
            </label>
            <textarea
              rows={3}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Напишите заметки о том, как прошла тренировка..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
            />
          </div>

          <button
            onClick={handleSaveProgress}
            disabled={saving}
            className="w-full py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center transform active:scale-95 duration-200"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Сохранение...
              </>
            ) : (
              'Сохранить прогресс'
            )}
          </button>
        </div>
      </div>
      
      {showVideoModal && selectedExercise && (
        <ExerciseVideoModal
          isOpen={showVideoModal}
          onClose={() => setShowVideoModal(false)}
          videoUrl={selectedExercise.video_url}
          exerciseName={selectedExercise.name}
        />
      )}

      {/* Measurements Input Modal */}
      {showMeasurementsModal && (
        <MeasurementsInputModal
          isOpen={showMeasurementsModal}
          onClose={() => setShowMeasurementsModal(false)}
          onSave={() => {
            setShowMeasurementsModal(false);
            toast.success('Замеры сохранены');
          }}
        />
      )}
    </SidebarLayout>
  );
}