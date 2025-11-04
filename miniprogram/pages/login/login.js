// miniprogram/pages/login/login.js
import { supabase } from '../../utils/supabase'
import { getWechatLoginCode, getWechatUserProfile } from '../../utils/wechat-auth'
import { showLoading, hideLoading, showError, showSuccess, validateEmail } from '../../utils/util'

const app = getApp()

Page({
  data: {
    email: '',
    password: '',
    isLoading: false,
    isEmailLoading: false
  },

  onLoad(options) {
    // 检查是否已登录
    if (app.globalData.isLoggedIn) {
      wx.switchTab({
        url: '/pages/index/index'
      })
    }
  },

  // 邮箱输入
  onEmailInput(e) {
    this.setData({
      email: e.detail.value
    })
  },

  // 密码输入
  onPasswordInput(e) {
    this.setData({
      password: e.detail.value
    })
  },

  // 微信一键登录
  async handleWechatLogin() {
    if (this.data.isLoading) return

    this.setData({ isLoading: true })
    showLoading('登录中...')

    try {
      // 1. 获取微信登录凭证
      const code = await getWechatLoginCode()

      // 2. 获取微信用户信息
      const userInfo = await getWechatUserProfile()

      // 3. 这里需要调用后端接口，用 code 换取 openid
      // 由于这是演示代码，我们使用昵称作为唯一标识
      // 实际项目中，应该在服务器端用 code 换取 openid

      // 4. 检查用户是否已在数据库中
      const { data: existingUsers, error: queryError } = await supabase
        .from('users')
        .select('*')
        .eq('wechat_nickname', userInfo.nickName)
        .limit(1)

      if (queryError) throw queryError

      let user = null

      if (existingUsers && existingUsers.length > 0) {
        // 用户已存在，直接登录
        user = existingUsers[0]

        // 更新微信信息
        await supabase
          .from('users')
          .update({
            wechat_avatar: userInfo.avatarUrl,
            last_login_at: new Date().toISOString()
          })
          .eq('id', user.id)

      } else {
        // 新用户，跳转到注册页面
        hideLoading()
        this.setData({ isLoading: false })

        wx.showModal({
          title: '欢迎使用',
          content: '检测到您是新用户，请先完成注册',
          showCancel: false,
          success: () => {
            wx.redirectTo({
              url: `/pages/register/register?fromWechat=true&nickname=${userInfo.nickName}&avatar=${encodeURIComponent(userInfo.avatarUrl)}`
            })
          }
        })
        return
      }

      // 保存用户信息到全局状态
      await app.setUserInfo(user)

      hideLoading()
      showSuccess('登录成功')

      // 跳转到首页
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/index/index'
        })
      }, 1000)

    } catch (error) {
      console.error('微信登录失败:', error)
      hideLoading()
      showError(error.message || '登录失败，请重试')
    } finally {
      this.setData({ isLoading: false })
    }
  },

  // 邮箱登录
  async handleEmailLogin() {
    const { email, password } = this.data

    // 验证
    if (!email || !password) {
      showError('请填写完整信息')
      return
    }

    if (!validateEmail(email)) {
      showError('请输入正确的邮箱格式')
      return
    }

    this.setData({ isEmailLoading: true })
    showLoading('登录中...')

    try {
      // 使用 Supabase 登录
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (authError) throw authError

      // 获取用户信息
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single()

      if (userError) throw userError

      // 保存用户信息
      await app.setUserInfo(userData)

      // 更新最后登录时间
      await supabase
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', userData.id)

      hideLoading()
      showSuccess('登录成功')

      // 跳转到首页
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/index/index'
        })
      }, 1000)

    } catch (error) {
      console.error('邮箱登录失败:', error)
      hideLoading()

      if (error.message.includes('Invalid login credentials')) {
        showError('邮箱或密码错误')
      } else {
        showError(error.message || '登录失败，请重试')
      }
    } finally {
      this.setData({ isEmailLoading: false })
    }
  },

  // 跳转到注册页
  goToRegister() {
    wx.navigateTo({
      url: '/pages/register/register'
    })
  }
})
