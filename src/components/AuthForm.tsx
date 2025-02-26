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
      if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        throw new Error('Пожалуйста, введите корректный email');
      }
      if (formData.password.length < 6) {
        throw new Error('Пароль должен содержать минимум 6 символов');
      }

      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        }, { persistSession: rememberMe });
        
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
        if (role === 'trainer') {
          if (!formData.firstName.trim() || !formData.lastName.trim()) {
            throw new Error('Имя и фамилия обязательны для тренеров');
          }
          if (formData.secretPhrase !== 'start') {
            throw new Error('Неверная секретная фраза');
          }
        }
        if (!formData.email.trim() || !formData.password.trim()) {
          throw new Error('Email и пароль обязательны');
        }

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
            throw new Error('Пользователь с таким email уже существует. Пожалуйста, войдите.');
          }
          throw authError;
        }
        
        if (!authData.user) throw new Error('Не удалось создать пользователя');

        if (role === 'client') {
          const { error: clientError } = await supabase
            .from('clients')
            .insert({
              user_id: authData.user.id,
              first_name: formData.firstName,
              last_name: formData.lastName,
              subscription_status: 'active'
            });

          if (clientError) {
            console.error('Error creating client record:', clientError);
            await supabase.auth.admin.deleteUser(authData.user.id);
            throw new Error('Не удалось создать профиль клиента');
          }
        }

        toast.success('Регистрация успешна! Пожалуйста, войдите.');
        setIsLogin(true);
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
    <>
      {/* Подключение шрифта и глобальные стили */}
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Commissioner:wght@400;500;700&display=swap');
          
          body {
            font-family: 'Commissioner', sans-serif;
          }
        `}
      </style>

      <div className="min-h-screen bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.45)), url(/src/data/HardCase_phostyle_7.png)` }}>
        <div className="flex flex-col items-center justify-center p-4 min-h-screen">
          {/* Логотип в центре сверху */}
          <div className="mb-8">
            <img
              src="/src/data/HardCase_Logo.png"
              alt="HARD CASE Logo"
              className="w-65 mx-auto"
            />
          </div>

          {/* Форма */}
          <div className="bg-[#606060] bg-opacity-65 rounded-lg w-full max-w-md p-4 transition-all duration-300">
            <form onSubmit={handleSubmit} className="space-y-2">
              {/* Выбор роли */}
              {!isLogin && (
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setRole('client')}
                    className={`flex-1 py-1 px-3 rounded-md font-semibold transition-all duration-300 ${
                      role === 'client' ? 'bg-[#ffffff] bg-opacity-100 text-[#ff8502]' : 'bg-[#ffffff] bg-opacity-65 text-[#606060]'
                    }`}
                  >
                    Клиент
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('trainer')}
                    className={`flex-1 py-1 px-3 rounded-md font-semibold transition-all duration-300 ${
                      role === 'trainer' ? 'bg-[#ffffff] bg-opacity-100 text-[#ff8502]' : 'bg-[#ffffff] bg-opacity-65 text-[#606060]'
                    }`}
                  >
                    Тренер
                  </button>
                </div>
              )}

              {/* Поля для имени и фамилии */}
              {!isLogin && (role === 'trainer' || role === 'client') && (
                <>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#ffffff]" size={16} />
                    <input
                      type="text"
                      placeholder="Имя"
                      required
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full pl-9 pr-2 py-1 bg-[#ffffff] bg-opacity-100 border border-[#ffffff] rounded-md text-[#606060] placeholder-[#606060] focus:outline-none focus:border-[#ff8502] transition-all duration-200"
                    />
                  </div>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#ffffff]" size={16} />
                    <input
                      type="text"
                      placeholder="Фамилия"
                      required
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full pl-9 pr-2 py-1 bg-[#ffffff] bg-opacity-100 border border-[#ffffff] rounded-md text-[#606060] placeholder-[#606060] focus:outline-none focus:border-[#ff8502] transition-all duration-200"
                    />
                  </div>
                </>
              )}

              {/* Секретная фраза для тренеров */}
              {!isLogin && role === 'trainer' && (
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#ffffff]" size={16} />
                  <input
                    type="password"
                    placeholder="Секретная фраза"
                    required
                    value={formData.secretPhrase}
                    onChange={(e) => setFormData({ ...formData, secretPhrase: e.target.value })}
                    className="w-full pl-9 pr-2 py-1 bg-[#ffffff] bg-opacity-100 border border-[#ffffff] rounded-md text-[#606060] placeholder-[#606060] focus:outline-none focus:border-[#ff8502] transition-all duration-200"
                  />
                </div>
              )}

              {/* Email */}
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#ffffff]" size={16} />
                <input
                  type="email"
                  placeholder="Email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-9 pr-2 py-1 bg-[#ffffff] bg-opacity-100 border border-[#ffffff] rounded-md text-[#606060] placeholder-[#606060] focus:outline-none focus:border-[#ff8502] transition-all duration-200"
                />
              </div>

              {/* Пароль */}
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#ffffff]" size={16} />
                <input
                  type="password"
                  placeholder="Пароль"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-9 pr-2 py-1 bg-[#ffffff] bg-opacity-100 border border-[#ffffff] rounded-md text-[#606060] placeholder-[#606060] focus:outline-none focus:border-[#ff8502] transition-all duration-200"
                />
              </div>

              {/* Чекбокс "Запомнить меня" */}
              {isLogin && (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 text-[#ff8502] border-[#ffffff] rounded focus:outline-none"
                  />
                  <label htmlFor="rememberMe" className="ml-2 text-sm text-[#ffffff]">
                    Запомнить меня
                  </label>
                </div>
              )}

              {/* Кнопка отправки */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#ffffff] bg-opacity-100 text-[#ff8502] py-1 rounded-md font-semibold hover:bg-opacity-90 hover:text-[#e07a02] transition-all duration-300 disabled:bg-[#606060] disabled:bg-opacity-65 disabled:text-white"
              >
                {loading ? 'Обработка...' : isLogin ? 'Войти' : 'Зарегистрироваться'}
              </button>
            </form>

            {/* Переключение между входом и регистрацией */}
            <div className="mt-2 text-center">
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setFormData({
                    firstName: '',
                    lastName: '',
                    email: '',
                    password: '',
                    secretPhrase: ''
                  });
                }}
                className="text-[#ffffff] text-opacity-100 hover:text-opacity-90 hover:text-[#e07a02] font-medium transition-all duration-300"
              >
                {isLogin ? 'Регистрация' : 'Уже есть аккаунт? Войти'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}