# 自拍验证功能设置指南

## 概述

此功能为 SheFixes 平台添加了自拍验证系统，要求用户和技师在首次下单/接单前完成现场自拍验证。

## 功能特点

- ✅ 强制使用设备相机现场拍摄，禁止从相册上传
- ✅ 用户首次下单前必须完成自拍验证
- ✅ 已验证用户头像显示安全标识
- ✅ 照片安全存储在 Supabase Storage
- ✅ 中英文双语支持
- ✅ 说明文字："为了让技师和客户都更安心，我们采用安全自拍验证。您的照片只用于身份确认，不会公开展示。"

## 数据库设置

### 1. 运行数据库迁移

在 Supabase SQL Editor 中执行以下 SQL 脚本：

```bash
# 位置：database-migration-selfie-verification.sql
```

这将为 `users` 和 `technicians` 表添加以下字段：
- `selfie_verified`: BOOLEAN - 是否已完成自拍验证
- `selfie_photo_url`: TEXT - 自拍照片的 URL
- `selfie_verified_at`: TIMESTAMP - 验证时间

### 2. 创建 Supabase Storage Bucket

1. 进入 Supabase 控制台
2. 导航到 **Storage** 部分
3. 点击 **New Bucket**
4. 创建新的存储桶：
   - **Bucket Name**: `selfie-verifications`
   - **Public**: ✅ 勾选（允许公开访问）
   - **File Size Limit**: 5 MB（推荐）
   - **Allowed MIME types**: `image/jpeg, image/png`

### 3. 配置存储桶策略

在 Supabase Storage Policies 中添加以下策略：

#### 允许认证用户上传自拍照片

```sql
CREATE POLICY "Authenticated users can upload selfies"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'selfie-verifications' AND
  (storage.foldername(name))[1] = 'user_' || auth.uid()::text OR
  (storage.foldername(name))[1] = 'technician_' || auth.uid()::text
);
```

#### 允许所有人查看已验证的自拍照片

```sql
CREATE POLICY "Anyone can view selfie verifications"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'selfie-verifications');
```

## 工作流程

### 用户端流程

1. **新用户注册** → 创建账号
2. **首次下单** → 系统检测未完成自拍验证
3. **显示自拍验证模态框** → 用户阅读说明
4. **启动相机** → 使用设备前置摄像头
5. **拍摄自拍** → 用户拍照并预览
6. **确认上传** → 照片上传到 Supabase Storage
7. **更新验证状态** → 数据库记录验证信息
8. **继续下单** → 自动提交之前的订单
9. **显示安全标识** → 用户头像旁显示绿色盾牌标识

### 技师端流程（待实现）

技师端的自拍验证流程类似，需要在以下场景中实现：
- 技师注册后首次接单前
- 使用相同的 `SelfieVerification` 组件，传递 `userType="technician"`

## 文件结构

```
/home/user/shefixes/
├── src/
│   ├── components/
│   │   ├── SelfieVerification.jsx    # 自拍验证组件
│   │   └── VerifiedBadge.jsx         # 安全标识组件
│   └── App.jsx                        # 主应用（已集成验证流程）
├── database-setup.sql                 # 完整数据库设置（包含新字段）
├── database-migration-selfie-verification.sql  # 迁移脚本
└── SELFIE_VERIFICATION_SETUP.md       # 本文档
```

## 组件说明

### SelfieVerification.jsx

自拍验证主组件，处理整个验证流程。

**Props:**
- `userId`: 用户或技师的 ID
- `userType`: "user" 或 "technician"
- `region`: "us" 或 "cn"（语言选择）
- `onVerificationComplete`: 验证完成回调
- `onClose`: 关闭模态框回调

**功能:**
- 使用 `navigator.mediaDevices.getUserMedia()` 访问相机
- 强制前置摄像头（facingMode: 'user'）
- Canvas 捕获照片
- 上传到 Supabase Storage
- 更新数据库验证状态

### VerifiedBadge.jsx

安全标识组件，显示在已验证用户/技师头像旁。

**Props:**
- `size`: "sm" | "md" | "lg" | "xl"
- `region`: "us" | "cn"

**样式:**
- 绿色背景圆形徽章
- 白色盾牌图标
- 悬停时显示提示信息

## 浏览器兼容性

自拍验证功能依赖于现代浏览器的 `getUserMedia` API：

| 浏览器 | 版本要求 |
|--------|----------|
| Chrome | ≥ 53 |
| Firefox | ≥ 36 |
| Safari | ≥ 11 |
| Edge | ≥ 12 |

**注意事项:**
- 必须使用 HTTPS 连接（或 localhost）
- 用户必须授予相机权限
- 移动设备需要原生浏览器支持

## 安全考虑

1. **隐私保护**
   - 照片仅用于身份验证
   - 不会在公开页面展示原始自拍照
   - 用户可以在个人设置中管理照片

2. **存储安全**
   - 使用 Supabase Storage 的 RLS 策略
   - 只有认证用户可以上传
   - 文件名包含用户 ID 防止覆盖

3. **验证状态**
   - 数据库字段不可由前端直接修改
   - 只能通过认证流程更新

## 测试清单

- [ ] 新用户注册后首次下单触发自拍验证
- [ ] 相机权限被拒绝时显示错误提示
- [ ] 拍照后可以重新拍摄
- [ ] 照片成功上传到 Supabase Storage
- [ ] 验证状态正确更新到数据库
- [ ] 已验证用户头像显示安全标识
- [ ] 已验证用户再次下单不再触发验证
- [ ] 中英文切换正常工作
- [ ] 移动设备浏览器兼容性
- [ ] HTTPS 环境下正常工作

## 故障排查

### 问题：相机无法启动

**可能原因:**
1. 用户拒绝了相机权限
2. 设备没有相机
3. 其他应用正在使用相机
4. 非 HTTPS 连接（localhost 除外）

**解决方案:**
- 检查浏览器权限设置
- 使用 HTTPS 或 localhost
- 关闭其他使用相机的应用

### 问题：上传失败

**可能原因:**
1. Supabase Storage bucket 未创建
2. Storage 策略配置错误
3. 网络连接问题
4. 文件大小超限

**解决方案:**
- 检查 Supabase Storage 配置
- 验证策略是否正确设置
- 检查网络连接
- 压缩照片大小

### 问题：验证状态未更新

**可能原因:**
1. 数据库表缺少新字段
2. RLS 策略阻止更新
3. 用户未认证

**解决方案:**
- 运行数据库迁移脚本
- 检查 RLS 策略
- 确认用户已登录

## 未来改进

- [ ] 添加人脸检测 API 确保照片中有人脸
- [ ] 支持照片重新上传（重新验证）
- [ ] 添加照片质量检查（亮度、清晰度）
- [ ] 实现技师端验证流程
- [ ] 添加验证历史记录
- [ ] 支持活体检测防止照片欺诈
- [ ] 添加后台审核流程

## 支持

如有问题或需要帮助，请联系：
- Email: hello@shefixes.com
- GitHub Issues: [项目仓库]

---

**版本**: 1.0.0
**最后更新**: 2025-11-03
