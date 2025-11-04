# SheFixes 安全加固指南 / Security Hardening Guide

本指南提供 SheFixes 平台的全面安全加固措施，涵盖服务器基础设施、应用安全、数据库安全和最佳实践。

This guide provides comprehensive security hardening measures for the SheFixes platform, covering server infrastructure, application security, database security, and best practices.

---

## 目录 / Table of Contents

1. [服务器基础设施安全 / Server Infrastructure Security](#1-服务器基础设施安全--server-infrastructure-security)
2. [SSH 安全配置 / SSH Security Configuration](#2-ssh-安全配置--ssh-security-configuration)
3. [防火墙和端口管理 / Firewall and Port Management](#3-防火墙和端口管理--firewall-and-port-management)
4. [应用层安全 / Application Security](#4-应用层安全--application-security)
5. [Supabase 安全配置 / Supabase Security Configuration](#5-supabase-安全配置--supabase-security-configuration)
6. [代码安全最佳实践 / Code Security Best Practices](#6-代码安全最佳实践--code-security-best-practices)
7. [环境变量和密钥管理 / Environment Variables and Secret Management](#7-环境变量和密钥管理--environment-variables-and-secret-management)
8. [监控和日志 / Monitoring and Logging](#8-监控和日志--monitoring-and-logging)
9. [定期安全审计 / Regular Security Audits](#9-定期安全审计--regular-security-audits)

---

## 1. 服务器基础设施安全 / Server Infrastructure Security

### 1.1 基本原则 / Basic Principles

**中文：**
- 最小权限原则：只开放必要的服务和端口
- 纵深防御：多层安全措施
- 定期更新：及时修补系统漏洞
- 访问控制：严格限制管理访问

**English:**
- Principle of Least Privilege: Only expose necessary services and ports
- Defense in Depth: Multiple layers of security
- Regular Updates: Timely patch system vulnerabilities
- Access Control: Strictly limit administrative access

### 1.2 VPN 配置 / VPN Configuration

**强烈建议：所有管理和维护操作通过 VPN 进行**

**Strongly Recommended: All administrative and maintenance operations through VPN**

#### 推荐的 VPN 解决方案：

**A. WireGuard（推荐）**

```bash
# 安装 WireGuard
sudo apt update
sudo apt install wireguard

# 生成服务器密钥对
wg genkey | sudo tee /etc/wireguard/private.key
sudo chmod go= /etc/wireguard/private.key
sudo cat /etc/wireguard/private.key | wg pubkey | sudo tee /etc/wireguard/public.key

# 配置服务器 /etc/wireguard/wg0.conf
[Interface]
PrivateKey = <服务器私钥>
Address = 10.0.0.1/24
ListenPort = 51820
SaveConfig = true

# 为每个管理员添加 Peer
[Peer]
PublicKey = <客户端公钥>
AllowedIPs = 10.0.0.2/32

# 启动 WireGuard
sudo systemctl enable wg-quick@wg0
sudo systemctl start wg-quick@wg0
```

**B. OpenVPN（替代方案）**

```bash
# 使用 OpenVPN 的快速安装脚本
wget https://git.io/vpn -O openvpn-install.sh
sudo bash openvpn-install.sh
```

### 1.3 服务器加固 / Server Hardening

```bash
# 1. 更新系统
sudo apt update && sudo apt upgrade -y

# 2. 启用自动安全更新
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades

# 3. 安装 fail2ban 防止暴力破解
sudo apt install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# 4. 配置 fail2ban
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
```

---

## 2. SSH 安全配置 / SSH Security Configuration

### 2.1 配置 SSH 公钥/私钥认证 / Configure SSH Public/Private Key Authentication

**这是最重要的安全措施之一！**

**This is one of the most critical security measures!**

#### 步骤 1：生成 SSH 密钥对（在客户端）

```bash
# 在本地机器上生成 SSH 密钥对
ssh-keygen -t ed25519 -C "your_email@example.com"
# 或使用 RSA（如果 ed25519 不支持）
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"

# 设置强密码保护私钥
```

#### 步骤 2：将公钥复制到服务器

```bash
# 方法 1：使用 ssh-copy-id（推荐）
ssh-copy-id -i ~/.ssh/id_ed25519.pub username@server_ip

# 方法 2：手动复制
cat ~/.ssh/id_ed25519.pub | ssh username@server_ip "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

#### 步骤 3：配置 SSH 服务器 `/etc/ssh/sshd_config`

```bash
# 编辑 SSH 配置
sudo nano /etc/ssh/sshd_config
```

**关键配置项：**

```conf
# 禁用密码登录（只允许密钥登录）
PasswordAuthentication no
PubkeyAuthentication yes
ChallengeResponseAuthentication no

# 禁用 root 直接登录
PermitRootLogin no

# 更改 SSH 默认端口（可选，但建议）
# Port 22  # 改为非标准端口，如 2222
# 注意：如果通过 VPN 访问，可以保持 22 端口，因为外网访问不到

# 只允许特定用户登录
AllowUsers your_username

# 限制认证尝试次数
MaxAuthTries 3

# 禁用空密码
PermitEmptyPasswords no

# 禁用 X11 转发（如果不需要）
X11Forwarding no

# 使用强加密算法
Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com,aes128-gcm@openssh.com,aes256-ctr,aes192-ctr,aes128-ctr
MACs hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com,hmac-sha2-512,hmac-sha2-256
KexAlgorithms curve25519-sha256,curve25519-sha256@libssh.org,diffie-hellman-group16-sha512,diffie-hellman-group18-sha512,diffie-hellman-group-exchange-sha256

# 设置登录宽限时间
LoginGraceTime 30

# 客户端活动检测
ClientAliveInterval 300
ClientAliveCountMax 2
```

#### 步骤 4：重启 SSH 服务

```bash
# 重启前先测试配置
sudo sshd -t

# 如果没有错误，重启 SSH
sudo systemctl restart sshd

# ⚠️ 重启前确保你有另一个活跃的 SSH 会话，以防配置错误导致无法登录
```

### 2.2 SSH 双因素认证（可选，高级安全）

```bash
# 安装 Google Authenticator
sudo apt install libpam-google-authenticator

# 为用户配置
google-authenticator

# 编辑 PAM 配置
sudo nano /etc/pam.d/sshd
# 添加：
auth required pam_google_authenticator.so

# 编辑 SSH 配置
sudo nano /etc/ssh/sshd_config
# 修改：
ChallengeResponseAuthentication yes
AuthenticationMethods publickey,keyboard-interactive

sudo systemctl restart sshd
```

---

## 3. 防火墙和端口管理 / Firewall and Port Management

### 3.1 基本原则 / Basic Principles

**只开放提供业务服务的端口，不要把 SSH、数据库端口暴露到公网**

**Only expose ports for business services, DO NOT expose SSH or database ports to the public internet**

### 3.2 使用 UFW（Uncomplicated Firewall）

```bash
# 安装 UFW
sudo apt install ufw

# 默认策略：拒绝所有入站，允许所有出站
sudo ufw default deny incoming
sudo ufw default allow outgoing

# === 如果使用 VPN ===
# 只允许 VPN 端口从公网访问
sudo ufw allow 51820/udp comment 'WireGuard VPN'

# SSH 只允许从 VPN 网络访问
sudo ufw allow from 10.0.0.0/24 to any port 22 comment 'SSH from VPN only'

# === 如果不使用 VPN（不推荐）===
# 限制 SSH 访问（只允许特定 IP）
# sudo ufw allow from YOUR_OFFICE_IP to any port 22

# 业务端口（示例）
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'

# 启用防火墙
sudo ufw enable

# 查看状态
sudo ufw status verbose
```

### 3.3 云服务商安全组配置

**如果使用 AWS、GCP、Azure、阿里云等：**

#### AWS Security Groups 示例：

```
入站规则 / Inbound Rules:
1. HTTPS (443) - 0.0.0.0/0 (公网访问业务)
2. HTTP (80) - 0.0.0.0/0 (可选，建议重定向到 HTTPS)
3. WireGuard (51820/UDP) - 0.0.0.0/0 (VPN 入口)
4. SSH (22) - <VPN IP 范围> 10.0.0.0/24 (仅 VPN 内部)

出站规则 / Outbound Rules:
1. All traffic - 0.0.0.0/0
```

### 3.4 数据库端口安全

**关键：数据库端口（PostgreSQL 5432、MySQL 3306 等）绝不能暴露到公网**

**Critical: Database ports (PostgreSQL 5432, MySQL 3306, etc.) MUST NEVER be exposed to the public internet**

由于 SheFixes 使用 Supabase（托管数据库），数据库安全由 Supabase 处理。但如果自建数据库：

```bash
# 如果使用自建数据库，只允许应用服务器访问
sudo ufw allow from <应用服务器IP> to any port 5432

# PostgreSQL 配置 /etc/postgresql/*/main/pg_hba.conf
# 只允许本地和特定 IP 访问
host    all             all             127.0.0.1/32            scram-sha-256
host    all             all             <应用服务器IP>/32      scram-sha-256
```

---

## 4. 应用层安全 / Application Security

### 4.1 防止 SQL 注入 / Prevent SQL Injection

**SheFixes 使用 Supabase，已有内置保护，但仍需注意：**

#### ✅ 正确做法：使用参数化查询

```javascript
// ✅ GOOD - Supabase 客户端会自动处理参数化
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('email', userEmail)  // 安全：Supabase 会自动转义

const { data, error } = await supabase
  .from('bookings')
  .insert([{
    user_id: currentUser.id,
    service_type: bookingData.service_type  // 安全：参数化插入
  }])
```

#### ❌ 危险做法：字符串拼接（避免）

```javascript
// ❌ BAD - 永远不要这样做
const query = `SELECT * FROM users WHERE email = '${userEmail}'`
// 这会导致 SQL 注入漏洞
```

#### Supabase Row Level Security (RLS) 策略

**必须启用 RLS 并配置正确的策略：**

```sql
-- 启用 RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- 用户只能查看和修改自己的数据
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- 用户只能查看自己的订单
CREATE POLICY "Users can view own bookings" ON bookings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own bookings" ON bookings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 技师可以查看分配给自己的订单
CREATE POLICY "Technicians can view assigned bookings" ON bookings
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM technicians WHERE technicians.user_id = auth.uid()
    )
    OR auth.uid() = user_id
  );

-- 只允许订单相关方查看消息
CREATE POLICY "View messages for own bookings" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = messages.booking_id
      AND (bookings.user_id = auth.uid() OR bookings.technician_id = auth.uid())
    )
  );

-- 防止用户冒充他人发送消息
CREATE POLICY "Insert messages for own bookings" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_id
      AND (bookings.user_id = auth.uid() OR bookings.technician_id = auth.uid())
    )
  );
```

### 4.2 防止 XSS（跨站脚本攻击）/ Prevent XSS

#### React 自带保护

React 默认会转义所有内容，但需注意以下情况：

```javascript
// ✅ SAFE - React 自动转义
<p>{userInput}</p>
<div>{booking.description}</div>

// ❌ DANGEROUS - 直接插入 HTML
<div dangerouslySetInnerHTML={{__html: userInput}} />
// 除非绝对必要且已清理，否则不要使用

// ✅ SAFE - 如果必须使用 HTML，使用 DOMPurify
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{
  __html: DOMPurify.sanitize(userInput)
}} />
```

#### 输入验证和清理

```javascript
// 在 App.jsx 中添加输入验证函数
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;

  // 移除潜在危险字符
  return input
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
};

// 使用示例
const handleBookingSubmit = async (e) => {
  e.preventDefault();

  const sanitizedData = {
    ...bookingForm,
    description: sanitizeInput(bookingForm.description),
    service_address: sanitizeInput(bookingForm.service_address)
  };

  // 继续提交...
};
```

### 4.3 CSRF 防护 / CSRF Protection

**Supabase 自带 CSRF 保护，但需确保：**

```javascript
// 1. 使用 HTTPS（生产环境必须）
// 2. 正确配置 CORS

// vite.config.js - 开发环境配置
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // 限制 CORS
    cors: {
      origin: ['http://localhost:3000', 'https://yourdomain.com'],
      credentials: true
    }
  }
})
```

### 4.4 文件上传安全 / File Upload Security

**当前代码中使用 photo_url（字符串），如果将来实现文件上传：**

```javascript
// 文件上传最佳实践
const handleFileUpload = async (file) => {
  // 1. 验证文件类型
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type');
  }

  // 2. 验证文件大小（例如：5MB）
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error('File too large');
  }

  // 3. 生成随机文件名（防止路径遍历）
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;

  // 4. 上传到 Supabase Storage
  const { data, error } = await supabase.storage
    .from('booking-photos')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw error;

  return data.path;
};
```

**Supabase Storage 安全策略：**

```sql
-- 创建 Storage 策略
CREATE POLICY "Users can upload own photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'booking-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Anyone can view photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'booking-photos');

