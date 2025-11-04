import { useEffect } from 'react';

/**
 * Google reCAPTCHA v3 组件
 *
 * 使用步骤：
 * 1. 去 https://www.google.com/recaptcha/admin 注册获取 Site Key 和 Secret Key
 * 2. 将 Site Key 添加到环境变量 VITE_RECAPTCHA_SITE_KEY
 * 3. 在需要的表单中使用此组件
 *
 * 注意：reCAPTCHA v3 无需用户点击，自动在后台运行
 */

// reCAPTCHA v3 配置
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || 'your-site-key-here';

// 加载 reCAPTCHA 脚本
export const loadRecaptcha = () => {
  return new Promise((resolve, reject) => {
    if (window.grecaptcha) {
      resolve(window.grecaptcha);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;
    script.onload = () => {
      window.grecaptcha.ready(() => {
        resolve(window.grecaptcha);
      });
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

// 执行 reCAPTCHA 验证
export const executeRecaptcha = async (action = 'submit') => {
  try {
    await loadRecaptcha();
    const token = await window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action });
    return token;
  } catch (error) {
    console.error('reCAPTCHA error:', error);
    return null;
  }
};

// Hook: 在组件加载时初始化 reCAPTCHA
export const useRecaptcha = () => {
  useEffect(() => {
    loadRecaptcha();
  }, []);

  return executeRecaptcha;
};

/**
 * 在后端验证 reCAPTCHA token
 *
 * 注意：这个验证必须在服务端进行（Supabase Edge Function 或 Cloudflare Worker）
 *
 * 示例代码（Supabase Edge Function）：
 *
 * ```javascript
 * const verifyRecaptcha = async (token) => {
 *   const secretKey = Deno.env.get('RECAPTCHA_SECRET_KEY');
 *
 *   const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
 *     body: `secret=${secretKey}&response=${token}`
 *   });
 *
 *   const data = await response.json();
 *
 *   // score: 0.0 (机器人) 到 1.0 (人类)
 *   // 建议阈值：0.5
 *   return data.success && data.score >= 0.5;
 * };
 * ```
 */

export default {
  loadRecaptcha,
  executeRecaptcha,
  useRecaptcha
};
