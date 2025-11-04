// miniprogram/pages/index/index.js
import { supabase } from '../../utils/supabase'
import { showError, checkLogin, redirectToLogin } from '../../utils/util'

const app = getApp()

Page({
  data: {
    services: [
      { id: 1, name: '水电维修', icon: '/images/service-plumbing.png' },
      { id: 2, name: '家电维修', icon: '/images/service-appliance.png' },
      { id: 3, name: '木工维修', icon: '/images/service-carpentry.png' },
      { id: 4, name: '油漆粉刷', icon: '/images/service-painting.png' },
      { id: 5, name: '锁具维修', icon: '/images/service-lock.png' },
      { id: 6, name: '管道疏通', icon: '/images/service-pipe.png' },
      { id: 7, name: '家具组装', icon: '/images/service-furniture.png' },
      { id: 8, name: '其他服务', icon: '/images/service-other.png' }
    ],
    technicians: [],
    isLoading: false
  },

  onLoad() {
    this.loadTechnicians()
  },

  onShow() {
    // 检查登录状态
    if (app.globalData.hasCheckedAuth && !app.globalData.isLoggedIn) {
      // 未登录，跳转到登录页
      redirectToLogin()
      return
    }

    // 刷新技师列表
    if (app.globalData.isLoggedIn) {
      this.loadTechnicians()
    }
  },

  // 加载推荐技师
  async loadTechnicians() {
    this.setData({ isLoading: true })

    try {
      // 查询已认证的技师
      const { data, error } = await supabase
        .from('technicians')
        .select('*')
        .eq('status', 'approved')
        .eq('realname_verified', true)
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) throw error

      this.setData({
        technicians: data || []
      })
    } catch (error) {
      console.error('加载技师失败:', error)
      showError('加载失败，请重试')
    } finally {
      this.setData({ isLoading: false })
    }
  },

  // 点击服务分类
  onServiceTap(e) {
    const service = e.currentTarget.dataset.service

    if (!checkLogin()) {
      redirectToLogin()
      return
    }

    // 跳转到预约页面，传递服务类型
    wx.navigateTo({
      url: `/pages/booking/booking?service=${service}`
    })
  },

  // 点击技师卡片
  onTechnicianTap(e) {
    const id = e.currentTarget.dataset.id

    if (!checkLogin()) {
      redirectToLogin()
      return
    }

    // 跳转到技师详情页（待实现）
    wx.showToast({
      title: '技师详情页待开发',
      icon: 'none'
    })
  },

  // 查看全部技师
  goToTechnicianList() {
    if (!checkLogin()) {
      redirectToLogin()
      return
    }

    wx.switchTab({
      url: '/pages/technician-list/technician-list'
    })
  },

  // 立即预约
  goToBooking() {
    if (!checkLogin()) {
      redirectToLogin()
      return
    }

    wx.navigateTo({
      url: '/pages/booking/booking'
    })
  }
})
