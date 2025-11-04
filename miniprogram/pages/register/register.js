// miniprogram/pages/register/register.js
import { supabase } from '../../utils/supabase'
import { simpleRealnameVerify } from '../../utils/wechat-auth'
import { showLoading, hideLoading, showError, showSuccess, validateEmail, validatePhone } from '../../utils/util'

const app = getApp()

Page({
  data: {
    name: '',
    email: '',
    password: '',
    phone: '',
    city: '',
    fromWechat: false,
    wechatNickname: '',
    wechatAvatar: '',
    wechatCode: '',
    realnameVerified: false,
    realnameData: null,
    isVerifying: false,
    isLoading: false,
    canRegister: false
  },

  onLoad(options) {
    // 检查是否从微信登录跳转过来
    if (options.fromWechat === 'true') {
      this.setData({
        fromWechat: true,
        wechatNickname: options.nickname || '',
        wechatAvatar: decodeURIComponent(options.avatar || '')
      })
    }

    // 检查是否已登录
    if (app.globalData.isLoggedIn) {
      wx.switchTab({
        url: '/pages/index/index'
      })
    }
  },

  onNameInput(e) {
    this.setData({ name: e.detail.value }, () => {
      this.checkCanRegister()
    })
  },

  onEmailInput(e) {
    this.setData({ email: e.detail.value }, () => {
      this.checkCanRegister()
    })
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value }, () => {
      this.checkCanRegister()
    })
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value }, () => {
      this.checkCanRegister()
    })
  },

  onCityInput(e) {
    this.setData({ city: e.detail.value }, () => {
      this.checkCanRegister()
    })
  },

  // 检查是否可以注册
  checkCanRegister() {
    const { name, email, password, phone, city, realnameVerified } = this.data
    const canRegister = !!(name && email && password && phone && city && realnameVerified)
    this.setData({ canRegister })
  },

  // 处理实名认证
  async handleRealnameVerify() {
    if (this.data.isVerifying) return

    this.setData({ isVerifying: true })

    try {
      // 调用微信实名认证
      const result = await simpleRealnameVerify()

      if (result.success) {
        this.setData({
          realnameVerified: true,
          realnameData: result.data
        })

        showSuccess('实名认证成功')
        this.checkCanRegister()
      } else {
        showError(result.error || '认证失败')
      }
    } catch (error) {
      console.error('实名认证失败:', error)
      showError('认证失败，请重试')
    } finally {
      this.setData({ isVerifying: false })
    }
  },

  // 处理注册
  async handleRegister() {
    const { name, email, password, phone, city, realnameVerified, fromWechat, wechatNickname, wechatAvatar, realnameData } = this.data

    // 验证
    if (!name || !email || !password || !phone || !city) {
      showError('请填写完整信息')
      return
    }

    if (!validateEmail(email)) {
      showError('请输入正确的邮箱格式')
      return
    }

    if (password.length < 6) {
      showError('密码至少需要6位字符')
      return
    }

    if (!validatePhone(phone)) {
      showError('请输入正确的手机号')
      return
    }

    if (!realnameVerified) {
      showError('请先完成实名认证')
      return
    }

    this.setData({ isLoading: true })
    showLoading('注册中...')

    try {
      // 1. 创建 Supabase 认证用户
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            phone
          }
        }
      })

      if (authError) throw authError

      // 2. 在 users 表中创建用户记录
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert([
          {
            id: authData.user.id,
            email,
            name,
            phone,
            city,
            status: 'approved',
            realname_verified: true, // 已通过微信实名认证
            realname_verified_at: new Date().toISOString(),
            realname_method: 'wechat',
            wechat_nickname: fromWechat ? wechatNickname : null,
            wechat_avatar: fromWechat ? wechatAvatar : null,
            wechat_openid: realnameData?.openid || null,
            created_at: new Date().toISOString()
          }
        ])
        .select()
        .single()

      if (userError) throw userError

      hideLoading()
      showSuccess('注册成功')

      // 3. 自动登录
      await app.setUserInfo(userData)

      // 4. 跳转到首页
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/index/index'
        })
      }, 1000)

    } catch (error) {
      console.error('注册失败:', error)
      hideLoading()

      if (error.message.includes('already registered')) {
        showError('该邮箱已被注册')
      } else if (error.message.includes('duplicate')) {
        showError('用户已存在')
      } else {
        showError(error.message || '注册失败，请重试')
      }
    } finally {
      this.setData({ isLoading: false })
    }
  },

  // 跳转到登录页
  goToLogin() {
    wx.navigateBack()
  }
})
