# SheFixes 功能设置指南 / Setup Guide

## 🎯 新功能 / New Features

### ✅ 已完成的功能 / Completed Features

1. **预约表单 / Booking Form**
   - 用户可以提交维修服务预约
   - 选择服务类型、日期、时间
   - 添加照片和详细描述

2. **聊天窗口 / Chat Window**
   - 用户与技师之间的实时聊天
   - 自动滚动到最新消息
   - 实时消息推送（使用Supabase Realtime）

3. **评价系统 / Review System**
   - 5星评分系统
   - 文字评论
   - 只有完成的订单才能评价

## 🚀 设置步骤 / Setup Steps

### 1. 数据库设置 / Database Setup

在你的 Supabase 项目中运行 SQL：

1. 登录 [Supabase Dashboard](https://app.supabase.com)
2. 选择你的项目
3. 进入 SQL Editor
4. 复制 `database-setup.sql` 文件的内容
5. 点击 "Run" 执行 SQL

这将创建以下表：
- `users` - 用户表
- `technicians` - 技师表
- `bookings` - 预约订单表
- `messages` - 聊天消息表
- `reviews` - 评价表

### 2. 启用 Realtime / Enable Realtime

SQL 脚本已经包含了 Realtime 配置，但确保：

1. 在 Supabase Dashboard 中进入 Database → Replication
2. 确认 `messages` 表已启用 Realtime

### 3. 运行项目 / Run Project

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

## 📋 功能使用说明 / Feature Usage

### 预约服务 / Book a Service

1. 点击导航栏的 "Book Service" / "预约服务"
2. 填写表单：
   - 选择服务类型（水管、电路、空调等）
   - 输入服务地址
   - 描述问题
   - 选择期望日期和时间
   - （可选）添加照片 URL
3. 点击 "Submit Booking" / "提交预约"
4. 预约将出现在 "My Orders" / "我的订单" 页面

### 与技师聊天 / Chat with Technician

1. 进入 "My Orders" / "我的订单" 页面
2. 对于状态为 "Confirmed" / "已确认" 或 "In Progress" / "进行中" 的订单
3. 点击 "Chat" / "聊天" 按钮
4. 在聊天窗口中发送消息
5. 实时接收技师回复

### 评价服务 / Write a Review

1. 进入 "My Orders" / "我的订单" 页面
2. 对于状态为 "Completed" / "已完成" 且未评价的订单
3. 点击 "Write Review" / "写评价" 按钮
4. 选择评分（1-5星）
5. 输入评论
6. 点击 "Submit Review" / "提交评价"

## 🗄️ 数据库结构 / Database Schema

### Bookings 表
```
- id: UUID (主键)
- user_id: UUID (外键 → users)
- technician_id: UUID (外键 → technicians)
- service_type: TEXT
- service_address: TEXT
- description: TEXT
- preferred_date: DATE
- preferred_time: TIME
- photo_url: TEXT
- status: TEXT (pending/confirmed/in_progress/completed/cancelled)
- has_review: BOOLEAN
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### Messages 表
```
- id: UUID (主键)
- booking_id: UUID (外键 → bookings)
- sender_id: UUID
- sender_type: TEXT (user/technician)
- message: TEXT
- created_at: TIMESTAMP
```

### Reviews 表
```
- id: UUID (主键)
- booking_id: UUID (外键 → bookings)
- user_id: UUID (外键 → users)
- technician_id: UUID (外键 → technicians)
- rating: INTEGER (1-5)
- comment: TEXT
- created_at: TIMESTAMP
```

## 🔒 安全性 / Security

所有表都启用了 Row Level Security (RLS)：
- 用户只能查看和修改自己的数据
- 聊天消息只对订单相关的用户可见
- 评价功能有完整性检查

## 🎨 用户界面 / User Interface

- 响应式设计，支持移动端和桌面端
- 中英文双语支持
- 现代化的 UI 设计
- 实时状态更新

## 📝 注意事项 / Notes

1. 确保 Supabase 项目正确配置
2. 聊天功能需要 Realtime 功能正常工作
3. 示例数据中已包含 5 位技师
4. 订单状态流程：pending → confirmed → in_progress → completed

## 🐛 故障排除 / Troubleshooting

### 聊天消息不实时更新
- 检查 Supabase Realtime 是否启用
- 确认 `messages` 表在 Replication 设置中已启用

### 无法提交预约
- 确认用户已登录
- 检查所有必填字段是否填写

### 评价按钮不显示
- 确认订单状态为 "completed"
- 确认订单尚未评价（has_review = false）

---

需要帮助？发邮件至：hello@shefixes.com
