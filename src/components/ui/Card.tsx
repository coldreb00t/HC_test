import React, { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
  compact?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  onClick,
  hoverable = false,
  compact = false,
}) => {
  const baseStyles = 'bg-white/10 backdrop-blur-lg rounded-2xl shadow-lg overflow-hidden';
  const hoverStyles = hoverable ? 'hover:bg-white/15 active:bg-white/20 transition-colors cursor-pointer' : '';
  const compactStyles = compact ? 'xs:p-2 iphone:p-3' : '';
  
  return (
    <div 
      className={`${baseStyles} ${hoverStyles} ${compactStyles} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
  compact?: boolean;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  children,
  className = '',
  compact = false,
}) => {
  const compactStyles = compact ? 'xs:p-3 iphone:p-4' : 'p-6';
  
  return (
    <div className={`${compactStyles} border-b border-white/10 ${className}`}>
      {children}
    </div>
  );
};

interface CardBodyProps {
  children: ReactNode;
  className?: string;
  compact?: boolean;
}

export const CardBody: React.FC<CardBodyProps> = ({
  children,
  className = '',
  compact = false,
}) => {
  const compactStyles = compact ? 'xs:p-3 iphone:p-4' : 'p-6';
  
  return (
    <div className={`${compactStyles} ${className}`}>
      {children}
    </div>
  );
};

interface CardFooterProps {
  children: ReactNode;
  className?: string;
  compact?: boolean;
}

export const CardFooter: React.FC<CardFooterProps> = ({
  children,
  className = '',
  compact = false,
}) => {
  const compactStyles = compact ? 'xs:p-3 iphone:p-4' : 'p-6';
  
  return (
    <div className={`${compactStyles} border-t border-white/10 ${className}`}>
      {children}
    </div>
  );
}; 