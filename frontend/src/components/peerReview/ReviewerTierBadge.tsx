import React from 'react';

interface ReviewerTierBadgeProps {
    tier: string;
    totalReviews: number;
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
}

export const ReviewerTierBadge: React.FC<ReviewerTierBadgeProps> = ({
    tier,
    totalReviews,
    size = 'md',
    showLabel = true
}) => {
    const getTierConfig = (tierName: string) => {
        const configs = {
            'Novice': {
                emoji: '🥉',
                color: 'from-slate-400 to-slate-500',
                textColor: 'text-slate-700 dark:text-slate-300',
                borderColor: 'border-slate-300 dark:border-slate-600',
                bgColor: 'bg-slate-100 dark:bg-slate-800'
            },
            'Helper': {
                emoji: '🥈',
                color: 'from-slate-300 to-slate-400',
                textColor: 'text-slate-700 dark:text-slate-300',
                borderColor: 'border-slate-400 dark:border-slate-500',
                bgColor: 'bg-slate-50 dark:bg-slate-800'
            },
            'Mentor': {
                emoji: '🥇',
                color: 'from-yellow-400 to-yellow-500',
                textColor: 'text-yellow-900 dark:text-yellow-100',
                borderColor: 'border-yellow-400 dark:border-yellow-500',
                bgColor: 'bg-yellow-50 dark:bg-yellow-900/20'
            },
            'Expert': {
                emoji: '💎',
                color: 'from-cyan-400 to-blue-500',
                textColor: 'text-blue-900 dark:text-blue-100',
                borderColor: 'border-blue-400 dark:border-blue-500',
                bgColor: 'bg-blue-50 dark:bg-blue-900/20'
            },
            'Master': {
                emoji: '👑',
                color: 'from-purple-500 to-pink-500',
                textColor: 'text-purple-900 dark:text-purple-100',
                borderColor: 'border-purple-400 dark:border-purple-500',
                bgColor: 'bg-purple-50 dark:bg-purple-900/20'
            }
        };
        return configs[tierName as keyof typeof configs] || configs.Novice;
    };

    const config = getTierConfig(tier);

    const sizeClasses = {
        sm: {
            container: 'px-2 py-1',
            emoji: 'text-base',
            text: 'text-xs',
            count: 'text-[10px]'
        },
        md: {
            container: 'px-3 py-1.5',
            emoji: 'text-lg',
            text: 'text-sm',
            count: 'text-xs'
        },
        lg: {
            container: 'px-4 py-2',
            emoji: 'text-2xl',
            text: 'text-base',
            count: 'text-sm'
        }
    };

    const sizes = sizeClasses[size];

    return (
        <div className={`inline-flex items-center gap-2 ${config.bgColor} ${sizes.container} rounded-full border ${config.borderColor} shadow-sm`}>
            <span className={sizes.emoji}>{config.emoji}</span>
            {showLabel && (
                <div className="flex flex-col">
                    <span className={`font-bold ${config.textColor} ${sizes.text} leading-tight`}>
                        {tier}
                    </span>
                    <span className={`${config.textColor} ${sizes.count} opacity-70 leading-tight`}>
                        {totalReviews} review{totalReviews !== 1 ? 's' : ''}
                    </span>
                </div>
            )}
        </div>
    );
};
