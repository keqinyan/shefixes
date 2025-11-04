// miniprogram/app.js
import { supabase } from './utils/supabase'

App({
  globalData: {
    userInfo: null,
    isLoggedIn: false,
    supabaseUser: null,
    realnameVerified: false, // 替换原来的 selfie_verified
    hasCheckedAuth: false
  },

  async onLaunch() {
    console.log('SheFixes 小程序启动')

    // 检查本地存储的登录信息
    await this.checkAuth()

    // 监听认证状态变化
    this.setupAuthListener()
  },

  // 检查用户认证状态
  async checkAuth() {
    try {
      const token = wx.getStorageSync('supabase_token')
      const userId = wx.getStorageSync('user_id')

      if (token && userId) {
        // 验证 token 是否有效
        const { data: { user }, error } = await supabase.auth.getUser(token)

        if (!error && user) {
          this.globalData.supabaseUser = user
          this.globalData.isLoggedIn = true

          // 获取用户详细信息
          await this.fetchUserInfo(userId)
        } else {
          // Token 无效，清除本地存储
          this.clearAuth()
        }
      }

      this.globalData.hasCheckedAuth = true
    } catch (error) {
      console.error('检查认证状态失败:', error)
      this.globalData.hasCheckedAuth = true
    }
  },

  // 获取用户详细信息
  async fetchUserInfo(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error

      if (data) {
        this.globalData.userInfo = data
        this.globalData.realnameVerified = data.realname_verified || false

        // 保存到本地存储
        wx.setStorageSync('user_info', data)
      }
    } catch (error) {
      console.error('获取用户信息失败:', error)
    }
  },

  // 设置认证状态监听
  setupAuthListener() {
    supabase.auth.onAuthStateChange((event, session) => {
      console.log('认证状态变化:', event)

      if (event === 'SIGNED_IN') {
        this.globalData.isLoggedIn = true
        this.globalData.supabaseUser = session?.user

        if (session?.access_token) {
          wx.setStorageSync('supabase_token', session.access_token)
        }
      } else if (event === 'SIGNED_OUT') {
        this.clearAuth()
      }
    })
  },

  // 清除认证信息
  clearAuth() {
    this.globalData.userInfo = null
    this.globalData.isLoggedIn = false
    this.globalData.supabaseUser = null
    this.globalData.realnameVerified = false

    wx.removeStorageSync('supabase_token')
    wx.removeStorageSync('user_id')
    wx.removeStorageSync('user_info')
  },

  // 登录成功后保存用户信息
  async setUserInfo(user) {
    this.globalData.userInfo = user
    this.globalData.isLoggedIn = true
    this.globalData.realnameVerified = user.realname_verified || false

    wx.setStorageSync('user_id', user.id)
    wx.setStorageSync('user_info', user)
  },

  // 更新实名认证状态
  updateRealnameStatus(verified) {
    this.globalData.realnameVerified = verified

    if (this.globalData.userInfo) {
      this.globalData.userInfo.realname_verified = verified
      wx.setStorageSync('user_info', this.globalData.userInfo)
    }
  }
})