CREATE POLICY "Users can delete own photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'booking-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

### 4.5 认证和会话管理 / Authentication and Session Management

```javascript
// 1. 设置合理的会话超时
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
  // Supabase 默认使用 JWT，过期时间由 Supabase 项目设置控制
});

// 2. 在 Supabase Dashboard 配置：
// - JWT expiry: 3600 (1小时)
// - Refresh token rotation: 启用
// - Minimum password length: 8-12 字符
// - Password requirements: 需要大小写、数字、特殊字符

// 3. 自动刷新会话
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed successfully');
      }
      if (event === 'SIGNED_OUT') {
        // 清理客户端数据
        setCurrentUser(null);
        setUserBookings([]);
      }
    }
  );

  return () => subscription.unsubscribe();
}, []);
```

### 4.6 密码策略 / Password Policy

**在注册时增强密码验证：**

```javascript
const validatePassword = (password) => {
  const errors = [];

  // 最小长度
  if (password.length < 8) {
    errors.push(region === 'us'
      ? 'Password must be at least 8 characters'
      : '密码至少8个字符');
  }

  // 包含大写字母
  if (!/[A-Z]/.test(password)) {
    errors.push(region === 'us'
      ? 'Password must contain uppercase letter'
      : '密码必须包含大写字母');
  }

  // 包含小写字母
  if (!/[a-z]/.test(password)) {
    errors.push(region === 'us'
      ? 'Password must contain lowercase letter'
      : '密码必须包含小写字母');
  }

  // 包含数字
  if (!/[0-9]/.test(password)) {
    errors.push(region === 'us'
      ? 'Password must contain number'
      : '密码必须包含数字');
  }

  // 包含特殊字符
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push(region === 'us'
      ? 'Password must contain special character'
      : '密码必须包含特殊字符');
  }

  return errors;
};

// 在注册时使用
const handleUserRegister = async (e) => {
  e.preventDefault();
  const passwordErrors = validatePassword(registerData.password);

  if (passwordErrors.length > 0) {
    setError(passwordErrors.join('. '));
    return;
  }

  // 继续注册...
};
```

