// miniprogram/pages/booking/booking.js
import { supabase } from '../../utils/supabase'
import { simpleRealnameVerify } from '../../utils/wechat-auth'
import { showLoading, hideLoading, showError, showSuccess, validatePhone, formatDate } from '../../utils/util'

const app = getApp()

Page({
  data: {
    serviceTypes: ['水电维修', '家电维修', '木工维修', '油漆粉刷', '锁具维修', '管道疏通', '家具组装', '其他服务'],
    serviceTypeIndex: 0,
    description: '',
    date: '',
    time: '',
    address: '',
    phone: '',
    urgency: 'normal',
    urgencyLevels: [
      { value: 'low', label: '不急' },
      { value: 'normal', label: '一般' },
      { value: 'high', label: '紧急' }
    ],
    minDate: '',
    isRealnameVerified: false,
    isSubmitting: false,
    canSubmit: false
  },

  onLoad(options) {
    // 检查实名认证状态
    this.checkRealnameStatus()

    // 设置最小日期为今天
    const today = new Date()
    this.setData({
      minDate: formatDate(today),
      date: formatDate(today)
    })

    // 如果从首页传来服务类型
    if (options.service) {
      const index = this.data.serviceTypes.indexOf(options.service)
      if (index >= 0) {
        this.setData({ serviceTypeIndex: index })
      }
    }

    // 自动填充用户手机号
    if (app.globalData.userInfo) {
      this.setData({
        phone: app.globalData.userInfo.phone || ''
      })
    }
  },

  // 检查实名认证状态
  checkRealnameStatus() {
    const verified = app.globalData.realnameVerified || false
    this.setData({ isRealnameVerified: verified })
  },

  // 处理实名认证
  async handleRealnameVerify() {
    showLoading('认证中...')

    try {
      const result = await simpleRealnameVerify()

      if (result.success) {
        // 更新用户实名状态
        const userId = app.globalData.userInfo.id
        await supabase
          .from('users')
          .update({
            realname_verified: true,
            realname_verified_at: new Date().toISOString(),
            realname_method: 'wechat'
          })
          .eq('id', userId)

        // 更新全局状态
        app.updateRealnameStatus(true)
        this.setData({ isRealnameVerified: true })

        hideLoading()
        showSuccess('实名认证成功')
      } else {
        hideLoading()
        showError(result.error || '认证失败')
      }
    } catch (error) {
      console.error('实名认证失败:', error)
      hideLoading()
      showError('认证失败，请重试')
    }
  },

  // 表单输入处理
  onServiceTypeChange(e) {
    this.setData({ serviceTypeIndex: e.detail.value }, () => {
      this.checkCanSubmit()
    })
  },

  onDescriptionInput(e) {
    this.setData({ description: e.detail.value }, () => {
      this.checkCanSubmit()
    })
  },

  onDateChange(e) {
    this.setData({ date: e.detail.value }, () => {
      this.checkCanSubmit()
    })
  },

  onTimeChange(e) {
    this.setData({ time: e.detail.value }, () => {
      this.checkCanSubmit()
    })
  },

  onAddressInput(e) {
    this.setData({ address: e.detail.value }, () => {
      this.checkCanSubmit()
    })
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value }, () => {
      this.checkCanSubmit()
    })
  },

  onUrgencyChange(e) {
    this.setData({ urgency: e.detail.value })
  },

  // 检查是否可以提交
  checkCanSubmit() {
    const { description, date, time, address, phone } = this.data
    const canSubmit = !!(description && date && time && address && phone)
    this.setData({ canSubmit })
  },

  // 提交预约
  async handleSubmit() {
    const { serviceTypes, serviceTypeIndex, description, date, time, address, phone, urgency } = this.data

    // 验证
    if (!description || !date || !time || !address || !phone) {
      showError('请填写完整信息')
      return
    }

    if (!validatePhone(phone)) {
      showError('请输入正确的手机号')
      return
    }

    this.setData({ isSubmitting: true })
    showLoading('提交中...')

    try {
      const userInfo = app.globalData.userInfo

      // 创建预约记录
      const { data, error } = await supabase
        .from('bookings')
        .insert([
          {
            user_id: userInfo.id,
            user_name: userInfo.name,
            user_email: userInfo.email,
            user_phone: phone,
            service_type: serviceTypes[serviceTypeIndex],
            description,
            scheduled_date: date,
            scheduled_time: time,
            address,
            urgency,
            status: 'pending',
            created_at: new Date().toISOString()
          }
        ])
        .select()
        .single()

      if (error) throw error

      hideLoading()
      showSuccess('预约成功')

      // 跳转到我的页面查看预约
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/my/my'
        })
      }, 1500)

    } catch (error) {
      console.error('提交预约失败:', error)
      hideLoading()
      showError(error.message || '提交失败，请重试')
    } finally {
      this.setData({ isSubmitting: false })
    }
  }
})
