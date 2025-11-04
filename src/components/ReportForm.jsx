import React, { useState } from 'react';
import { AlertTriangle, Upload, X } from 'lucide-react';

/**
 * 举报表单组件
 * @param {string} reporterType - 'user' 或 'technician'
 * @param {string} reportedName - 被举报人姓名
 * @param {string} reportedId - 被举报人ID
 * @param {string} bookingId - 相关订单ID（可选）
 * @param {function} onSubmit - 提交回调 (category, reason, evidenceUrls) => {}
 * @param {function} onCancel - 取消回调
 * @param {string} region - 语言区域 'us' 或 'cn'
 */
const ReportForm = ({
  reporterType = 'user',
  reportedName = '',
  reportedId,
  reportedType,
  bookingId = null,
  onSubmit,
  onCancel,
  region = 'us'
}) => {
  const [category, setCategory] = useState('');
  const [reason, setReason] = useState('');
  const [evidenceUrls, setEvidenceUrls] = useState([]);

  // 举报类别（根据举报者类型不同）
  const categories = {
    user: {
      us: [
        { value: 'poor_service', label: 'Poor Service Quality' },
        { value: 'overcharge', label: 'Overcharging' },
        { value: 'rude', label: 'Rude Behavior' },
        { value: 'harassment', label: 'Harassment' },
        { value: 'no_show', label: 'No Show' },
        { value: 'safety_concern', label: 'Safety Concern' },
        { value: 'other', label: 'Other' }
      ],
      cn: [
        { value: 'poor_service', label: '服务质量差' },
        { value: 'overcharge', label: '乱收费' },
        { value: 'rude', label: '态度恶劣' },
        { value: 'harassment', label: '骚扰' },
        { value: 'no_show', label: '爽约' },
        { value: 'safety_concern', label: '安全问题' },
        { value: 'other', label: '其他' }
      ]
    },
    technician: {
      us: [
        { value: 'no_show', label: 'Customer No Show' },
        { value: 'harassment', label: 'Harassment' },
        { value: 'malicious_review', label: 'Malicious Review' },
        { value: 'non_payment', label: 'Payment Issue' },
        { value: 'unsafe_environment', label: 'Unsafe Work Environment' },
        { value: 'other', label: 'Other' }
      ],
      cn: [
        { value: 'no_show', label: '客户爽约' },
        { value: 'harassment', label: '骚扰' },
        { value: 'malicious_review', label: '恶意差评' },
        { value: 'non_payment', label: '拒不付款' },
        { value: 'unsafe_environment', label: '不安全工作环境' },
        { value: 'other', label: '其他' }
      ]
    }
  };

  const reportCategories = categories[reporterType][region];

  const text = {
    us: {
      title: 'Report an Issue',
      reportingLabel: 'Reporting',
      categoryLabel: 'Issue Category',
      categoryPlaceholder: 'Select a category...',
      reasonLabel: 'Detailed Description',
      reasonPlaceholder: 'Please provide as much detail as possible to help us investigate...',
      evidenceLabel: 'Evidence (Screenshots, Photos)',
      evidenceHelp: 'Upload any supporting evidence',
      submitBtn: 'Submit Report',
      cancelBtn: 'Cancel',
      warningTitle: 'Important Notice',
      warningText: 'False reports may result in account suspension. Please only submit legitimate concerns.',
      minChars: 'Minimum 20 characters required'
    },
    cn: {
      title: '举报问题',
      reportingLabel: '举报对象',
      categoryLabel: '问题类别',
      categoryPlaceholder: '选择类别...',
      reasonLabel: '详细描述',
      reasonPlaceholder: '请尽可能详细地描述问题，以帮助我们调查...',
      evidenceLabel: '证据（截图、照片）',
      evidenceHelp: '上传相关证据',
      submitBtn: '提交举报',
      cancelBtn: '取消',
      warningTitle: '重要提示',
      warningText: '虚假举报可能导致账号被封禁。请仅提交真实问题。',
      minChars: '至少需要20个字符'
    }
  };

  const t = text[region];

  const handleSubmit = () => {
    if (!category) {
      alert(region === 'us' ? 'Please select a category' : '请选择类别');
      return;
    }
    if (reason.length < 20) {
      alert(t.minChars);
      return;
    }
    onSubmit({
      category,
      reason,
      evidenceUrls,
      reportedId,
      reportedType,
      bookingId
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      {/* 标题 */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2 text-red-600">
          <AlertTriangle size={28} />
          {t.title}
        </h2>
        <p className="text-gray-600">
          {t.reportingLabel}: <span className="font-semibold text-gray-900">{reportedName}</span>
        </p>
      </div>

      {/* 警告提示 */}
      <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
        <div className="flex items-start gap-3">
          <AlertTriangle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="font-semibold text-yellow-800 mb-1">{t.warningTitle}</h3>
            <p className="text-sm text-yellow-700">{t.warningText}</p>
          </div>
        </div>
      </div>

      {/* 类别选择 */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          {t.categoryLabel} <span className="text-red-500">*</span>
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <option value="">{t.categoryPlaceholder}</option>
          {reportCategories.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* 详细描述 */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          {t.reasonLabel} <span className="text-red-500">*</span>
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t.reasonPlaceholder}
          rows={6}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
        />
        <div className="text-right text-xs mt-1">
          <span className={reason.length < 20 ? 'text-red-500' : 'text-gray-500'}>
            {reason.length}/20 {region === 'us' ? 'characters' : '字'}
          </span>
        </div>
      </div>

      {/* 证据上传（简化版，仅显示提示） */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          {t.evidenceLabel}
        </label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <Upload className="mx-auto text-gray-400 mb-2" size={32} />
          <p className="text-sm text-gray-500">{t.evidenceHelp}</p>
          <p className="text-xs text-gray-400 mt-1">
            {region === 'us' ? 'Feature coming soon' : '功能即将上线'}
          </p>
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
          className="flex-1 bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-semibold transition"
        >
          {t.submitBtn}
        </button>
      </div>
    </div>
  );
};

export default ReportForm;