### 4.7 Rate Limiting（速率限制）

**防止暴力破解和 DDoS 攻击：**

```javascript
// 使用 Supabase Edge Functions 实现速率限制
// 或在应用层实现简单的客户端速率限制

const rateLimiter = new Map();

const checkRateLimit = (key, maxAttempts = 5, windowMs = 60000) => {
  const now = Date.now();
  const attempts = rateLimiter.get(key) || [];

  // 清除过期的尝试
  const validAttempts = attempts.filter(time => now - time < windowMs);

  if (validAttempts.length >= maxAttempts) {
    const oldestAttempt = Math.min(...validAttempts);
    const waitTime = Math.ceil((windowMs - (now - oldestAttempt)) / 1000);
    throw new Error(`Too many attempts. Please wait ${waitTime} seconds.`);
  }

  validAttempts.push(now);
  rateLimiter.set(key, validAttempts);

  return true;
};

// 在登录时使用
const handleLogin = async (e) => {
  e.preventDefault();

  try {
    checkRateLimit(`login:${loginData.email}`, 5, 60000);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginData.email,
      password: loginData.password
    });

    // ...
  } catch (error) {
    setError(error.message);
  }
};
```

---

## 5. Supabase 安全配置 / Supabase Security Configuration

### 5.1 API 密钥管理 / API Key Management

