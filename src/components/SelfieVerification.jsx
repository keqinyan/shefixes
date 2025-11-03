import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';

/**
 * SelfieVerification Component
 *
 * 强制用户使用相机现场拍摄自拍照进行身份验证
 * - 禁止从相册上传
 * - 必须使用设备相机实时拍摄
 * - 上传到 Supabase Storage
 * - 更新用户/技师的验证状态
 */
const SelfieVerification = ({ userId, userType = 'user', onVerificationComplete, onClose, region = 'us' }) => {
  const [step, setStep] = useState('intro'); // intro, camera, captured, uploading, success, error
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // 多语言文本
  const texts = {
    us: {
      title: 'Selfie Verification',
      description: 'To ensure safety for both technicians and customers, we use secure selfie verification. Your photo is only used for identity confirmation and will not be publicly displayed.',
      startCamera: 'Start Camera',
      retake: 'Retake',
      confirm: 'Confirm & Upload',
      cancel: 'Cancel',
      captureSelfie: 'Capture Selfie',
      errors: {
        cameraPermission: 'Camera permission denied. Please enable camera access in your browser settings.',
        cameraNotFound: 'No camera found on this device.',
        uploadFailed: 'Failed to upload selfie. Please try again.',
        verificationFailed: 'Failed to update verification status. Please try again.'
      },
      success: 'Selfie verified successfully!',
      cameraReady: 'Position your face in the frame and take a selfie',
      previewTitle: 'Preview your selfie',
      previewDescription: 'Make sure your face is clearly visible'
    },
    cn: {
      title: '自拍验证',
      description: '为了让技师和客户都更安心，我们采用安全自拍验证。您的照片只用于身份确认，不会公开展示。',
      startCamera: '开启相机',
      retake: '重新拍摄',
      confirm: '确认上传',
      cancel: '取消',
      captureSelfie: '拍摄自拍',
      errors: {
        cameraPermission: '相机权限被拒绝。请在浏览器设置中启用相机访问权限。',
        cameraNotFound: '未找到相机设备。',
        uploadFailed: '上传自拍失败，请重试。',
        verificationFailed: '更新验证状态失败，请重试。'
      },
      success: '自拍验证成功！',
      cameraReady: '将您的面部放在框内并拍摄自拍',
      previewTitle: '预览您的自拍',
      previewDescription: '请确保面部清晰可见'
    }
  };

  const t = texts[region] || texts.us;

  // 清理摄像头流
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // 启动相机
  const startCamera = async () => {
    try {
      setError('');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user', // 前置摄像头
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStep('camera');
    } catch (err) {
      console.error('Camera access error:', err);
      if (err.name === 'NotAllowedError') {
        setError(t.errors.cameraPermission);
      } else if (err.name === 'NotFoundError') {
        setError(t.errors.cameraNotFound);
      } else {
        setError(err.message);
      }
      setStep('error');
    }
  };

  // 拍摄照片
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // 设置 canvas 尺寸与视频相同
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // 绘制当前视频帧到 canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // 将 canvas 转换为 blob
    canvas.toBlob((blob) => {
      setCapturedImage(blob);
      setStep('captured');

      // 停止摄像头流
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    }, 'image/jpeg', 0.95);
  };

  // 重新拍摄
  const retake = () => {
    setCapturedImage(null);
    startCamera();
  };

  // 上传并验证
  const uploadAndVerify = async () => {
    if (!capturedImage) return;

    setUploading(true);
    setError('');

    try {
      // 1. 上传到 Supabase Storage
      const fileName = `${userType}_${userId}_${Date.now()}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('selfie-verifications')
        .upload(fileName, capturedImage, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // 2. 获取公开 URL
      const { data: urlData } = supabase.storage
        .from('selfie-verifications')
        .getPublicUrl(fileName);

      const photoUrl = urlData.publicUrl;

      // 3. 更新用户/技师表的验证状态
      const tableName = userType === 'user' ? 'users' : 'technicians';
      const { error: updateError } = await supabase
        .from(tableName)
        .update({
          selfie_verified: true,
          selfie_photo_url: photoUrl,
          selfie_verified_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      setStep('success');

      // 2秒后回调并关闭
      setTimeout(() => {
        onVerificationComplete && onVerificationComplete(photoUrl);
      }, 2000);

    } catch (err) {
      console.error('Upload/verification error:', err);
      setError(t.errors.uploadFailed);
      setStep('error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Camera className="w-6 h-6 text-pink-600" />
            {t.title}
          </h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Intro Step */}
          {step === 'intro' && (
            <div className="text-center space-y-6">
              <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
                <p className="text-gray-700 leading-relaxed">
                  {t.description}
                </p>
              </div>

              <div className="flex justify-center">
                <Camera className="w-24 h-24 text-pink-400" />
              </div>

              <button
                onClick={startCamera}
                className="w-full bg-pink-600 text-white py-3 rounded-lg hover:bg-pink-700 transition flex items-center justify-center gap-2 text-lg font-semibold"
              >
                <Camera className="w-5 h-5" />
                {t.startCamera}
              </button>

              {onClose && (
                <button
                  onClick={onClose}
                  className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 transition"
                >
                  {t.cancel}
                </button>
              )}
            </div>
          )}

          {/* Camera Step */}
          {step === 'camera' && (
            <div className="space-y-4">
              <p className="text-center text-gray-600">{t.cameraReady}</p>

              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-auto"
                />
                <canvas ref={canvasRef} className="hidden" />
              </div>

              <button
                onClick={capturePhoto}
                className="w-full bg-pink-600 text-white py-3 rounded-lg hover:bg-pink-700 transition flex items-center justify-center gap-2 text-lg font-semibold"
              >
                <Camera className="w-5 h-5" />
                {t.captureSelfie}
              </button>

              {onClose && (
                <button
                  onClick={onClose}
                  className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 transition"
                >
                  {t.cancel}
                </button>
              )}
            </div>
          )}

          {/* Captured Step */}
          {step === 'captured' && capturedImage && (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <p className="font-semibold text-gray-800">{t.previewTitle}</p>
                <p className="text-sm text-gray-600">{t.previewDescription}</p>
              </div>

              <div className="relative bg-black rounded-lg overflow-hidden">
                <img
                  src={URL.createObjectURL(capturedImage)}
                  alt="Captured selfie"
                  className="w-full h-auto"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={retake}
                  className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 transition"
                >
                  {t.retake}
                </button>
                <button
                  onClick={uploadAndVerify}
                  disabled={uploading}
                  className="flex-1 bg-pink-600 text-white py-3 rounded-lg hover:bg-pink-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? '...' : t.confirm}
                </button>
              </div>
            </div>
          )}

          {/* Success Step */}
          {step === 'success' && (
            <div className="text-center space-y-4 py-8">
              <CheckCircle className="w-20 h-20 text-green-500 mx-auto" />
              <h3 className="text-2xl font-bold text-gray-800">{t.success}</h3>
              <p className="text-gray-600">Redirecting...</p>
            </div>
          )}

          {/* Error Step */}
          {step === 'error' && (
            <div className="text-center space-y-4 py-8">
              <AlertCircle className="w-20 h-20 text-red-500 mx-auto" />
              <h3 className="text-xl font-bold text-gray-800">Error</h3>
              <p className="text-red-600">{error}</p>
              <button
                onClick={() => setStep('intro')}
                className="w-full bg-pink-600 text-white py-3 rounded-lg hover:bg-pink-700 transition"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SelfieVerification;
