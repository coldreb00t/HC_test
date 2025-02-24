import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Edit2, Trash2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface Exercise {
  id: string;
  name: string;
  muscle_groups: string[];
  equipment: string[];
  difficulty: string;
  video_url?: string;
}

interface ExerciseFormData {
  name: string;
  muscle_groups: string[];
  equipment: string[];
  difficulty: string;
  video_url?: string;
}

const MUSCLE_GROUPS = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps',
  'legs', 'glutes', 'core', 'forearms', 'calves'
];

const EQUIPMENT = [
  'barbell', 'dumbbell', 'kettlebell', 'bodyweight',
  'machine', 'cable', 'resistance band', 'bench', 'pull-up bar'
];

const DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'advanced'];

export function ExercisesView() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    muscleGroup: '',
    equipment: '',
    difficulty: ''
  });

  const [formData, setFormData] = useState<ExerciseFormData>({
    name: '',
    muscle_groups: [],
    equipment: [],
    difficulty: 'intermediate',
    video_url: ''
  });

  useEffect(() => {
    fetchExercises();
  }, []);

  const fetchExercises = async () => {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .order('name');

      if (error) throw error;
      setExercises(data || []);
    } catch (error: any) {
      console.error('Error fetching exercises:', error);
      toast.error('Ошибка при загрузке упражнений');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Не авторизован');

      const exerciseData = {
        ...formData,
        trainer_id: user.id
      };

      let error;
      if (editingExercise) {
        ({ error } = await supabase
          .from('exercises')
          .update(exerciseData)
          .eq('id', editingExercise.id));
      } else {
        ({ error } = await supabase
          .from('exercises')
          .insert([exerciseData]));
      }

      if (error) throw error;

      toast.success(editingExercise ? 'Упражнение обновлено' : 'Упражнение добавлено');
      setShowForm(false);
      setEditingExercise(null);
      resetForm();
      fetchExercises();
    } catch (error: any) {
      console.error('Error saving exercise:', error);
      toast.error(error.message || 'Ошибка при сохранении упражнения');
    }
  };

  const handleDelete = async (exercise: Exercise) => {
    if (!window.confirm('Вы уверены, что хотите удалить это упражнение?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('exercises')
        .delete()
        .eq('id', exercise.id);

      if (error) throw error;

      toast.success('Упражнение удалено');
      fetchExercises();
    } catch (error: any) {
      console.error('Error deleting exercise:', error);
      toast.error('Ошибка при удалении упражнения');
    }
  };

  const handleEdit = (exercise: Exercise) => {
    setFormData({
      name: exercise.name,
      muscle_groups: exercise.muscle_groups,
      equipment: exercise.equipment,
      difficulty: exercise.difficulty,
      video_url: exercise.video_url || ''
    });
    setEditingExercise(exercise);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      muscle_groups: [],
      equipment: [],
      difficulty: 'intermediate',
      video_url: ''
    });
  };

  const getYouTubeEmbedUrl = (url: string) => {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
  };

  const filteredExercises = exercises.filter(exercise => {
    const matchesSearch = exercise.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesMuscleGroup = !filters.muscleGroup || 
                              exercise.muscle_groups.includes(filters.muscleGroup);
    
    const matchesEquipment = !filters.equipment || 
                            exercise.equipment.includes(filters.equipment);
    
    const matchesDifficulty = !filters.difficulty || 
                             exercise.difficulty === filters.difficulty;

    return matchesSearch && matchesMuscleGroup && matchesEquipment && matchesDifficulty;
  });

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
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-gray-800">База упражнений</h2>
          <button
            onClick={() => {
              resetForm();
              setEditingExercise(null);
              setShowForm(true);
            }}
            className="flex items-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Добавить упражнение
          </button>
        </div>

        {/* Search and Filters */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Поиск упражнений..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <select
            value={filters.muscleGroup}
            onChange={(e) => setFilters({ ...filters, muscleGroup: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="">Все группы мышц</option>
            {MUSCLE_GROUPS.map(group => (
              <option key={group} value={group}>
                {group.charAt(0).toUpperCase() + group.slice(1)}
              </option>
            ))}
          </select>

          <select
            value={filters.equipment}
            onChange={(e) => setFilters({ ...filters, equipment: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="">Всё оборудование</option>
            {EQUIPMENT.map(item => (
              <option key={item} value={item}>
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </option>
            ))}
          </select>

          <select
            value={filters.difficulty}
            onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="">Все уровни сложности</option>
            {DIFFICULTY_LEVELS.map(level => (
              <option key={level} value={level}>
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Exercise Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-800">
              {editingExercise ? 'Редактировать упражнение' : 'Новое упражнение'}
            </h3>
            <button
              onClick={() => {
                setShowForm(false);
                setEditingExercise(null);
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Название упражнения
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Группы мышц
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {MUSCLE_GROUPS.map(group => (
                  <label key={group} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.muscle_groups.includes(group)}
                      onChange={(e) => {
                        const newGroups = e.target.checked
                          ? [...formData.muscle_groups, group]
                          : formData.muscle_groups.filter(g => g !== group);
                        setFormData({ ...formData, muscle_groups: newGroups });
                      }}
                      className="rounded text-orange-500 focus:ring-orange-500"
                    />
                    <span className="text-sm text-gray-700">
                      {group.charAt(0).toUpperCase() + group.slice(1)}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Оборудование
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {EQUIPMENT.map(item => (
                  <label key={item} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.equipment.includes(item)}
                      onChange={(e) => {
                        const newEquipment = e.target.checked
                          ? [...formData.equipment, item]
                          : formData.equipment.filter(i => i !== item);
                        setFormData({ ...formData, equipment: newEquipment });
                      }}
                      className="rounded text-orange-500 focus:ring-orange-500"
                    />
                    <span className="text-sm text-gray-700">
                      {item.charAt(0).toUpperCase() + item.slice(1)}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Уровень сложности
              </label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                {DIFFICULTY_LEVELS.map(level => (
                  <option key={level} value={level}>
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ссылка на видео
              </label>
              <input
                type="url"
                value={formData.video_url || ''}
                onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                placeholder="https://youtu.be/XXXXX"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingExercise(null);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                {editingExercise ? 'Сохранить изменения' : 'Добавить упражнение'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Exercises List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredExercises.map(exercise => (
          <div key={exercise.id} className="bg-white rounded-xl shadow-md overflow-hidden">
            {/* Video Preview */}
            {exercise.video_url && getYouTubeEmbedUrl(exercise.video_url) && (
              <div className="relative aspect-video">
                <iframe
                  src={getYouTubeEmbedUrl(exercise.video_url)}
                  title={`Видео упражнения ${exercise.name}`}
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}

            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-semibold text-gray-800">{exercise.name}</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(exercise)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(exercise)}
                    className="p-1 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {exercise.muscle_groups.map(group => (
                    <span
                      key={group}
                      className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs"
                    >
                      {group}
                    </span>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  {exercise.equipment.map(item => (
                    <span
                      key={item}
                      className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                    >
                      {item}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <span className={`text-xs px-2 py-1 rounded ${
                    exercise.difficulty === 'beginner'
                      ? 'bg-green-100 text-green-700'
                      : exercise.difficulty === 'intermediate'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {exercise.difficulty}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}