**关键：区分 anon key 和 service role key**

```javascript
// ✅ GOOD - 在客户端只使用 anon key
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY  // 公开密钥，受 RLS 保护
);

// ❌ NEVER - 不要在客户端使用 service_role key
// const supabase = createClient(url, SERVICE_ROLE_KEY);  // 危险！
```

**service_role key 只能在后端使用（如果有）：**
- 具有完全数据库访问权限
- 绕过所有 RLS 策略
- 绝不能暴露到客户端代码或版本控制

### 5.2 环境变量配置

**创建 `.env.local` 文件（不提交到 Git）：**

```env
# .env.local
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# 如果有后端服务
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here  # 仅后端使用
```

**更新 `.gitignore`：**

```gitignore
# 环境变量
.env
.env.local
.env.production
.env.development

# 敏感配置
**/config/secrets.js
**/config/credentials.json
```

### 5.3 Supabase 项目安全设置

**在 Supabase Dashboard 中配置：**

#### Authentication Settings
```
1. Enable Email Confirmations: ✅ 启用（防止虚假注册）
2. Secure Email Change: ✅ 启用
3. JWT Expiry: 3600 seconds (1小时)
4. Refresh Token Expiry: 604800 seconds (7天)
5. Enable Anonymous Sign-ins: ❌ 禁用
6. Enable Email OTP: ✅ 可选启用（额外安全）
7. Password minimum length: 8-12 characters
8. Disable Sign-ups: ❌ 保持启用（除非只允许邀请）
```

