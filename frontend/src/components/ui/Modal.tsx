import React from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    size = 'md',
}) => {
    if (!isOpen) return null;

    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className={`bg-white dark:bg-slate-800 rounded-2xl p-8 ${sizeClasses[size]} w-full mx-4`}>
                <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">
                    {title}
                </h2>
                {children}
            </div>
        </div>
    );
};

interface ModalFooterProps {
    children: React.ReactNode;
}

export const ModalFooter: React.FC<ModalFooterProps> = ({ children }) => {
    return (
        <div className="flex gap-4 pt-4">
            {children}
        </div>
    );
};
