# SheFixes 微信小程序

女性专属维修服务平台 - 微信小程序版本

## 项目简介

SheFixes 微信小程序是基于原 React Web 应用改造的微信小程序版本。主要改进包括：

- ✅ **微信一键登录**：使用微信账号快速登录
- ✅ **微信实名认证**：替换原有的自拍验证，使用微信实名认证
- ✅ **原生小程序体验**：更流畅的用户体验
- ✅ **完整的预约流程**：从浏览技师到预约服务的完整闭环

## 技术栈

- **前端框架**：微信小程序原生框架
- **后端服务**：Supabase (保持与 Web 版一致)
- **数据库**：PostgreSQL (Supabase)
- **认证方式**：微信登录 + Supabase Auth
- **实名认证**：微信实名认证

## 项目结构

```
miniprogram/
├── pages/                    # 页面
│   ├── index/               # 首页
│   ├── login/               # 登录页
│   ├── register/            # 注册页
│   ├── booking/             # 预约页
│   ├── technician-list/     # 技师列表
│   └── my/                  # 我的
├── utils/                   # 工具函数
│   ├── supabase.js         # Supabase 客户端
│   ├── wechat-auth.js      # 微信认证
│   └── util.js             # 通用工具
├── components/              # 组件
├── images/                  # 图片资源
├── app.js                   # 小程序入口
├── app.json                 # 小程序配置
└── app.wxss                 # 全局样式
```

## 核心功能

### 1. 用户认证

#### 微信一键登录
- 用户点击"微信一键登录"
- 获取微信用户信息（昵称、头像）
- 检查用户是否已在数据库中
- 已注册：直接登录
- 未注册：引导到注册页面

#### 邮箱密码登录
- 支持传统的邮箱密码登录
- 使用 Supabase Auth 进行认证

### 2. 微信实名认证（替换自拍验证）

**实现方案**：

原 Web 版使用自拍验证，在小程序版本中改为**微信实名认证**。

#### 实名认证流程

1. **用户注册时**
   - 必须完成微信实名认证才能注册
   - 点击"开始实名认证"按钮
   - 调用 `simpleRealnameVerify()` 函数

2. **认证方式**
   - 方案1：使用微信账号信息（默认）
     - 微信账号本身已实名认证
     - 获取微信登录凭证（code）
     - 获取用户信息（昵称、头像）

   - 方案2：微信支付验证（可选）
     - 通过微信支付的实名信息验证
     - 需要后端配置

   - 方案3：第三方实名认证（企业版）
     - 接入阿里云、腾讯云等服务
     - 上传身份证照片验证

3. **数据库字段更新**
   ```sql
   realname_verified: true
   realname_verified_at: timestamp
   realname_method: 'wechat'
   wechat_openid: openid (需服务器端获取)
   ```

4. **预约前检查**
   - 用户预约服务前自动检查实名状态
   - 未认证：显示认证提示，引导完成认证
   - 已认证：允许预约

#### 实名认证代码位置

- `miniprogram/utils/wechat-auth.js` - 认证逻辑
- `miniprogram/pages/register/register.js` - 注册页面集成
- `miniprogram/pages/booking/booking.js` - 预约前检查

### 3. 服务预约

- 选择服务类型（8种服务）
- 填写问题描述
- 选择预约日期和时间
- 填写服务地址
- 提交预约

### 4. 技师浏览

- 查看已认证的技师列表
- 按城市筛选
- 查看技师评分、经验等信息
- 识别已实名认证的技师（显示✓标识）

## 数据库变更

### 需要更新的字段

原 Web 版使用的字段：
```sql
selfie_verified: boolean
selfie_photo_url: text
selfie_verified_at: timestamp
```

微信小程序版新增/修改字段：
```sql
-- 用户表 (users)
realname_verified: boolean        -- 实名认证状态
realname_verified_at: timestamp   -- 认证时间
realname_method: text             -- 认证方式 ('wechat', 'wechat_pay', 'third_party')
wechat_nickname: text             -- 微信昵称
wechat_avatar: text               -- 微信头像
wechat_openid: text               -- 微信 OpenID (需服务器端获取)
last_login_at: timestamp          -- 最后登录时间

-- 技师表 (technicians)
realname_verified: boolean        -- 实名认证状态
realname_verified_at: timestamp   -- 认证时间
realname_method: text             -- 认证方式
rating: numeric                   -- 评分
experience: integer               -- 工作年限
bio: text                         -- 个人简介
avatar: text                      -- 头像
```

### 数据库迁移脚本

请运行 `miniprogram/database-migration-wechat.sql` 文件来更新数据库结构。

## 配置步骤

### 1. 微信小程序配置

