-- 微信小程序版本数据库迁移脚本
-- 从自拍验证升级到微信实名认证

-- ============================================
-- 1. 用户表 (users) 添加微信相关字段
-- ============================================

-- 添加实名认证相关字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS realname_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS realname_verified_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS realname_method TEXT; -- 'wechat', 'wechat_pay', 'third_party'

-- 添加微信相关字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS wechat_nickname TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS wechat_avatar TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS wechat_openid TEXT UNIQUE;

-- 添加其他辅助字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;

-- 为已有的 selfie_verified 用户迁移数据（可选）
-- 如果你想将已有的自拍认证用户标记为实名认证
UPDATE users
SET
  realname_verified = selfie_verified,
  realname_verified_at = selfie_verified_at,
  realname_method = 'selfie_legacy'
WHERE selfie_verified = true AND realname_verified IS NULL;

-- 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_users_wechat_openid ON users(wechat_openid);
CREATE INDEX IF NOT EXISTS idx_users_realname_verified ON users(realname_verified);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login_at);

-- 添加注释
COMMENT ON COLUMN users.realname_verified IS '实名认证状态';
COMMENT ON COLUMN users.realname_verified_at IS '实名认证时间';
COMMENT ON COLUMN users.realname_method IS '实名认证方式: wechat(微信), wechat_pay(微信支付), third_party(第三方), selfie_legacy(原自拍认证)';
COMMENT ON COLUMN users.wechat_nickname IS '微信昵称';
COMMENT ON COLUMN users.wechat_avatar IS '微信头像URL';
COMMENT ON COLUMN users.wechat_openid IS '微信OpenID，唯一标识';
COMMENT ON COLUMN users.last_login_at IS '最后登录时间';

-- ============================================
-- 2. 技师表 (technicians) 添加相关字段
-- ============================================

-- 添加实名认证相关字段
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS realname_verified BOOLEAN DEFAULT false;
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS realname_verified_at TIMESTAMP;
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS realname_method TEXT;

-- 添加微信相关字段
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS wechat_nickname TEXT;
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS wechat_avatar TEXT;
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS wechat_openid TEXT UNIQUE;

-- 添加技师展示相关字段
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2) DEFAULT 5.0;
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS experience INTEGER DEFAULT 0; -- 工作年限
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS bio TEXT; -- 个人简介
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS avatar TEXT; -- 头像URL

-- 为已有的 selfie_verified 技师迁移数据（可选）
UPDATE technicians
SET
  realname_verified = selfie_verified,
  realname_verified_at = selfie_verified_at,
  realname_method = 'selfie_legacy'
WHERE selfie_verified = true AND realname_verified IS NULL;

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_technicians_wechat_openid ON technicians(wechat_openid);
CREATE INDEX IF NOT EXISTS idx_technicians_realname_verified ON technicians(realname_verified);
CREATE INDEX IF NOT EXISTS idx_technicians_rating ON technicians(rating);

-- 添加注释
COMMENT ON COLUMN technicians.realname_verified IS '实名认证状态';
COMMENT ON COLUMN technicians.realname_verified_at IS '实名认证时间';
COMMENT ON COLUMN technicians.realname_method IS '实名认证方式';
COMMENT ON COLUMN technicians.wechat_nickname IS '微信昵称';
COMMENT ON COLUMN technicians.wechat_avatar IS '微信头像URL';
COMMENT ON COLUMN technicians.wechat_openid IS '微信OpenID';
COMMENT ON COLUMN technicians.rating IS '技师评分 (1.0-5.0)';
COMMENT ON COLUMN technicians.experience IS '工作年限（年）';
COMMENT ON COLUMN technicians.bio IS '个人简介';
COMMENT ON COLUMN technicians.avatar IS '头像URL';

-- ============================================
-- 3. 预约表 (bookings) 添加紧急程度字段
-- ============================================

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS urgency TEXT DEFAULT 'normal'; -- 'low', 'normal', 'high'

COMMENT ON COLUMN bookings.urgency IS '紧急程度: low(不急), normal(一般), high(紧急)';

-- ============================================
-- 4. 创建实名认证日志表（可选，用于审计）
-- ============================================

CREATE TABLE IF NOT EXISTS realname_verification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  technician_id UUID REFERENCES technicians(id),
  verification_method TEXT NOT NULL, -- 'wechat', 'wechat_pay', 'third_party'
  verification_data JSONB, -- 认证时的数据（加密存储）
  status TEXT NOT NULL, -- 'pending', 'success', 'failed'
  verified_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_realname_logs_user ON realname_verification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_realname_logs_technician ON realname_verification_logs(technician_id);
CREATE INDEX IF NOT EXISTS idx_realname_logs_status ON realname_verification_logs(status);

COMMENT ON TABLE realname_verification_logs IS '实名认证日志表，用于审计和追踪';

-- ============================================
-- 5. 更新 Row Level Security (RLS) 策略
-- ============================================

-- 允许用户查看自己的实名认证日志
CREATE POLICY IF NOT EXISTS "Users can view own verification logs"
  ON realname_verification_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- 允许技师查看自己的实名认证日志
