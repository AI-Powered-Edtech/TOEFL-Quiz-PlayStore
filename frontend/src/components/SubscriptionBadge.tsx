/**
 * SubscriptionBadge
 * 
 * Small badge component showing current subscription tier.
 * Used in Profile, Dashboard headers, etc.
 */

import { Crown, Gem } from 'lucide-react';
import React from 'react';

import { type SubscriptionTier, getTierDisplayName, getTierColor } from '../services/subscriptionService';

interface SubscriptionBadgeProps {
    tier: SubscriptionTier;
    size?: 'sm' | 'md';
    onClick?: () => void;
}

const SubscriptionBadge: React.FC<SubscriptionBadgeProps> = ({ tier, size = 'sm', onClick }) => {
    if (tier === 'free') return null; // Don't show badge for free users

    const isC2 = tier === 'c2';
    const Icon = isC2 ? Crown : Gem;
    const fontSize = size === 'sm' ? 10 : 12;
    const iconSize = size === 'sm' ? 12 : 14;
    const padding = size === 'sm' ? '2px 8px 2px 6px' : '4px 10px 4px 8px';

    return (
        <span
            onClick={onClick}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding,
                borderRadius: 20,
                background: isC2
                    ? 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(239,68,68,0.2))'
                    : 'rgba(59,130,246,0.15)',
                border: `1px solid ${isC2 ? 'rgba(245,158,11,0.3)' : 'rgba(59,130,246,0.3)'}`,
                cursor: onClick ? 'pointer' : 'default',
            }}
        >
            <Icon size={iconSize} color={getTierColor(tier)} />
            <span style={{
                fontSize,
                fontWeight: 700,
                color: getTierColor(tier),
                letterSpacing: '0.5px',
            }}>
                {getTierDisplayName(tier)}
            </span>
        </span>
    );
};

export default SubscriptionBadge;
