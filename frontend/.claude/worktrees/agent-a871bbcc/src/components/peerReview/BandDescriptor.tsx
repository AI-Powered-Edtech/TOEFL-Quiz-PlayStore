import React from 'react';

interface BandDescriptorProps {
    band: number;
}

export const BandDescriptor: React.FC<BandDescriptorProps> = ({ band }) => {
    const getDescriptor = (score: number): { level: string; description: string; color: string } => {
        if (score >= 8.5) {
            return {
                level: 'Expert User',
                description: 'Fully operational command with only occasional unsystematic inaccuracies.',
                color: 'green'
            };
        } else if (score >= 7.5) {
            return {
                level: 'Very Good User',
                description: 'Operational command with occasional inaccuracies in unfamiliar situations.',
                color: 'blue'
            };
        } else if (score >= 6.5) {
            return {
                level: 'Competent User',
                description: 'Generally effective command despite some inaccuracies and misunderstandings.',
                color: 'cyan'
            };
        } else if (score >= 5.5) {
            return {
                level: 'Modest User',
                description: 'Partial command with frequent problems, but conveys basic meaning.',
                color: 'yellow'
            };
        } else if (score >= 4.5) {
            return {
                level: 'Limited User',
                description: 'Basic competence limited to familiar situations with frequent breakdowns.',
                color: 'orange'
            };
        } else {
            return {
                level: 'Extremely Limited User',
                description: 'Conveys only general meaning in very familiar situations.',
                color: 'red'
            };
        }
    };

    const descriptor = getDescriptor(band);

    const colorClasses = {
        green: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300',
        blue: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
        cyan: 'bg-cyan-50 dark:bg-cyan-950 border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300',
        yellow: 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300',
        orange: 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300',
        red: 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
    };

    return (
        <div className={`p-4 rounded-xl border ${colorClasses[descriptor.color as keyof typeof colorClasses]}`}>
            <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-bold opacity-70">BAND DESCRIPTOR</div>
                <div className="text-lg font-black">{band}</div>
            </div>
            <div className="font-bold text-sm mb-1">{descriptor.level}</div>
            <div className="text-xs opacity-80">{descriptor.description}</div>
        </div>
    );
};