#### Database Settings
```
1. Connection Pooling Mode: Transaction
2. SSL Mode: Require
3. Enable Webhooks: 按需启用
```

#### API Settings
```
1. Auto-schema reloading: ✅ 启用
2. Max Rows: 1000（防止大查询）
3. DB Schema: public
4. Extra Search Path: public, extensions
```

### 5.4 数据库备份

**启用自动备份（Supabase Pro）：**

```
1. Point-in-Time Recovery (PITR): 启用
2. Daily Backups: 启用
3. Retention Period: 至少 7 天
```

**手动备份（免费层）：**

```bash
# 使用 pg_dump 定期备份
pg_dump -h db.xxx.supabase.co \
  -U postgres \
  -d postgres \
  --format=custom \
  --no-owner \
  --no-acl \
  -f backup_$(date +%Y%m%d).dump

# 加密备份文件
gpg --symmetric --cipher-algo AES256 backup_$(date +%Y%m%d).dump
```

---

## 6. 代码安全最佳实践 / Code Security Best Practices

### 6.1 依赖安全 / Dependency Security

```bash
# 定期检查依赖漏洞
npm audit

# 自动修复
npm audit fix

# 查看可修复的严重漏洞
npm audit fix --force  # 谨慎使用，可能破坏兼容性

# 使用 Snyk 进行更深入的扫描
npx snyk test
```

**创建 `package.json` 脚本：**

```json
{
  "scripts": {
    "security:audit": "npm audit",
    "security:fix": "npm audit fix",
    "security:check": "npm outdated && npm audit"
  }
}
```

### 6.2 Content Security Policy (CSP)

**在 `index.html` 中添加 CSP header（如果自托管）：**

```html
<!-- index.html -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self' data:;
  connect-src 'self' https://*.supabase.co wss://*.supabase.co;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
">
```

**或使用 Vercel/Netlify headers 配置：**

```json
// vercel.json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline'; connect-src 'self' https://*.supabase.co wss://*.supabase.co"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=()"
        }
      ]
    }
  ]
}
```

### 6.3 HTTPS 强制使用

**生产环境必须使用 HTTPS！**

```javascript
// 在应用启动时检查
if (import.meta.env.PROD && window.location.protocol !== 'https:') {
  window.location.href = window.location.href.replace('http:', 'https:');
}
```

### 6.4 安全的本地存储

```javascript
// ❌ 不要在 localStorage 存储敏感信息
localStorage.setItem('password', password);  // 危险！

// ✅ Supabase 会自动处理 token 存储
// 默认使用 localStorage，但已加密
// 如果需要更高安全性，使用内存存储

const supabase = createClient(url, key, {
  auth: {
    storage: window.localStorage,  // 或 sessionStorage
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});
```

---

## 7. 环境变量和密钥管理 / Environment Variables and Secret Management

### 7.1 开发环境

```bash
# .env.local（本地开发）
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx

# .env.production（生产环境，不提交）
VITE_SUPABASE_URL=https://prod.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```

### 7.2 生产环境（Vercel/Netlify）

**在平台的环境变量设置中配置，不要硬编码在代码中：**

```
Vercel Dashboard → Project → Settings → Environment Variables
Netlify Dashboard → Site → Site settings → Build & deploy → Environment
```

### 7.3 密钥轮换

**定期更换 API 密钥（建议每 3-6 个月）：**

1. 在 Supabase Dashboard 生成新的 API 密钥
2. 更新所有环境的环境变量
3. 废除旧密钥
4. 监控错误日志确保迁移成功

---

## 8. 监控和日志 / Monitoring and Logging

