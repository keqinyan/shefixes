// miniprogram/utils/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hixmjkytrbthobllqrqo.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpeG1qa3l0cmJ0aG9ibGxxcnFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxOTI0NzgsImV4cCI6MjA3Nzc2ODQ3OH0.GEzRUTUUHa0p5DXMc36xP3FyH-uzPGJIpWOukEC1_mY'

// 微信小程序的 fetch 适配器
class WechatFetchAdapter {
  async fetch(url, options = {}) {
    return new Promise((resolve, reject) => {
      wx.request({
        url,
        method: options.method || 'GET',
        data: options.body,
        header: options.headers,
        success: (res) => {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            statusText: res.errMsg,
            headers: new Map(Object.entries(res.header)),
            json: async () => res.data,
            text: async () => JSON.stringify(res.data)
          })
        },
        fail: reject
      })
    })
  }
}

// 创建 Supabase 客户端
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: {
      getItem: (key) => wx.getStorageSync(key) || null,
      setItem: (key, value) => wx.setStorageSync(key, value),
      removeItem: (key) => wx.removeStorageSync(key)
    },
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  },
  global: {
    fetch: (...args) => new WechatFetchAdapter().fetch(...args)
  }
})
