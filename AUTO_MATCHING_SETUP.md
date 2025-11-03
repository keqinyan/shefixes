# SheFixes Auto-Matching System Setup Guide

## 概述 Overview

This guide will help you set up the automatic technician matching system for SheFixes. The system allows users to:

本指南将帮助您设置SheFixes的自动技师匹配系统。该系统允许用户：

- **Automatically find technicians** based on location and service type / 根据位置和服务类别自动查找技师
- **View technician availability** in real-time / 实时查看技师可用时间
- **Book appointments** directly with available time slots / 直接预订可用时间段

---

## Features / 功能

### 1. **Automatic Matching / 自动匹配**
- Users enter their city and select a service type / 用户输入城市并选择服务类别
- System automatically finds qualified technicians in that area / 系统自动查找该地区的合格技师
- Results are sorted by rating and availability / 结果按评分和可用性排序

### 2. **Service Area Management / 服务区域管理**
- Technicians can specify which cities they serve / 技师可以指定服务的城市
- Technicians can set their service radius / 技师可以设置服务半径
- Geographic coordinates for distance calculation / 地理坐标用于距离计算

### 3. **Availability Management / 可用时间管理**
- Technicians manage their available time slots / 技师管理可用时间段
- Calendar-based interface for easy scheduling / 基于日历的界面便于排班
- Bulk generation of availability slots / 批量生成可用时间段
- Automatic blocking of booked slots / 自动锁定已预订时间段

### 4. **Real-time Chat (Already Implemented) / 实时聊天（已实现）**
- Users can chat with technicians after booking / 用户预订后可与技师聊天
- Built-in messaging system / 内置消息系统

---

## Installation Steps / 安装步骤

### Step 1: Run Database Migration / 步骤1：运行数据库迁移

1. Open your Supabase project dashboard / 打开您的Supabase项目仪表板
2. Go to SQL Editor / 进入SQL编辑器
3. Copy the contents of `database-migration-auto-matching.sql` / 复制 `database-migration-auto-matching.sql` 的内容
4. Paste and run the SQL / 粘贴并运行SQL

This migration will:
此迁移将：

- Add service area fields to the `technicians` table / 向技师表添加服务区域字段
- Create the `technician_availability` table / 创建技师可用时间表
- Add helper functions for matching and availability / 添加匹配和可用性的辅助函数
- Set up RLS policies / 设置行级安全策略
- Generate initial availability for existing technicians / 为现有技师生成初始可用时间

### Step 2: Update Existing Technicians (Optional) / 步骤2：更新现有技师（可选）

If you have existing technicians in your database, you may want to manually update their service areas:

如果数据库中已有技师，您可能需要手动更新他们的服务区域：

```sql
-- Example: Update a technician's service area
UPDATE technicians SET
  service_cities = ARRAY['San Francisco', 'Oakland', 'Berkeley'],
  service_radius_km = 50,
  latitude = 37.7749,
  longitude = -122.4194
WHERE email = 'technician@example.com';
```

### Step 3: Generate Availability for Technicians / 步骤3：为技师生成可用时间

For each technician, generate their availability for the next few months:

为每位技师生成接下来几个月的可用时间：

```sql
-- Generate availability for a specific technician
SELECT generate_availability_slots(
  'technician-uuid-here',  -- Replace with actual technician ID
  CURRENT_DATE,            -- Start date
  CURRENT_DATE + INTERVAL '3 months',  -- End date (3 months from now)
  '09:00'::TIME,          -- Start time (9 AM)
  '17:00'::TIME,          -- End time (5 PM)
  60                      -- Slot duration in minutes
);
```

The migration already runs this for all existing verified technicians, but you can re-run it anytime.

迁移已为所有现有的已验证技师运行此操作，但您可以随时重新运行。

---

## Usage / 使用方法

### For Users / 用户使用

1. **Book a Service / 预约服务**
   - Click "Book a Service" / 点击"预约服务"
   - Select service type (e.g., Plumbing, Electrical) / 选择服务类别（如水管维修、电路维修）
   - Enter your full address and city / 输入完整地址和城市
   - Enter problem description / 输入问题描述
   - Select preferred date / 选择期望日期
   - Click "Find Available Technicians" / 点击"查找可用技师"

2. **Select a Technician / 选择技师**
   - Browse the list of matched technicians / 浏览匹配的技师列表
   - View their ratings, hourly rates, and bios / 查看评分、时薪和简介
   - Click on a technician to see their available time slots / 点击技师查看可用时间段

3. **Choose a Time Slot / 选择时间段**
   - Select an available time slot / 选择可用时间段
   - Review the booking summary / 查看预订摘要
   - Click "Confirm Booking" / 点击"确认预订"

