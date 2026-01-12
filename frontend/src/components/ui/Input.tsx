import React, { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
}

export const Input: React.FC<InputProps> = ({
    label,
    error,
    helperText,
    className = '',
    ...props
}) => {
    return (
        <div className="w-full">
            {label && (
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {label}
                    {props.required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            <input
                className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border ${error ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'
                    } rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${className}`}
                {...props}
            />
            {error && (
                <p className="text-xs text-red-500 mt-1">{error}</p>
            )}
            {helperText && !error && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{helperText}</p>
            )}
        </div>
    );
};

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    helperText?: string;
}

export const Select: React.FC<SelectProps> = ({
    label,
    error,
    helperText,
    className = '',
    children,
    ...props
}) => {
    return (
        <div className="w-full">
            {label && (
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {label}
                    {props.required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            <select
                className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border ${error ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'
                    } rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${className}`}
                {...props}
            >
                {children}
            </select>
            {error && (
                <p className="text-xs text-red-500 mt-1">{error}</p>
            )}
            {helperText && !error && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{helperText}</p>
            )}
        </div>
    );
};

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
    helperText?: string;
}

export const Textarea: React.FC<TextareaProps> = ({
    label,
    error,
    helperText,
    className = '',
    ...props
}) => {
    return (
        <div className="w-full">
            {label && (
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {label}
                    {props.required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            <textarea
                className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border ${error ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'
                    } rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none ${className}`}
                {...props}
            />
            {error && (
                <p className="text-xs text-red-500 mt-1">{error}</p>
            )}
            {helperText && !error && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{helperText}</p>
            )}
        </div>
    );
};
