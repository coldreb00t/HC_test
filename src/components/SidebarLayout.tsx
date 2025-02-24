import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, ChevronLeft, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface SidebarLayoutProps {
  children: React.ReactNode;
  title?: string | React.ReactNode;
  menuItems: {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
  }[];
  backTo?: string;
  onBack?: () => void;
  variant?: 'sidebar' | 'bottom';
}

export function SidebarLayout({ 
  children, 
  menuItems, 
  backTo, 
  onBack,
  variant = 'sidebar' 
}: SidebarLayoutProps) {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/login');
    } catch (error: any) {
      console.error('Error signing out:', error);
      toast.error('Ошибка при выходе из системы');
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
      setIsSidebarOpen(false);
    } else if (backTo) {
      navigate(backTo);
      setIsSidebarOpen(false);
    }
  };

  // Add styles for thinner icons
  const iconWrapperStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transform: 'scale(0.9)', // 10% smaller
  };

  const iconStyle = {
    strokeWidth: 1.5, // Thinner lines (default is 2)
  };

  if (variant === 'bottom') {
    return (
      <div className="min-h-screen bg-gray-100 pb-16">
        {/* Header */}
        <div className="bg-white shadow-sm">
          <div className="px-4 py-3 flex justify-between items-center">
            {backTo && (
              <button 
                onClick={handleBack}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}
            <div className="flex-1 text-center">
              <h1 className="text-xl font-bold text-gray-800">HARDCASE</h1>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <User className="w-5 h-5 text-gray-600" />
              </button>
              
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-50">
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Выйти
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="p-4">
          {children}
        </div>

        {/* Bottom navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
          <div className="flex justify-around items-end">
            {menuItems.map((item, index) => (
              <button
                key={index}
                onClick={item.onClick}
                className="flex-1 flex flex-col items-center py-2 text-gray-600 hover:text-orange-500"
              >
                <div className="p-1" style={iconWrapperStyle}>
                  {React.isValidElement(item.icon) 
                    ? React.cloneElement(item.icon as React.ReactElement, { style: iconStyle })
                    : item.icon}
                </div>
                <span className="text-xs">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile header */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-white shadow-sm">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 hover:bg-gray-50 rounded-lg"
          style={iconWrapperStyle}
        >
          {isSidebarOpen 
            ? <X className="w-6 h-6" style={iconStyle} /> 
            : <Menu className="w-6 h-6" style={iconStyle} />}
        </button>
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-800">HARDCASE</h1>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <User className="w-5 h-5 text-gray-600" />
          </button>
          
          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-50">
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Выйти
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <div className={`fixed top-0 left-0 w-64 h-full bg-white shadow-lg transition-transform duration-300 ease-in-out z-50
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          <div className="p-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-800">HARDCASE</h2>
            </div>
          </div>
          
          <nav className="flex-1 px-4 space-y-2">
            {(backTo || onBack) && (
              <button 
                onClick={handleBack}
                className="flex items-center w-full px-4 py-3 text-gray-700 rounded-lg hover:bg-orange-50 hover:text-orange-500"
                style={iconWrapperStyle}
              >
                <ChevronLeft className="w-5 h-5 min-w-[20px]" style={iconStyle} />
                <span className="ml-3">Назад</span>
              </button>
            )}

            {menuItems.map((item, index) => (
              <button
                key={index}
                onClick={() => {
                  item.onClick();
                  setIsSidebarOpen(false);
                }}
                className="flex items-center w-full px-4 py-3 text-gray-700 rounded-lg hover:bg-orange-50 hover:text-orange-500"
              >
                <div style={iconWrapperStyle}>
                  {React.isValidElement(item.icon) 
                    ? React.cloneElement(item.icon as React.ReactElement, { style: iconStyle })
                    : item.icon}
                </div>
                <span className="ml-3">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="p-4 border-t">
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-3 text-gray-700 rounded-lg hover:bg-orange-50 hover:text-orange-500"
              style={iconWrapperStyle}
            >
              <LogOut className="w-5 h-5 min-w-[20px]" style={iconStyle} />
              <span className="ml-3">Выйти</span>
            </button>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="lg:ml-64 p-4">
        {children}
      </div>
    </div>
  );
}