4. **Complete Selfie Verification (First Time) / 完成自拍验证（首次）**
   - If this is your first booking, you'll be asked to verify with a selfie / 首次预订需要自拍验证
   - Follow the on-screen instructions / 按照屏幕指示操作

5. **Chat with Technician / 与技师聊天**
   - After booking, you can chat with the technician / 预订后可与技师聊天
   - Go to "My Orders" / 进入"我的订单"
   - Click "Chat" on your booking / 点击预订上的"聊天"

### For Technicians / 技师使用

1. **Register as a Technician / 注册为技师**
   - Click "Register as Technician" / 点击"注册技师"
   - Fill in personal information / 填写个人信息
   - Select service categories you offer / 选择提供的服务类别
   - Enter your city (this will be your primary service area) / 输入城市（这将是您的主要服务区域）
   - Wait for admin approval / 等待管理员审核

2. **Manage Service Areas / 管理服务区域**
   - After approval, you can update your service cities in the database / 审核通过后，可在数据库中更新服务城市
   - Contact admin to update service areas / 联系管理员更新服务区域

3. **Manage Availability / 管理可用时间**

   **Method 1: Use the Technician Dashboard (Coming Soon) / 方法1：使用技师仪表板（即将推出）**

   **Method 2: Direct Database Update / 方法2：直接数据库更新**

   Run SQL to generate your availability:

   运行SQL生成可用时间：

   ```sql
   -- Generate availability for next month
   SELECT generate_availability_slots(
     'your-technician-id',
     '2024-12-01',  -- Start date
     '2024-12-31',  -- End date
     '09:00',       -- Start time
     '17:00',       -- End time
     60             -- 60-minute slots
   );
   ```

4. **Update Availability Monthly / 每月更新可用时间**
   - Re-run the availability generation function at the start of each month / 每月初重新运行可用时间生成函数
   - Block specific dates/times as needed / 根据需要锁定特定日期/时间

   ```sql
   -- Mark specific slots as unavailable
   UPDATE technician_availability
   SET is_available = false
   WHERE technician_id = 'your-id'
     AND date = '2024-12-15'
     AND time_slot = '14:00';
   ```

---

## Database Schema / 数据库架构

### Technicians Table Updates / 技师表更新

New fields added:
新增字段：

- `service_cities` - Array of cities the technician serves / 技师服务的城市数组
- `service_radius_km` - Service radius in kilometers / 服务半径（公里）
- `latitude` - Latitude for distance calculation / 用于距离计算的纬度
- `longitude` - Longitude for distance calculation / 用于距离计算的经度
- Additional fields for compatibility / 兼容性的附加字段

### Technician Availability Table / 技师可用时间表

```sql
CREATE TABLE technician_availability (
  id UUID PRIMARY KEY,
  technician_id UUID REFERENCES technicians(id),
  date DATE NOT NULL,
  time_slot TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  is_available BOOLEAN DEFAULT true,
  is_booked BOOLEAN DEFAULT false,
  booking_id UUID REFERENCES bookings(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(technician_id, date, time_slot)
);
```

---

## Database Functions / 数据库函数

### 1. `find_matching_technicians(service_type, city, preferred_date)`

Finds technicians matching the service type and location.

查找匹配服务类型和位置的技师。

**Parameters / 参数:**
- `p_service_type` - Service category (e.g., 'plumbing') / 服务类别
- `p_city` - City name / 城市名称
- `p_preferred_date` - Optional preferred date / 可选的期望日期

**Returns / 返回:**
- List of matching technicians with availability counts / 包含可用时间数量的匹配技师列表

### 2. `get_available_slots(technician_id, date)`

Gets available time slots for a specific technician on a specific date.

获取特定技师在特定日期的可用时间段。

**Parameters / 参数:**
- `p_technician_id` - Technician UUID / 技师UUID
- `p_date` - Date / 日期

**Returns / 返回:**
- List of available time slots / 可用时间段列表

### 3. `generate_availability_slots(...)`

Bulk generates availability slots for a technician.

批量生成技师的可用时间段。

**Parameters / 参数:**
- `p_technician_id` - Technician UUID / 技师UUID
- `p_start_date` - Start date / 开始日期
- `p_end_date` - End date / 结束日期
- `p_start_time` - Daily start time (default: 09:00) / 每日开始时间
- `p_end_time` - Daily end time (default: 17:00) / 每日结束时间
- `p_slot_duration_minutes` - Slot duration (default: 60) / 时间段时长

**Returns / 返回:**
- Number of slots created / 创建的时间段数量

---

## Testing / 测试

