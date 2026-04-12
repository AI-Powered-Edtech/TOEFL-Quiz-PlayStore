import React from 'react';

interface AdminAuthGateProps {
    children: React.ReactNode;
}

export const AdminAuthGate: React.FC<AdminAuthGateProps> = ({ children }) => {
    return <>{children}</>;
};