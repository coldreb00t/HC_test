import React, { InputHTMLAttributes, forwardRef, ReactNode, ChangeEvent } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  mobileOptimized?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftIcon, rightIcon, fullWidth = false, mobileOptimized = true, className = '', ...props }, ref) => {
    const baseStyles = 'bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent';
    const paddingStyles = leftIcon ? 'pl-10' : 'pl-4';
    const rightPaddingStyles = rightIcon ? 'pr-10' : 'pr-4';
    const widthStyles = fullWidth ? 'w-full' : '';
    const errorStyles = error ? 'border-red-500 focus:ring-red-500' : '';
    
    const mobileStyles = mobileOptimized 
      ? 'text-base xs:text-lg iphone:text-base focus:text-base'
      : '';
    
    const heightStyles = mobileOptimized 
      ? 'h-10 xs:h-12 iphone:h-12'
      : '';
    
    return (
      <div className={`${widthStyles} ${className}`}>
        {label && (
          <label className="block text-sm font-medium text-gray-300 mb-1 iphone:text-base">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            className={`${baseStyles} ${paddingStyles} ${rightPaddingStyles} py-3 ${errorStyles} ${mobileStyles} ${heightStyles}`}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1 text-sm text-red-500 iphone:text-base">{error}</p>
        )}
      </div>
    );
  }
); 