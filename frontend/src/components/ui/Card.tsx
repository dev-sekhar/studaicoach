import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    hover?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className = '', hover = false }) => {
    return (
        <div
            className={`bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 ${hover ? 'hover:shadow-lg transition-all' : ''
                } ${className}`}
        >
            {children}
        </div>
    );
};

interface CardHeaderProps {
    title: string;
    description?: string;
    action?: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ title, description, action }) => {
    return (
        <div className="flex items-center justify-between mb-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h2>
                {description && (
                    <p className="text-slate-600 dark:text-slate-400 mt-1">{description}</p>
                )}
            </div>
            {action && <div>{action}</div>}
        </div>
    );
};

interface IconCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    href?: string;
    onClick?: () => void;
    iconBgColor?: string;
    iconColor?: string;
}

export const IconCard: React.FC<IconCardProps> = ({
    icon,
    title,
    description,
    href,
    onClick,
    iconBgColor = 'bg-blue-100 dark:bg-blue-900/20',
    iconColor = 'text-blue-600 dark:text-blue-400',
}) => {
    const content = (
        <>
            <div className={`w-12 h-12 ${iconBgColor} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <div className={iconColor}>{icon}</div>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                {title}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
                {description}
            </p>
        </>
    );

    if (href) {
        return (
            <a
                href={href}
                className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all group block"
            >
                {content}
            </a>
        );
    }

    return (
        <div
            onClick={onClick}
            className={`bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 ${onClick ? 'hover:shadow-lg cursor-pointer' : ''
                } transition-all group`}
        >
            {content}
        </div>
    );
};
