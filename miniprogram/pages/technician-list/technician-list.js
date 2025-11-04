// miniprogram/pages/technician-list/technician-list.js
import { supabase } from '../../utils/supabase'
import { showError } from '../../utils/util'

Page({
  data: {
    technicians: [],
    cities: ['全部', '北京', '上海', '广州', '深圳', '杭州', '成都'],
    cityIndex: 0,
    isLoading: false
  },

  onLoad() {
    this.loadTechnicians()
  },

  async loadTechnicians() {
    this.setData({ isLoading: true })

    try {
      let query = supabase
        .from('technicians')
        .select('*')
        .eq('status', 'approved')
        .eq('realname_verified', true)

      // 如果选择了具体城市，添加城市筛选
      if (this.data.cityIndex > 0) {
        query = query.eq('city', this.data.cities[this.data.cityIndex])
      }

      const { data, error } = await query.order('created_at', { ascending: false })

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

  onCityChange(e) {
    this.setData({ cityIndex: e.detail.value }, () => {
      this.loadTechnicians()
    })
  }
})
