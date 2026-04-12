import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    fullWidth?: boolean;
    children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    className = '',
    children,
    disabled,
    ...props
}) => {
    const baseStyles = 'font-bold rounded-xl transition-all duration-200 flex items-center justify-center';

    const variantStyles = {
        primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg disabled:bg-slate-400 disabled:cursor-not-allowed',
        secondary: 'bg-slate-200 hover:bg-slate-300 text-slate-800 border border-slate-300 disabled:bg-slate-100 disabled:cursor-not-allowed',
        ghost: 'bg-transparent hover:bg-slate-100 text-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed',
    };

    const sizeStyles = {
        sm: 'px-3 py-2 text-sm',
        md: 'px-4 py-2.5 text-base',
        lg: 'px-6 py-3 text-lg',
    };

    const widthStyle = fullWidth ? 'w-full' : '';

    return (
        <button
            className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyle} ${className}`}
            disabled={disabled}
            {...props}
        >
            {children}
        </button>
    );
};
