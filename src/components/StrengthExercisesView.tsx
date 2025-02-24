import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface Exercise {
  id: string;
  name: string;
  video_url?: string;
  trainer_id: string;
}

interface ExerciseFormData {
  name: string;
  video_url: string;
}

export function StrengthExercisesView() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [formData, setFormData] = useState<ExerciseFormData>({
    name: '',
    video_url: ''
  });

  useEffect(() => {
    fetchExercises();
  }, []);

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
      toast.error('Ошибка при загрузке упражнений');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Не авторизован');

      const exerciseData = {
        name: formData.name,
        video_url: formData.video_url || null,
        trainer_id: user.id
      };

      let error;
      if (editingExercise) {
        ({ error } = await supabase
          .from('strength_exercises')
          .update(exerciseData)
          .eq('id', editingExercise.id));
      } else {
        ({ error } = await supabase
          .from('strength_exercises')
          .insert([exerciseData]));
      }

      if (error) throw error;

      toast.success(editingExercise ? 'Упражнение обновлено' : 'Упражнение добавлено');
      setShowForm(false);
      setEditingExercise(null);
      setFormData({
        name: '',
        video_url: ''
      });
      fetchExercises();
    } catch (error: any) {
      console.error('Error saving exercise:', error);
      toast.error(error.message || 'Ошибка при сохранении упражнения');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (exercise: Exercise) => {
    if (!window.confirm('Вы уверены, что хотите удалить это упражнение?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('strength_exercises')
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
      video_url: exercise.video_url || ''
    });
    setEditingExercise(exercise);
    setShowForm(true);
  };

  const renderVideoEmbed = (embedCode: string) => {
    if (!embedCode) return null;
    
    // Create a temporary div to parse the embed code
    const div = document.createElement('div');
    div.innerHTML = embedCode;
    
    // Get the iframe from the parsed HTML
    const iframe = div.querySelector('iframe');
    if (!iframe) return null;
    
    // Get the video ID from the src attribute
    const src = iframe.src;
    if (!src) return null;
    
    return (
      <div className="relative aspect-video">
        <iframe
          width="560"
          height="315"
          src={src}
          title="YouTube video player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      </div>
    );
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
        <h2 className="text-2xl font-bold text-gray-800">Силовые упражнения</h2>
        <button
          onClick={() => {
            setEditingExercise(null);
            setFormData({
              name: '',
              video_url: ''
            });
            setShowForm(true);
          }}
          className="flex items-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Добавить упражнение
        </button>
      </div>

      {showForm && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
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

          <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder="Например: Приседания со штангой"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Код для встраивания видео
              </label>
              <textarea
                value={formData.video_url}
                onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                rows={4}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
                placeholder='<iframe width="560" height="315" src="https://www.youtube.com/embed/VIDEO_ID" ... ></iframe>'
              />
              <p className="mt-1 text-sm text-gray-500">
                Вставьте полный код встраивания видео с YouTube
              </p>
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
                disabled={saving}
                className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
              >
                {saving ? 'Сохранение...' : (editingExercise ? 'Сохранить изменения' : 'Добавить упражнение')}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {exercises.map((exercise) => (
          <div key={exercise.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* Video Preview */}
            {exercise.video_url && renderVideoEmbed(exercise.video_url)}

            <div className="p-4">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-gray-800">{exercise.name}</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(exercise)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    title="Редактировать"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(exercise)}
                    className="p-1 text-gray-400 hover:text-red-500"
                    title="Удалить"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}