### 1. Test Technician Matching / 测试技师匹配

```sql
-- Find plumbers in San Francisco
SELECT * FROM find_matching_technicians('plumbing', 'San Francisco', NULL);
```

### 2. Test Availability / 测试可用时间

```sql
-- Get available slots for a technician
SELECT * FROM get_available_slots(
  'technician-uuid',
  '2024-12-15'
);
```

### 3. Test Booking Flow / 测试预订流程

1. Create a user account / 创建用户账户
2. Go to Book Service / 进入预约服务
3. Fill in the form with:
   - Service: Plumbing / 服务：水管维修
   - City: San Francisco / 城市：旧金山
   - Date: Tomorrow / 日期：明天
4. Click "Find Available Technicians" / 点击"查找可用技师"
5. Select a technician / 选择技师
6. Select a time slot / 选择时间段
7. Confirm booking / 确认预订

---

## Troubleshooting / 故障排除

### No Technicians Found / 找不到技师

**Issue / 问题:** Users can't find technicians in their area.

**Solutions / 解决方案:**
1. Check if technicians have their `service_cities` set / 检查技师是否设置了服务城市
2. Verify technician status is 'approved' or verified is true / 验证技师状态为'approved'或verified为true
3. Ensure city name matches exactly / 确保城市名称完全匹配

```sql
-- Check technician service areas
SELECT id, name, city, service_cities, verified, status
FROM technicians;
```

### No Time Slots Available / 没有可用时间段

**Issue / 问题:** Technician shows up but has no time slots.

**Solutions / 解决方案:**
1. Generate availability for the technician / 为技师生成可用时间
2. Check if slots are marked as booked / 检查时间段是否已被标记为已预订

```sql
-- Check technician availability
SELECT * FROM technician_availability
WHERE technician_id = 'technician-uuid'
  AND date >= CURRENT_DATE
ORDER BY date, time_slot;

-- Generate availability if none exists
SELECT generate_availability_slots(
  'technician-uuid',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '1 month',
  '09:00'::TIME,
  '17:00'::TIME,
  60
);
```

### Booking Not Creating / 预订未创建

**Issue / 问题:** Error when confirming booking.

**Solutions / 解决方案:**
1. Check browser console for errors / 检查浏览器控制台错误
2. Verify RLS policies are set correctly / 验证RLS策略设置正确
3. Ensure user is authenticated / 确保用户已认证

---

## Monthly Maintenance / 每月维护

Technicians should update their availability at the start of each month:

技师应在每月初更新可用时间：

```sql
-- Generate next month's availability for all active technicians
DO $$
DECLARE
  tech RECORD;
  next_month_start DATE := DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month');
  next_month_end DATE := DATE_TRUNC('month', CURRENT_DATE + INTERVAL '2 months') - 1;
BEGIN
  FOR tech IN SELECT id FROM technicians WHERE verified = true OR status = 'approved' LOOP
    PERFORM generate_availability_slots(
      tech.id,
      next_month_start,
      next_month_end,
      '09:00'::TIME,
      '17:00'::TIME,
      60
    );
  END LOOP;
END $$;
```

---

## Future Enhancements / 未来增强

- [ ] Technician dashboard for self-service availability management / 技师自助管理可用时间的仪表板
- [ ] Distance-based matching using lat/long / 使用经纬度的基于距离的匹配
- [ ] Recurring availability patterns / 循环可用时间模式
- [ ] Emergency/same-day booking slots / 紧急/当日预订时间段
- [ ] Technician vacation/time-off management / 技师假期/休假管理
- [ ] SMS/Email notifications for new bookings / 新预订的短信/电邮通知

---

## Support / 支持

For questions or issues, please:
如有问题或疑问，请：

1. Check this documentation / 查看本文档
2. Review the code comments in `App.jsx` / 查看 `App.jsx` 中的代码注释
3. Check the database migration file / 查看数据库迁移文件
4. Contact the development team / 联系开发团队

---

## Summary / 总结

The auto-matching system transforms SheFixes from a manual matching platform to an automated booking system. Users can now:

自动匹配系统将SheFixes从手动匹配平台转变为自动预订系统。用户现在可以：

1. ✅ Find technicians automatically based on location and service / 根据位置和服务自动查找技师
2. ✅ See real-time availability / 查看实时可用时间
3. ✅ Book appointments instantly / 即时预约
4. ✅ Chat with technicians (existing feature) / 与技师聊天（现有功能）
5. ✅ Leave reviews (existing feature) / 留下评价（现有功能）

This creates a seamless, efficient experience for both users and technicians!

这为用户和技师创造了无缝、高效的体验！