### 8.1 服务器监控

```bash
# 安装监控工具
sudo apt install prometheus-node-exporter

# 或使用云监控服务：
# - AWS CloudWatch
# - Google Cloud Monitoring
# - Datadog
# - New Relic
```

### 8.2 应用日志

**安全相关的事件必须记录：**

```javascript
// 创建安全日志函数
const securityLog = async (event, details) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    user_id: currentUser?.id,
    ip_address: '...',  // 从请求中获取
    details
  };

  // 记录到 Supabase
  await supabase.from('security_logs').insert([logEntry]);

  // 或发送到外部日志服务（如 Sentry、LogRocket）
  console.warn('Security Event:', logEntry);
};

// 使用示例
const handleLogin = async (e) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginData.email,
      password: loginData.password
    });

    if (error) {
      await securityLog('login_failed', { email: loginData.email, error: error.message });
      throw error;
    }

    await securityLog('login_success', { email: loginData.email });
  } catch (error) {
    // ...
  }
};
```

**需要记录的安全事件：**
- 登录成功/失败
- 注册尝试
- 密码更改
- 权限升级
- 敏感数据访问
- 可疑活动（如频繁失败尝试）

### 8.3 错误监控

**集成 Sentry 进行错误跟踪：**

```bash
npm install @sentry/react
```

```javascript
// main.jsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay({
      maskAllText: true,  // 隐藏敏感文本
      blockAllMedia: true,
    }),
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  beforeSend(event, hint) {
    // 过滤敏感信息
    if (event.request) {
      delete event.request.cookies;
      delete event.request.headers?.Authorization;
    }
    return event;
  },
});
```

---

## 9. 定期安全审计 / Regular Security Audits

### 9.1 每周检查清单

```
✅ 检查依赖更新和安全补丁
✅ 审查失败登录日志
✅ 检查异常流量模式
✅ 验证备份完整性
✅ 测试恢复流程
```

### 9.2 每月检查清单

```
✅ 审查 Supabase RLS 策略
✅ 检查用户权限分配
✅ 审查 API 使用模式
✅ 更新安全文档
✅ 进行渗透测试（如果可能）
✅ 审查代码中的 TODO 和 FIXME
```

### 9.3 每季度检查清单

```
✅ 轮换 API 密钥
✅ 审查服务器访问日志
✅ 更新安全策略
✅ 培训团队安全意识
✅ 进行灾难恢复演练
✅ 审计第三方集成
```

### 9.4 安全扫描工具

```bash
# 使用 OWASP ZAP 进行安全扫描
docker run -t owasp/zap2docker-stable zap-baseline.py -t https://yourdomain.com

# 使用 npm audit
npm audit

# 使用 Snyk
npm install -g snyk
snyk auth
snyk test

# 检查敏感信息泄露
git secrets --scan
```

---

## 10. 应急响应计划 / Incident Response Plan

### 10.1 安全事件分类

**级别 1（严重）：**
- 数据泄露
- 服务器被入侵
- 大规模 DDoS 攻击

**级别 2（高）：**
- 未授权访问尝试成功
- 恶意代码注入
- 重要服务中断

**级别 3（中）：**
- 暴力破解尝试
- 可疑活动
- 配置错误

### 10.2 响应流程

**1. 检测和确认**
```
→ 监控系统报警
→ 分析日志
→ 确认安全事件
→ 评估影响范围
```

**2. 遏制**
```
→ 隔离受影响系统
→ 阻止攻击源 IP
→ 临时禁用受影响功能
→ 通知相关人员
```

**3. 根除**
```
→ 识别漏洞
→ 修复安全问题
→ 更新所有系统
→ 轮换所有密钥
```

**4. 恢复**
```
→ 从备份恢复数据
→ 验证系统完整性
→ 逐步恢复服务
→ 加强监控
```

**5. 总结**
```
→ 记录事件详情
→ 分析原因
→ 更新安全措施
→ 培训团队
```

### 10.3 联系人

```
安全负责人：[姓名] - [联系方式]
技术负责人：[姓名] - [联系方式]
Supabase 支持：support@supabase.io
紧急联系：[备用联系方式]
```

---

## 11. 合规和法律 / Compliance and Legal

### 11.1 数据保护法规

**GDPR（欧洲）/ CCPA（加州）合规：**

