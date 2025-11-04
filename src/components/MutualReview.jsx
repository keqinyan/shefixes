import React, { useState } from 'react';
import { Star, ThumbsUp, Clock, Smile, Frown, AlertTriangle } from 'lucide-react';

/**
 * 双向评价组件
 * @param {string} reviewerType - 'user' 或 'technician'
 * @param {string} reviewedName - 被评价人姓名
 * @param {function} onSubmit - 提交回调 (rating, comment, tags) => {}
 * @param {function} onCancel - 取消回调
 * @param {string} region - 语言区域 'us' 或 'cn'
 */
const MutualReview = ({
  reviewerType = 'user',
  reviewedName = '',
  onSubmit,
  onCancel,
  region = 'us'
}) => {
  const [rating, setRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);

  // 标签选项（根据评价者类型不同）
  const tagOptions = {
    user: {
      us: {
        positive: ['Professional', 'On Time', 'Friendly', 'Quality Work', 'Fair Price', 'Clean'],
        negative: ['Late', 'Rude', 'Poor Quality', 'Overcharged', 'Messy', 'Unprofessional']
      },
      cn: {
        positive: ['专业', '准时', '友好', '质量好', '价格公道', '整洁'],
        negative: ['迟到', '态度差', '质量差', '乱收费', '不整洁', '不专业']
      }
    },
    technician: {
      us: {
        positive: ['Cooperative', 'Friendly', 'On Time', 'Clear Communication', 'Respectful', 'Paid Promptly'],
        negative: ['No Show', 'Rude', 'Late', 'Poor Communication', 'Disrespectful', 'Payment Issue']
      },
      cn: {
        positive: ['配合', '友好', '准时', '沟通清晰', '尊重', '及时付款'],
        negative: ['爽约', '无礼', '迟到', '沟通不畅', '不尊重', '付款问题']
      }
    }
  };

  const tags = tagOptions[reviewerType][region];
  const currentTags = rating >= 4 ? tags.positive : tags.negative;

  const toggleTag = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = () => {
    if (rating === 0) {
      alert(region === 'us' ? 'Please select a rating' : '请选择评分');
      return;
    }
    onSubmit(rating, comment, selectedTags);
  };

  const text = {
    us: {
      title: reviewerType === 'user' ? 'Review Technician' : 'Review Customer',
      ratingLabel: 'Your Rating',
      selectTags: 'Select tags (optional)',
      commentLabel: 'Additional Comments (optional)',
      commentPlaceholder: 'Share more details about your experience...',
      submitBtn: 'Submit Review',
      cancelBtn: 'Cancel',
      reviewFor: 'Review for'
    },
    cn: {
      title: reviewerType === 'user' ? '评价技师' : '评价客户',
      ratingLabel: '您的评分',
      selectTags: '选择标签（可选）',
      commentLabel: '补充评价（可选）',
      commentPlaceholder: '分享更多体验细节...',
      submitBtn: '提交评价',
      cancelBtn: '取消',
      reviewFor: '评价'
    }
  };

  const t = text[region];

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-2xl w-full">
      {/* 标题 */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">{t.title}</h2>
        <p className="text-gray-600">
          {t.reviewFor}: <span className="font-semibold text-gray-900">{reviewedName}</span>
        </p>
      </div>

      {/* 星级评分 */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          {t.ratingLabel}
        </label>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              onMouseEnter={() => setHoveredRating(value)}
              onMouseLeave={() => setHoveredRating(0)}
              className="transition-transform hover:scale-110 focus:outline-none"
            >
              <Star
                size={40}
                className={`${
                  (hoveredRating || rating) >= value
                    ? 'text-yellow-400 fill-yellow-400'
                    : 'text-gray-300'
                } transition-colors`}
              />
            </button>
          ))}
          <span className="ml-4 text-2xl font-bold text-gray-700">
            {rating > 0 ? `${rating}.0` : '-'}
          </span>
        </div>
        {/* 评分描述 */}
        <div className="mt-2 text-sm text-gray-600 flex items-center gap-2">
          {rating === 5 && (
            <>
              <Smile className="text-green-500" size={20} />
              <span className="font-medium text-green-600">
                {region === 'us' ? 'Excellent!' : '非常好！'}
              </span>
            </>
          )}
          {rating === 4 && (
            <>
              <ThumbsUp className="text-blue-500" size={20} />
              <span className="font-medium text-blue-600">
                {region === 'us' ? 'Good!' : '不错！'}
              </span>
            </>
          )}
          {rating === 3 && (
            <>
              <Clock className="text-yellow-500" size={20} />
              <span className="font-medium text-yellow-600">
                {region === 'us' ? 'Okay' : '一般'}
              </span>
            </>
          )}
          {rating <= 2 && rating > 0 && (
            <>
              <Frown className="text-red-500" size={20} />
              <span className="font-medium text-red-600">
                {region === 'us' ? 'Needs Improvement' : '不太好'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* 标签选择 */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          {t.selectTags}
        </label>
        <div className="flex flex-wrap gap-2">
          {currentTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedTags.includes(tag)
                  ? rating >= 4
                    ? 'bg-green-500 text-white'
                    : 'bg-red-500 text-white'
                  : rating >= 4
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-red-100 text-red-700 hover:bg-red-200'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* 文字评价 */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          {t.commentLabel}
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t.commentPlaceholder}
          rows={4}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
        />
        <div className="text-right text-xs text-gray-500 mt-1">
          {comment.length} {region === 'us' ? 'characters' : '字'}
        </div>
      </div>

      {/* 按钮 */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold transition"
        >
          {t.cancelBtn}
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="flex-1 bg-pink-500 hover:bg-pink-600 text-white px-6 py-3 rounded-lg font-semibold transition"
        >
          {t.submitBtn}
        </button>
      </div>
    </div>
  );
};

export default MutualReview;
