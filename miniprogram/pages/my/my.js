// miniprogram/pages/my/my.js
import { supabase } from '../../utils/supabase'
import { showLoading, hideLoading, showError, showConfirm } from '../../utils/util'

const app = getApp()

Page({
  data: {
    userInfo: {},
    bookings: [],
    statusMap: {
      'pending': '待接单',
      'accepted': '已接单',
      'in_progress': '进行中',
      'completed': '已完成',
      'cancelled': '已取消'
    },
    isLoading: false
  },

  onLoad() {
    this.loadUserInfo()
  },

  onShow() {
    this.loadUserInfo()
    this.loadBookings()
  },

  loadUserInfo() {
    const userInfo = app.globalData.userInfo || {}
    this.setData({ userInfo })
  },

  async loadBookings() {
    this.setData({ isLoading: true })

    try {
      const userId = app.globalData.userInfo?.id

      if (!userId) {
        this.setData({ isLoading: false })
        return
      }

      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error

      this.setData({
        bookings: data || []
      })
    } catch (error) {
      console.error('加载预约失败:', error)
      showError('加载失败，请重试')
    } finally {
      this.setData({ isLoading: false })
    }
  },

  goToBooking() {
    wx.navigateTo({
      url: '/pages/booking/booking'
    })
  },

  async handleLogout() {
    const confirmed = await showConfirm('确定要退出登录吗？')

    if (!confirmed) return

    showLoading('退出中...')

    try {
      await supabase.auth.signOut()
      app.clearAuth()

      hideLoading()

      wx.reLaunch({
        url: '/pages/login/login'
      })
    } catch (error) {
      console.error('退出失败:', error)
      hideLoading()
      showError('退出失败，请重试')
    }
  }
})