```javascript
// 用户数据导出功能
const exportUserData = async (userId) => {
  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*')
    .eq('user_id', userId);

  return {
    user: userData,
    bookings,
    exported_at: new Date().toISOString()
  };
};

// 用户数据删除功能（"被遗忘权"）
const deleteUserData = async (userId) => {
  // 1. 匿名化订单数据（保留统计）
  await supabase
    .from('bookings')
    .update({ user_id: null, service_address: '[deleted]' })
    .eq('user_id', userId);

  // 2. 删除消息
  await supabase
    .from('messages')
    .delete()
    .eq('sender_id', userId);

  // 3. 删除用户账户
  await supabase
    .from('users')
    .delete()
    .eq('id', userId);

  // 4. 删除认证账户
  await supabase.auth.admin.deleteUser(userId);
};
```

### 11.2 隐私政策

**必须包含：**
- 收集哪些数据
- 如何使用数据
- 数据保存期限
- 用户权利（访问、修改、删除）
- Cookie 使用
- 第三方服务（Supabase）

---

## 12. 安全检查清单 / Security Checklist

### 🔒 基础设施安全

```
□ SSH 配置为公钥/私钥认证
□ 禁用密码登录
□ 禁用 root 直接登录
□ 配置 VPN（WireGuard 或 OpenVPN）
□ 防火墙已启用并正确配置
□ SSH 端口不对公网开放（仅 VPN）
□ 数据库端口不对公网开放
□ 启用自动安全更新
□ 配置 fail2ban
□ HTTPS 强制启用
```

### 🔐 应用安全

```
□ 所有 Supabase 表启用 RLS
□ RLS 策略正确配置
□ 输入验证和清理
□ XSS 防护
□ CSRF 防护
□ 密码强度验证（8+ 字符，大小写、数字、特殊字符）
□ 速率限制
□ 会话超时配置
□ 文件上传验证（类型、大小）
□ Content Security Policy 配置
```

### 🗄️ 数据安全

```
□ 环境变量不提交到 Git
□ .env 文件在 .gitignore 中
□ anon key 和 service_role key 分离
□ service_role key 不在客户端使用
□ 数据库定期备份
□ 备份加密存储
□ 敏感数据加密（如有）
```

### 📊 监控和日志

```
□ 安全事件日志记录
□ 错误监控（Sentry）
□ 服务器监控
□ 失败登录跟踪
□ 定期审查日志
□ 异常流量告警
```

### 🔄 维护

```
□ 每周检查依赖更新
□ 每月运行 npm audit
□ 每季度轮换密钥
□ 定期备份测试
□ 安全培训
□ 应急响应计划已制定
```

---

## 13. 参考资源 / Resources

### 官方文档
- [Supabase Security](https://supabase.com/docs/guides/security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [React Security Best Practices](https://reactjs.org/docs/security.html)

### 安全工具
- [Snyk](https://snyk.io/) - 依赖漏洞扫描
- [OWASP ZAP](https://www.zaproxy.org/) - 渗透测试
- [Sentry](https://sentry.io/) - 错误监控
- [Let's Encrypt](https://letsencrypt.org/) - 免费 SSL 证书

### 学习资源
- [Web Security Academy](https://portswigger.net/web-security)
- [Supabase University](https://supabase.com/docs)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)

---

## 14. 总结 / Summary

**关键安全措施优先级：**

### 🔴 关键（立即实施）
1. SSH 公钥认证 + 禁用密码登录
2. 启用防火墙，只开放业务端口
3. 配置 VPN，SSH 仅通过 VPN 访问
4. 启用 Supabase RLS 策略
5. HTTPS 强制使用
6. 环境变量正确管理

### 🟡 重要（1周内实施）
1. 密码强度验证
2. 速率限制
3. 输入验证和清理
4. 数据库定期备份
5. fail2ban 配置
6. 安全日志记录

### 🟢 推荐（1个月内实施）
1. CSP 配置
2. 错误监控（Sentry）
3. 双因素认证
4. 安全审计流程
5. 应急响应计划
6. 依赖扫描自动化

---

**记住：安全是一个持续的过程，不是一次性的任务！**

**Remember: Security is an ongoing process, not a one-time task!**

---

**更新日期 / Last Updated:** 2025-11-04
**版本 / Version:** 1.0
**维护者 / Maintainer:** SheFixes Security Team
