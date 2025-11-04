# 🔐 安全配置指南

## 目录
1. [自拍照片存储安全配置](#1-自拍照片存储安全配置)
2. [验证码配置](#2-验证码配置)
3. [访问频率限制](#3-访问频率限制)
4. [自动删除策略](#4-自动删除策略)

---

## 1. 自拍照片存储安全配置

### 步骤1: 在 Supabase 创建私有 Storage Bucket

登录 Supabase Dashboard → Storage → Create Bucket

```
Bucket 名称: selfie-verifications-private
Public: ❌ 关闭（必须是私有的！）
```

### 步骤2: 设置访问权限策略（RLS）

在 Storage → Policies 中添加以下策略：

#### 策略1: 仅用户本人可上传
```sql
-- 名称: Users can upload their own selfies
-- 操作: INSERT
-- 目标角色: authenticated

CREATE POLICY "Users can upload own selfies"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'selfie-verifications-private' AND
  (storage.foldername(name))[1] = 'pending'
);
```

#### 策略2: 仅管理员可查看
```sql
-- 名称: Only admins can view selfies
-- 操作: SELECT
-- 目标角色: authenticated

CREATE POLICY "Only admins can view selfies"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'selfie-verifications-private' AND
  auth.jwt() ->> 'role' = 'admin'
);
```

#### 策略3: 仅管理员可删除
```sql
-- 名称: Only admins can delete selfies
-- 操作: DELETE
-- 目标角色: authenticated

CREATE POLICY "Only admins can delete selfies"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'selfie-verifications-private' AND
  auth.jwt() ->> 'role' = 'admin'
);
```

### 步骤3: 更新数据库表结构

在 SQL Editor 中运行：

```sql
-- 添加新字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS selfie_file_path TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS selfie_submitted_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending';

ALTER TABLE technicians ADD COLUMN IF NOT EXISTS selfie_file_path TEXT;
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS selfie_submitted_at TIMESTAMPTZ;
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending';

-- 删除旧的不安全字段（如果存在）
ALTER TABLE users DROP COLUMN IF EXISTS selfie_photo_url;
ALTER TABLE technicians DROP COLUMN IF EXISTS selfie_photo_url;

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_users_verification_status ON users(verification_status);
CREATE INDEX IF NOT EXISTS idx_technicians_verification_status ON technicians(verification_status);
```

---

## 2. 验证码配置

### 步骤1: 注册 Google reCAPTCHA v3

访问：https://www.google.com/recaptcha/admin/create

```
Label: SheFixes
reCAPTCHA type: reCAPTCHA v3
Domains:
  - localhost (开发环境)
  - yourdomain.com (生产环境)
```

### 步骤2: 获取密钥

注册后会得到两个密钥：
- **Site Key** (公开的，用于前端)
- **Secret Key** (保密的，用于后端)

### 步骤3: 添加环境变量

创建 `.env` 文件：

```bash
# .env
VITE_RECAPTCHA_SITE_KEY=your-site-key-here
```

在 Supabase Edge Functions 中添加 Secret：
```bash
supabase secrets set RECAPTCHA_SECRET_KEY=your-secret-key-here
```

### 步骤4: 创建验证 Edge Function

创建文件 `supabase/functions/verify-recaptcha/index.ts`：

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RECAPTCHA_SECRET_KEY = Deno.env.get('RECAPTCHA_SECRET_KEY');
const SCORE_THRESHOLD = 0.5; // 阈值：0.5以上认为是人类

serve(async (req) => {
  try {
    const { token } = await req.json();

    // 验证 reCAPTCHA token
    const response = await fetch(
      'https://www.google.com/recaptcha/api/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `secret=${RECAPTCHA_SECRET_KEY}&response=${token}`,
      }
    );

    const data = await response.json();

    // 返回验证结果
    return new Response(
      JSON.stringify({
        success: data.success && data.score >= SCORE_THRESHOLD,
        score: data.score,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

部署：
```bash
supabase functions deploy verify-recaptcha
```

---

## 3. 访问频率限制

### 方案A: Supabase RLS（推荐）

在 SQL Editor 中运行：

```sql
-- 限制每个用户每小时最多创建5个订单
CREATE POLICY "rate_limit_bookings"
ON bookings
FOR INSERT
TO authenticated
WITH CHECK (
  (
    SELECT COUNT(*)
    FROM bookings
    WHERE user_id = auth.uid()
    AND created_at > NOW() - INTERVAL '1 hour'
  ) < 5
);

-- 限制每个用户每天最多提交10条评价
CREATE POLICY "rate_limit_reviews"
ON reviews
FOR INSERT
TO authenticated
WITH CHECK (
  (
    SELECT COUNT(*)
    FROM reviews
    WHERE user_id = auth.uid()
    AND created_at > NOW() - INTERVAL '1 day'
  ) < 10
);

-- 限制每个用户每天最多提交1次自拍
CREATE POLICY "rate_limit_selfie_submissions"
ON users
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
  selfie_submitted_at IS NULL OR
  selfie_submitted_at < NOW() - INTERVAL '1 day'
);
```

### 方案B: Cloudflare Rate Limiting（外层防护）

登录 Cloudflare Dashboard → 你的域名 → Security → WAF → Rate limiting rules

**规则1: 注册限制**
```
If: Request URL contains /api/register
And: Requests exceed 3 per 10 minutes per IP
Then: Block for 1 hour
```

**规则2: 登录限制**
```
If: Request URL contains /api/login
And: Requests exceed 5 per 5 minutes per IP
Then: Challenge (CAPTCHA) for 30 minutes
```

**规则3: API 总体限制**
```
If: Hostname equals yourdomain.com
And: Requests exceed 100 per 1 minute per IP
Then: Block for 10 minutes
```

---

## 4. 自动删除策略

### 方案A: Supabase Edge Function（推荐）

创建 `supabase/functions/cleanup-selfies/index.ts`：

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 1. 查找已审核超过24小时的记录
    const { data: approvedUsers } = await supabase
      .from('users')
      .select('id, selfie_file_path, selfie_verified_at')
      .eq('verification_status', 'approved')
      .lt('selfie_verified_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .not('selfie_file_path', 'is', null);

    const { data: approvedTechs } = await supabase
      .from('technicians')
      .select('id, selfie_file_path, selfie_verified_at')
      .eq('verification_status', 'approved')
      .lt('selfie_verified_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .not('selfie_file_path', 'is', null);

    const allApproved = [...(approvedUsers || []), ...(approvedTechs || [])];

    // 2. 删除文件
    for (const record of allApproved) {
      if (record.selfie_file_path) {
        await supabase.storage
          .from('selfie-verifications-private')
          .remove([record.selfie_file_path]);
      }
    }

    // 3. 清空数据库中的文件路径
    const userIds = approvedUsers?.map(u => u.id) || [];
    const techIds = approvedTechs?.map(t => t.id) || [];

    if (userIds.length > 0) {
      await supabase
        .from('users')
        .update({ selfie_file_path: null })
        .in('id', userIds);
    }

    if (techIds.length > 0) {
      await supabase
        .from('technicians')
        .update({ selfie_file_path: null })
        .in('id', techIds);
    }

    return new Response(
      JSON.stringify({
        success: true,
        deleted: allApproved.length,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

### 设置定时任务

使用 Supabase pg_cron（PostgreSQL 扩展）：

```sql
-- 启用 pg_cron 扩展
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 每天凌晨2点自动清理
SELECT cron.schedule(
  'cleanup-approved-selfies',
  '0 2 * * *',
  $$
    SELECT net.http_post(
      url := 'https://your-project.supabase.co/functions/v1/cleanup-selfies',
      headers := '{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
    );
  $$
);
```

### 方案B: 使用 Supabase Storage Lifecycle（即将推出）

目前 Supabase 正在开发 Storage Lifecycle 功能，类似 AWS S3 的自动过期删除。

---

## 📋 完整检查清单

✅ **存储安全**
- [ ] 创建私有 bucket `selfie-verifications-private`
- [ ] 设置 RLS 策略（仅管理员可查看）
- [ ] 更新数据库字段（移除 `selfie_photo_url`）

✅ **验证码**
- [ ] 注册 Google reCAPTCHA v3
- [ ] 添加环境变量 `VITE_RECAPTCHA_SITE_KEY`
- [ ] 创建并部署 `verify-recaptcha` Edge Function
- [ ] 在注册/登录表单中集成验证码

✅ **访问限制**
- [ ] 配置 Supabase RLS 频率限制
- [ ] 配置 Cloudflare Rate Limiting（可选）

✅ **自动删除**
- [ ] 创建并部署 `cleanup-selfies` Edge Function
- [ ] 设置 pg_cron 定时任务（每天执行）

✅ **测试**
- [ ] 测试自拍上传（应该进入 pending 文件夹）
- [ ] 测试普通用户无法访问照片
- [ ] 测试管理员可以查看照片
- [ ] 测试自动删除是否生效

---

## 🚨 紧急操作

### 如果发现照片泄露：

1. **立即执行**：
```sql
-- 删除所有公开的照片 URL
UPDATE users SET selfie_photo_url = NULL;
UPDATE technicians SET selfie_photo_url = NULL;
```

2. **检查 Storage bucket 是否为 Public**：
   - Storage → 选择 bucket → Settings
   - 确保 "Public" 设置为 ❌

3. **清空 bucket**：
```javascript
// 在 Supabase SQL Editor 或 Edge Function 中运行
const { data: files } = await supabase.storage
  .from('selfie-verifications')
  .list();

await supabase.storage
  .from('selfie-verifications')
  .remove(files.map(f => f.name));
```

---

## 💡 最佳实践建议

1. **定期审计**：每月检查一次 Storage bucket 中的文件数量
2. **监控日志**：在 Supabase Logs 中查看是否有异常访问
3. **备份策略**：不需要备份自拍照片（审核后即删除）
4. **通知用户**：在隐私政策中明确说明照片处理流程
5. **合规性**：确保符合 GDPR/CCPA 等数据保护法规

---

## 📞 支持

如有问题，请查看：
- Supabase 文档: https://supabase.com/docs
- Google reCAPTCHA 文档: https://developers.google.com/recaptcha
- Cloudflare 文档: https://developers.cloudflare.com
