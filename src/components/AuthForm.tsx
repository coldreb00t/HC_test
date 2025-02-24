import React, { useState } from 'react';
import { Lock, Mail, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

type UserRole = 'client' | 'trainer';

export function AuthForm() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<UserRole>('client');
  const [rememberMe, setRememberMe] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    secretPhrase: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate email format
      if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        throw new Error('Пожалуйста, введите корректный email');
      }

      // Validate password length
      if (formData.password.length < 6) {
        throw new Error('Пароль должен содержать минимум 6 символов');
      }

      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        }, {
          // Set session persistence based on rememberMe
          persistSession: rememberMe
        });
        
        if (error) {
          if (error.message === 'Invalid login credentials') {
            throw new Error('Неверный email или пароль');
          }
          throw error;
        }
        
        const userRole = data.user?.user_metadata?.role || 'client';
        toast.success('Успешный вход!');
        navigate(`/${userRole}`);
      } else {
        // Validate trainer-specific fields
        if (role === 'trainer') {
          if (!formData.firstName.trim() || !formData.lastName.trim()) {
            throw new Error('Имя и фамилия обязательны для тренеров');
          }
          if (formData.secretPhrase !== 'start') {
            throw new Error('Неверная секретная фраза');
          }
        }

        // Validate common fields
        if (!formData.email.trim() || !formData.password.trim()) {
          throw new Error('Email и пароль обязательны');
        }

        // 1. Create auth user
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              firstName: formData.firstName,
              lastName: formData.lastName,
              role: role,
              secretPhrase: formData.secretPhrase
            },
          },
        });

        if (authError) {
          if (authError.message.includes('User already registered')) {
            throw new Error('Пользователь с таким email уже существует. Пожалуйста, войдите в систему.');
          }
          throw authError;
        }
        
        if (!authData.user) throw new Error('Не удалось создать пользователя');

        // 2. For clients, create a record in the clients table
        if (role === 'client') {
          const { error: clientError } = await supabase
            .from('clients')
            .insert({
              user_id: authData.user.id,
              first_name: formData.firstName,
              last_name: formData.lastName,
              subscription_status: 'active' // Set initial status as active
            });

          if (clientError) {
            console.error('Error creating client record:', clientError);
            // If client record creation fails, delete the auth user
            await supabase.auth.admin.deleteUser(authData.user.id);
            throw new Error('Не удалось создать профиль клиента');
          }
        }

        toast.success('Регистрация успешна! Пожалуйста, войдите в систему.');
        setIsLogin(true);
        // Clear form data
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          password: '',
          secretPhrase: ''
        });
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      toast.error(error.message || 'Ошибка аутентификации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-400 to-gray-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800">
            {isLogin ? 'HARDCASE' : 'Создать аккаунт'}
          </h2>
          <p className="text-gray-600 mt-2">
            {isLogin
              ? 'Пожалуйста, войдите в систему'
              : 'Зарегистрируйтесь, чтобы начать'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {!isLogin && (
            <>
              <div className="flex gap-4 mb-4">
                <button
                  type="button"
                  onClick={() => setRole('client')}
                  className={`flex-1 py-2 px-4 rounded-lg transition-colors duration-300 ${
                    role === 'client'
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Клиент
                </button>
                <button
                  type="button"
                  onClick={() => setRole('trainer')}
                  className={`flex-1 py-2 px-4 rounded-lg transition-colors duration-300 ${
                    role === 'trainer'
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Тренер
                </button>
              </div>

              {(role === 'trainer' || role === 'client') && (
                <>
                  <div>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="text"
                        placeholder="Имя"
                        required
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="text"
                        placeholder="Фамилия"
                        required
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </>
              )}

              {role === 'trainer' && (
                <div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="password"
                      placeholder="Секретная фраза"
                      required
                      value={formData.secretPhrase}
                      onChange={(e) => setFormData({ ...formData, secretPhrase: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          <div>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="email"
                placeholder="Email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="password"
                placeholder="Пароль"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>

          {isLogin && (
            <div className="flex items-center">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-gray-300 rounded"
              />
              <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-700">
                Запомнить меня
              </label>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 text-white py-3 rounded-lg hover:bg-orange-600 transition-colors duration-300 disabled:opacity-50"
          >
            {loading ? 'Обработка...' : isLogin ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              // Clear form data when switching between login and register
              setFormData({
                firstName: '',
                lastName: '',
                email: '',
                password: '',
                secretPhrase: ''
              });
            }}
            className="text-orange-500 hover:text-orange-600 transition-colors duration-300"
          >
            {isLogin
              ? "Регистрация"
              : 'Уже есть аккаунт? Войти'}
          </button>
        </div>
      </div>
    </div>
  );
}