CREATE POLICY IF NOT EXISTS "Technicians can view own verification logs"
  ON realname_verification_logs
  FOR SELECT
  USING (auth.uid() = technician_id);

-- 启用 RLS
ALTER TABLE realname_verification_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. 创建视图：已认证用户
-- ============================================

CREATE OR REPLACE VIEW verified_users AS
SELECT
  id,
  email,
  name,
  phone,
  city,
  realname_verified,
  realname_verified_at,
  realname_method,
  wechat_nickname,
  wechat_avatar,
  created_at,
  last_login_at
FROM users
WHERE realname_verified = true;

COMMENT ON VIEW verified_users IS '已完成实名认证的用户视图';

-- ============================================
-- 7. 创建视图：已认证技师
-- ============================================

CREATE OR REPLACE VIEW verified_technicians AS
SELECT
  id,
  email,
  name,
  phone,
  city,
  skills,
  realname_verified,
  realname_verified_at,
  realname_method,
  rating,
  experience,
  bio,
  avatar,
  wechat_nickname,
  wechat_avatar,
  status,
  created_at
FROM technicians
WHERE realname_verified = true AND status = 'approved';

COMMENT ON VIEW verified_technicians IS '已完成实名认证且已审核通过的技师视图';

-- ============================================
-- 8. 创建函数：更新实名认证状态
-- ============================================

CREATE OR REPLACE FUNCTION update_realname_verification(
  p_user_id UUID,
  p_is_technician BOOLEAN,
  p_method TEXT,
  p_wechat_data JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_table TEXT;
  v_openid TEXT;
BEGIN
  -- 确定更新的表
  v_table := CASE WHEN p_is_technician THEN 'technicians' ELSE 'users' END;

  -- 提取 openid（如果有）
  IF p_wechat_data IS NOT NULL THEN
    v_openid := p_wechat_data->>'openid';
  END IF;

  -- 更新认证状态
  IF p_is_technician THEN
    UPDATE technicians
    SET
      realname_verified = true,
      realname_verified_at = CURRENT_TIMESTAMP,
      realname_method = p_method,
      wechat_openid = COALESCE(v_openid, wechat_openid),
      wechat_nickname = COALESCE(p_wechat_data->>'nickname', wechat_nickname),
      wechat_avatar = COALESCE(p_wechat_data->>'avatar', wechat_avatar)
    WHERE id = p_user_id;
  ELSE
    UPDATE users
    SET
      realname_verified = true,
      realname_verified_at = CURRENT_TIMESTAMP,
      realname_method = p_method,
      wechat_openid = COALESCE(v_openid, wechat_openid),
      wechat_nickname = COALESCE(p_wechat_data->>'nickname', wechat_nickname),
      wechat_avatar = COALESCE(p_wechat_data->>'avatar', wechat_avatar),
      last_login_at = CURRENT_TIMESTAMP
    WHERE id = p_user_id;
  END IF;

  -- 记录日志
  INSERT INTO realname_verification_logs (
    user_id,
    technician_id,
    verification_method,
    verification_data,
    status,
    verified_at
  ) VALUES (
    CASE WHEN NOT p_is_technician THEN p_user_id ELSE NULL END,
    CASE WHEN p_is_technician THEN p_user_id ELSE NULL END,
    p_method,
    p_wechat_data,
    'success',
    CURRENT_TIMESTAMP
  );

  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    -- 记录失败日志
    INSERT INTO realname_verification_logs (
      user_id,
      technician_id,
      verification_method,
      status,
      error_message
    ) VALUES (
      CASE WHEN NOT p_is_technician THEN p_user_id ELSE NULL END,
      CASE WHEN p_is_technician THEN p_user_id ELSE NULL END,
      p_method,
      'failed',
      SQLERRM
    );
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_realname_verification IS '更新用户或技师的实名认证状态';

-- ============================================
-- 9. 数据完整性检查
-- ============================================

-- 检查是否有重复的 wechat_openid
SELECT
  wechat_openid,
  COUNT(*) as count
FROM users
WHERE wechat_openid IS NOT NULL
GROUP BY wechat_openid
HAVING COUNT(*) > 1;

SELECT
  wechat_openid,
  COUNT(*) as count
FROM technicians
WHERE wechat_openid IS NOT NULL
GROUP BY wechat_openid
HAVING COUNT(*) > 1;

-- ============================================
-- 10. 完成提示
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE '微信小程序数据库迁移完成！';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '已添加的功能：';
  RAISE NOTICE '1. 实名认证字段 (realname_verified)';
  RAISE NOTICE '2. 微信相关字段 (wechat_openid, wechat_nickname, wechat_avatar)';
  RAISE NOTICE '3. 实名认证日志表 (realname_verification_logs)';
  RAISE NOTICE '4. 已认证用户/技师视图';
  RAISE NOTICE '5. 实名认证更新函数';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '请检查数据完整性，然后部署小程序！';
  RAISE NOTICE '==============================================';
END $$;
