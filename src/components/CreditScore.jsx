import React from 'react';
import { Star, TrendingUp, TrendingDown, Shield } from 'lucide-react';

/**
 * 信用分显示组件
 * @param {number} score - 信用分 (0-100)
 * @param {string} size - 尺寸: 'sm', 'md', 'lg'
 * @param {boolean} showDetails - 是否显示详细信息
 * @param {object} stats - 统计信息（可选）
 * @param {string} region - 语言区域 'us' 或 'cn'
 */
const CreditScore = ({
  score = 100,
  size = 'md',
  showDetails = false,
  stats = {},
  region = 'us'
}) => {
  // 根据分数确定等级和颜色
  const getScoreLevel = (score) => {
    if (score >= 90) return {
      label: region === 'us' ? 'Excellent' : '优秀',
      color: 'text-green-600',
      bg: 'bg-green-100',
      icon: '🏆',
      badge: region === 'us' ? 'Gold Member' : '金牌用户'
    };
    if (score >= 70) return {
      label: region === 'us' ? 'Good' : '良好',
      color: 'text-blue-600',
      bg: 'bg-blue-100',
      icon: '⭐',
      badge: region === 'us' ? 'Silver Member' : '银牌用户'
    };
    if (score >= 50) return {
      label: region === 'us' ? 'Fair' : '一般',
      color: 'text-yellow-600',
      bg: 'bg-yellow-100',
      icon: '📊',
      badge: region === 'us' ? 'Bronze Member' : '铜牌用户'
    };
    return {
      label: region === 'us' ? 'Poor' : '较差',
      color: 'text-red-600',
      bg: 'bg-red-100',
      icon: '⚠️',
      badge: region === 'us' ? 'Restricted' : '受限用户'
    };
  };

  const level = getScoreLevel(score);

  // 尺寸配置
  const sizeConfig = {
    sm: {
      container: 'w-16 h-16',
      text: 'text-xl',
      label: 'text-xs',
      badge: 'text-xs px-2 py-1'
    },
    md: {
      container: 'w-20 h-20',
      text: 'text-2xl',
      label: 'text-sm',
      badge: 'text-sm px-3 py-1'
    },
    lg: {
      container: 'w-28 h-28',
      text: 'text-4xl',
      label: 'text-base',
      badge: 'text-base px-4 py-2'
    }
  };

  const config = sizeConfig[size];

  return (
    <div className="flex flex-col items-center gap-2">
      {/* 信用分圆形显示 */}
      <div className={`${config.container} relative`}>
        {/* 背景圆圈 */}
        <svg className="transform -rotate-90 w-full h-full">
          <circle
            cx="50%"
            cy="50%"
            r="45%"
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            className="text-gray-200"
          />
          {/* 进度圆圈 */}
          <circle
            cx="50%"
            cy="50%"
            r="45%"
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={`${2 * Math.PI * 45} ${2 * Math.PI * 45}`}
            strokeDashoffset={`${2 * Math.PI * 45 * (1 - score / 100)}`}
            className={level.color}
            strokeLinecap="round"
          />
        </svg>
        {/* 中心分数 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-bold ${config.text} ${level.color}`}>
            {score}
          </span>
          <span className={`${config.label} text-gray-500 font-medium`}>
            {region === 'us' ? 'Score' : '信用分'}
          </span>
        </div>
      </div>

      {/* 等级徽章 */}
      <div className={`${level.bg} ${level.color} rounded-full font-semibold ${config.badge} flex items-center gap-1`}>
        <span>{level.icon}</span>
        <span>{level.label}</span>
      </div>

      {/* 详细统计 */}
      {showDetails && stats && (
        <div className="w-full mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            {stats.totalOrders !== undefined && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-gray-500 text-xs mb-1">
                  {region === 'us' ? 'Total Orders' : '总订单'}
                </p>
                <p className="font-bold text-lg">{stats.totalOrders}</p>
              </div>
            )}
            {stats.completedOrders !== undefined && (
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-gray-500 text-xs mb-1">
                  {region === 'us' ? 'Completed' : '已完成'}
                </p>
                <p className="font-bold text-lg text-green-600">{stats.completedOrders}</p>
              </div>
            )}
            {stats.onTimeRate !== undefined && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-gray-500 text-xs mb-1">
                  {region === 'us' ? 'On-Time Rate' : '准时率'}
                </p>
                <p className="font-bold text-lg text-blue-600">{stats.onTimeRate}%</p>
              </div>
            )}
            {stats.positiveReviews !== undefined && (
              <div className="bg-yellow-50 p-3 rounded-lg">
                <p className="text-gray-500 text-xs mb-1">
                  {region === 'us' ? 'Positive Reviews' : '好评'}
                </p>
                <p className="font-bold text-lg text-yellow-600 flex items-center gap-1">
                  <Star size={16} className="fill-yellow-400" />
                  {stats.positiveReviews}
                </p>
              </div>
            )}
          </div>

          {/* 信用分趋势 */}
          {stats.trend !== undefined && (
            <div className={`p-3 rounded-lg flex items-center gap-2 ${
              stats.trend > 0 ? 'bg-green-50 text-green-700' :
              stats.trend < 0 ? 'bg-red-50 text-red-700' :
              'bg-gray-50 text-gray-700'
            }`}>
              {stats.trend > 0 ? <TrendingUp size={18} /> :
               stats.trend < 0 ? <TrendingDown size={18} /> :
               <Shield size={18} />}
              <span className="text-sm font-semibold">
                {stats.trend > 0 ? `+${stats.trend}` : stats.trend} {region === 'us' ? 'points this month' : '分 本月'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CreditScore;
