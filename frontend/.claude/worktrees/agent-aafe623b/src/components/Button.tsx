import { Loader2 } from 'lucide-react';
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading,
  className = '',
  disabled,
  // @ts-ignore - fullWidth might be passed but not in interface
  fullWidth,
  ...props
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";

  const sizes = {
    sm: "px-3 py-2 text-sm min-h-[32px]",
    md: "px-4 py-3 text-base min-h-[44px]", // Min-height 44px for touch targets
    lg: "px-6 py-4 text-lg min-h-[56px]"
  };

  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-800 shadow-md",
    secondary: "bg-blue-50 text-blue-600 hover:opacity-90",
    outline: "border-2 border-blue-600 text-blue-600 hover:bg-blue-50",
    ghost: "text-slate-500 hover:text-blue-600 hover:bg-blue-50"
  };

  return (
    <button
      className={`${baseStyles} ${sizes[size]} ${variants[variant]} ${className}`}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {children}
    </button>
  );
};