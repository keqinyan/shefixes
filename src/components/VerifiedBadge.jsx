import React from 'react';
import { ShieldCheck } from 'lucide-react';

/**
 * VerifiedBadge Component
 *
 * 显示在已通过自拍验证的用户/技师头像旁边的安全标识
 */
const VerifiedBadge = ({ size = 'md', region = 'us' }) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8'
  };

  const tooltips = {
    us: 'Verified with selfie authentication',
    cn: '已通过自拍验证'
  };

  return (
    <div
      className="inline-flex items-center justify-center bg-green-500 rounded-full p-1 shadow-sm"
      title={tooltips[region] || tooltips.us}
    >
      <ShieldCheck
        className={`text-white ${sizes[size] || sizes.md}`}
      />
    </div>
  );
};

export default VerifiedBadge;