1. **注册小程序**
   - 登录[微信公众平台](https://mp.weixin.qq.com/)
   - 注册小程序账号
   - 获取 AppID 和 AppSecret

2. **配置服务器域名**
   - 在小程序后台配置以下域名：
   ```
   request 合法域名:
   - https://hixmjkytrbthobllqrqo.supabase.co

   socket 合法域名:
   - wss://hixmjkytrbthobllqrqo.supabase.co
   ```

3. **配置业务域名**（如需要）
   - 下载校验文件
   - 上传到服务器

### 2. Supabase 配置

Supabase 配置已包含在 `miniprogram/utils/supabase.js` 中，使用与 Web 版相同的配置。

如需修改，请更新：
```javascript
const supabaseUrl = 'YOUR_SUPABASE_URL'
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY'
```

### 3. 服务器端配置（重要）

**获取微信 OpenID**：

微信小程序中，需要服务器端来换取 OpenID。请按以下步骤配置：

1. **创建服务器端 API**
   ```
   POST /api/wechat/login
   Body: { code: '微信登录凭证' }
   Return: { openid, session_key, ... }
   ```

2. **服务器端代码示例（Node.js）**
   ```javascript
   const axios = require('axios')

   app.post('/api/wechat/login', async (req, res) => {
     const { code } = req.body
     const appid = 'YOUR_APPID'
     const secret = 'YOUR_APPSECRET'

     const result = await axios.get(
       `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`
     )

     res.json(result.data)
   })
   ```

3. **更新小程序代码**
   - 在 `miniprogram/utils/wechat-auth.js` 中
   - 调用你的服务器 API 获取 openid

### 4. 图片资源

请准备以下图片资源并放置在 `miniprogram/images/` 目录：

**TabBar 图标**:
- `home.png` / `home-active.png` (首页)
- `technician.png` / `technician-active.png` (技师)
- `user.png` / `user-active.png` (我的)

**服务图标**:
- `service-plumbing.png` (水电)
- `service-appliance.png` (家电)
- `service-carpentry.png` (木工)
- `service-painting.png` (油漆)
- `service-lock.png` (锁具)
- `service-pipe.png` (管道)
- `service-furniture.png` (家具)
- `service-other.png` (其他)

**其他图标**:
- `logo.png` (应用 Logo)
- `wechat-icon.png` (微信图标)
- `avatar-default.png` (默认头像)
- `warning.png` (警告图标)
- `check.png` (选中图标)
- `banner-bg.png` (横幅背景)

尺寸建议：
- TabBar 图标：81px × 81px
- 服务图标：96px × 96px
- Logo：160px × 160px

## 开发调试

### 1. 安装微信开发者工具

下载并安装[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)

### 2. 导入项目

1. 打开微信开发者工具
2. 选择"导入项目"
3. 项目目录选择 `miniprogram` 文件夹
4. AppID 填写你的小程序 AppID
5. 点击"导入"

### 3. 安装依赖

小程序需要使用 npm 包（Supabase SDK）：

```bash
cd miniprogram
npm install @supabase/supabase-js
```

然后在微信开发者工具中：
- 点击"工具" -> "构建 npm"
- 等待构建完成

### 4. 本地调试

1. 在开发者工具中点击"编译"
2. 查看模拟器效果
3. 使用"真机调试"在手机上测试

## 部署上线

### 1. 完善小程序信息

在微信公众平台完善：
- 小程序头像和名称
- 服务类目
- 隐私政策
- 用户协议

### 2. 提交审核

1. 在微信开发者工具中点击"上传"
2. 填写版本号和项目备注
3. 登录微信公众平台
4. 进入"版本管理" -> "开发版本"
5. 提交审核

### 3. 发布

审核通过后，在"版本管理"中点击"发布"即可。

## 关键差异对比

| 功能 | Web 版 | 小程序版 |
|------|--------|----------|
| 登录方式 | 邮箱密码 | 微信一键登录 + 邮箱密码 |
| 身份认证 | 自拍验证 | **微信实名认证** |
| 认证字段 | selfie_verified | realname_verified |
| 认证方式 | 相机自拍上传 | 微信账号认证 |
| 用户体验 | Web 浏览器 | 微信原生小程序 |
| 分享功能 | Web 分享 | 微信小程序分享卡片 |

## 常见问题

### 1. Supabase 请求失败

**问题**：小程序无法连接 Supabase

**解决**：
- 检查小程序后台是否配置了 Supabase 域名
- 确认域名必须是 https
- 检查网络请求权限

### 2. 微信登录失败

**问题**：获取不到用户信息

**解决**：
- 确认使用了 `wx.getUserProfile` 而非废弃的 `wx.getUserInfo`
- 必须由用户主动触发（button 点击）
- 检查小程序权限设置

### 3. 实名认证无效

**问题**：认证后状态未更新

**解决**：
- 检查数据库字段是否正确
- 确认 `app.updateRealnameStatus()` 被调用
- 检查全局状态是否同步

### 4. 图片不显示

**问题**：TabBar 图标或其他图片不显示

**解决**：
- 检查图片路径是否正确
- 确认图片文件存在
- 图片大小不超过 40KB（TabBar 限制）

## 后续优化建议

1. **接入服务器端 API**
   - 实现微信 OpenID 获取
   - 完善实名认证流程

2. **增强实名认证**
   - 接入第三方实名认证服务
   - 添加微信支付验证选项

3. **技师端小程序**
   - 开发技师端独立小程序
   - 实现接单、服务管理等功能

4. **在线聊天**
   - 用户与技师实时沟通
   - 使用 WebSocket 或云开发

5. **支付功能**
   - 接入微信支付
   - 实现线上支付和结算

6. **评价系统**
   - 服务完成后评价
   - 技师评分系统

7. **地图定位**
   - 使用微信地图选择服务地址
   - 显示附近技师

## 许可证

MIT License

## 联系方式

如有问题，请联系开发团队。
