# SheFixes 注册系统指南 / Registration System Guide

## 🆕 更新内容 / Updates

现在 SheFixes 支持**两种注册类型**：用户注册和技师注册！

## 📝 注册流程 / Registration Flow

### 👤 用户注册 / User Registration

**适用于**：需要维修服务的用户

**注册字段**：
- 📧 邮箱 / Email
- 🔒 密码 / Password (至少6个字符)
- 👤 姓名 / Name
- 📱 手机号 / Phone
- 🏙️ 城市 / City

**注册流程**：
1. 点击"Register as User" / "注册用户"
2. 填写基本信息
3. 点击"Create Account" / "创建账号"
4. **立即获得批准**，可以开始预约服务

**数据库操作**：
```sql
-- 在 auth.users 创建认证用户
-- 在 users 表创建用户记录
INSERT INTO users (id, email, name, phone, city, preference, region, status)
VALUES (uuid, email, name, phone, city, 'women-only', region, 'approved');
```

---

### 🔧 技师注册 / Technician Registration

**适用于**：提供维修服务的专业技师

**注册字段**：

#### 基本信息 / Basic Information
- 📧 邮箱 / Email
- 🔒 密码 / Password
- 👤 姓名 / Full Name
- 📱 手机号 / Phone Number
- 🏙️ 城市 / City
- 💰 时薪 / Hourly Rate

#### 专业信息 / Professional Information
- 🛠️ **服务类别** / Service Categories (多选)
  - Plumbing / 水管维修
  - Electrical / 电路维修
  - HVAC / 空调暖气
  - Carpentry / 木工
  - Painting / 油漆粉刷
  - Appliance Repair / 家电维修
  - Other / 其他

- 👥 性别 / Gender
  - Female / 女
  - Male / 男
  - Non-binary / 非二元
  - Prefer not to say / 不愿透露

- 👫 客户偏好 / Client Preference
  - Women Only / 仅限女性
  - Anyone / 不限
  - LGBTQ+ Friendly / LGBTQ+友好

#### 可选信息 / Optional Information
- 📝 个人简介 / Bio
- 🔨 拥有工具 / Tools You Own

**注册流程**：
1. 点击"Register as Technician" / "注册技师"
2. 填写所有必填信息
3. 选择至少一个服务类别
4. 点击"Create Account" / "创建账号"
5. **等待管理员审核**

**数据库操作**：
```sql
-- 在 auth.users 创建认证用户
-- 在 users 表创建用户记录
INSERT INTO users (id, email, name, phone, city, region, status)
VALUES (uuid, email, name, phone, city, region, 'pending');

-- 在 technicians 表创建技师记录
INSERT INTO technicians (
  user_id, name, email, phone, service_area,
  service_categories, hourly_rate, client_preference,
  gender, bio, tools, rating, jobs_completed, status, region
) VALUES (
  uuid, name, email, phone, [city],
  service_categories_array, hourly_rate, client_preference,
  gender, bio, tools, 5.0, 0, 'pending', region
);
```

---

## 🎨 用户界面 / User Interface

### 三标签设计 / Three-Tab Design
```
┌─────────┬──────────────────┬──────────────────────┐
│  Login  │ Register as User │ Register as Technician│
└─────────┴──────────────────┴──────────────────────┘
```

- **登录**：统一的登录入口
- **注册用户**：简化表单，快速注册
- **注册技师**：详细表单，专业认证

### 响应式布局
- 移动端：单列布局
- 桌面端：双列布局（技师表单）
- 可滚动表单容器（最大高度70vh）

---

## 🔐 状态管理 / Status Management

### 用户状态
| 状态 | 说明 | 权限 |
|------|------|------|
| `approved` | 已批准 | 可以预约服务、查看订单、与技师聊天 |

### 技师状态
| 状态 | 说明 | 权限 |
|------|------|------|
| `pending` | 待审核 | 无法接单，等待管理员审核 |
| `active` | 已激活 | 可以接单、与用户聊天 |
| `inactive` | 已停用 | 暂时无法接单 |

---

## 💻 代码实现 / Implementation

### 状态管理
```javascript
const [authMode, setAuthMode] = useState('login');
// 可能值: 'login', 'register-user', 'register-technician'

const [registerData, setRegisterData] = useState({...});  // 用户注册数据
const [technicianData, setTechnicianData] = useState({...});  // 技师注册数据
```

### 注册函数
- `handleUserRegister(e)` - 处理用户注册
- `handleTechnicianRegister(e)` - 处理技师注册

---

## 📋 使用示例 / Usage Examples

### 用户注册示例
```
姓名：张小美
邮箱：xiaomei@example.com
密码：123456
手机：13800138000
城市：北京

✅ 注册成功！立即可以预约服务
```

### 技师注册示例
```
姓名：李技师
邮箱：technician@example.com
密码：secure123
手机：13900139000
城市：上海
时薪：150 元/小时

服务类别：✓ 水管维修  ✓ 电路维修
性别：女
客户偏好：仅限女性
个人简介：10年水电维修经验，持证上岗
工具：扳手、钳子、电钻、测电笔等

⏳ 注册成功！请等待管理员审核
```

---

## 🔍 验证逻辑 / Validation

### 通用验证
- ✅ 邮箱格式验证
- ✅ 密码长度 ≥ 6个字符
- ✅ 所有必填字段检查

### 技师特殊验证
- ✅ 至少选择1个服务类别
- ✅ 时薪必须是有效数字
- ✅ 时薪 > 0

---

## 🌍 多语言支持 / Multilingual Support

所有字段和提示信息都支持：
- 🇺🇸 English
- 🇨🇳 简体中文

一键切换语言，无需重新填写表单！

---

## 🚀 后续步骤 / Next Steps

### 对于用户
1. 注册完成后自动跳转到登录页
2. 登录后可以：
   - 预约服务
   - 查看我的订单
   - 与技师聊天
   - 评价服务

### 对于技师
1. 注册后状态为 `pending`
2. 等待管理员审核
3. 审核通过后状态变为 `active`
4. 可以接收和处理订单

---

## 📊 数据库表关系 / Database Relations

```
auth.users (Supabase Auth)
    ↓
users (基本用户信息)
    ↓
technicians (技师详细信息) ← 仅技师账号
    ↓
bookings (订单关联)
    ↓
reviews (评价关联)
```

---

## ⚠️ 注意事项 / Important Notes

1. **用户和技师使用相同的登录入口**
2. **技师也是用户**，可以预约其他技师的服务
3. **技师需要审核**，确保服务质量
4. **服务类别可以多选**，增加接单机会
5. **时薪由技师自行设定**，市场化定价

---

需要帮助？
📧 Email: hello@shefixes.com
