import React, { useState } from 'react';
import { Lock, Mail, User, Eye, EyeOff, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { UserRole, UserFormData } from '../types/user';
import { authApi, clientsApi } from '../lib/api';
import { Card, CardHeader, CardBody, CardFooter } from './ui/Card';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { ROUTES } from '../lib/constants';

export function AuthForm() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<UserRole>('client');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<UserFormData>({
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
        const { data, error } = await authApi.signIn(formData.email, formData.password);
        
        // Set session persistence based on rememberMe
        if (rememberMe && data.session) {
          await authApi.setSession(data.session.access_token, data.session.refresh_token);
        }
        
        if (error) {
          if (error.message === 'Invalid login credentials') {
            throw new Error('Неверный email или пароль');
          }
          throw error;
        }
        
        const userRole = data.user?.user_metadata?.role || 'client';
        toast.success('Успешный вход!');
        navigate(userRole === 'client' ? ROUTES.CLIENT.DASHBOARD : ROUTES.TRAINER.DASHBOARD);
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

        const { data: authData, error: authError } = await authApi.signUp(formData, role);

        if (authError) {
          if (authError.message.includes('User already registered')) {
            throw new Error('Пользователь с таким email уже существует. Пожалуйста, войдите.');
          }
          throw authError;
        }
        
        if (!authData.user) throw new Error('Не удалось создать пользователя');

        if (role === 'client') {
          const { error: clientError } = await clientsApi.createClient(
            authData.user.id,
            formData.firstName,
            formData.lastName
          );

          if (clientError) {
            console.error('Error creating client record:', clientError);
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900 p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="mb-8 text-center">
          <img 
            src="/HardCase_Logo.png" 
            alt="HARDCASE" 
            className="h-48 mx-auto"
          />
        </div>

        {/* Auth Card */}
        <Card>
          <CardHeader>
            <h2 className="text-2xl font-bold text-white">
              {isLogin ? 'Вход' : 'Регистрация'}
            </h2>
            <p className="text-gray-400 mt-1">
              {isLogin 
                ? 'Войдите, чтобы получить доступ к вашему аккаунту' 
                : 'Создайте аккаунт для начала занятий'}
            </p>
          </CardHeader>

          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Role Selection (only for registration) */}
              {!isLogin && (
                <div className="mb-4">
                  <div className="flex p-1 bg-gray-800/50 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setRole('client')}
                      className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                        role === 'client' 
                          ? 'bg-orange-500 text-white shadow-lg' 
                          : 'text-gray-300 hover:text-white'
                      }`}
                    >
                      Клиент
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('trainer')}
                      className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                        role === 'trainer' 
                          ? 'bg-orange-500 text-white shadow-lg' 
                          : 'text-gray-300 hover:text-white'
                      }`}
                    >
                      Тренер
                    </button>
                  </div>
                </div>
              )}

              {/* Name fields (only for registration) */}
              {!isLogin && (
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Имя"
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Имя"
                    leftIcon={<User size={18} />}
                    fullWidth
                  />
                  <Input
                    label="Фамилия"
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Фамилия"
                    leftIcon={<User size={18} />}
                    fullWidth
                  />
                </div>
              )}

              {/* Secret phrase (only for trainer registration) */}
              {!isLogin && role === 'trainer' && (
                <Input
                  label="Секретная фраза"
                  type="password"
                  value={formData.secretPhrase}
                  onChange={(e) => setFormData({ ...formData, secretPhrase: e.target.value })}
                  placeholder="Секретная фраза для тренеров"
                  leftIcon={<Lock size={18} />}
                  fullWidth
                />
              )}

              {/* Email */}
              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="your@email.com"
                leftIcon={<Mail size={18} />}
                fullWidth
              />

              {/* Password */}
              <Input
                label="Пароль"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Минимум 6 символов"
                leftIcon={<Lock size={18} />}
                rightIcon={
                  showPassword ? (
                    <EyeOff 
                      size={18} 
                      className="cursor-pointer" 
                      onClick={() => setShowPassword(false)} 
                    />
                  ) : (
                    <Eye 
                      size={18} 
                      className="cursor-pointer" 
                      onClick={() => setShowPassword(true)} 
                    />
                  )
                }
                fullWidth
              />

              {/* Remember me (only for login) */}
              {isLogin && (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="remember-me"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-700 bg-gray-800 text-orange-500 focus:ring-orange-500"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-300">
                    Запомнить меня
                  </label>
                </div>
              )}

              {/* Submit button */}
              <Button
                type="submit"
                fullWidth
                isLoading={loading}
                rightIcon={<ArrowRight size={18} />}
              >
                {isLogin ? 'Войти' : 'Зарегистрироваться'}
              </Button>
            </form>
          </CardBody>

          <CardFooter>
            <div className="text-center">
              <p className="text-gray-400 text-sm">
                {isLogin ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}
                <button
                  type="button"
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
                  className="ml-1 text-orange-500 hover:text-orange-400 font-medium"
                >
                  {isLogin ? 'Зарегистрироваться' : 'Войти'}
                </button>
              </p>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}