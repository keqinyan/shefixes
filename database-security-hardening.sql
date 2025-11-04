-- 安全加固脚本：防止批量注册和恶意攻击
-- 在 Supabase SQL Editor 中运行

-- ============================================================
-- 1. 添加速率限制表（记录用户操作频率）
-- ============================================================

CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- IP地址或用户ID
  action_type TEXT NOT NULL, -- 'register', 'login', 'booking', 'report'
  action_count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  blocked_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier, action_type);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);

-- ============================================================
-- 2. 添加黑名单表（封禁恶意用户/IP）
-- ============================================================

CREATE TABLE IF NOT EXISTS blacklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT UNIQUE NOT NULL, -- IP地址、邮箱或用户ID
  identifier_type TEXT NOT NULL CHECK (identifier_type IN ('ip', 'email', 'user_id')),
  reason TEXT NOT NULL,
  blocked_by UUID REFERENCES users(id), -- 哪个管理员封禁的
  blocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE, -- NULL = 永久封禁
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_blacklist_identifier ON blacklist(identifier, is_active);

-- ============================================================
-- 3. 添加安全日志表（记录可疑操作）
-- ============================================================

CREATE TABLE IF NOT EXISTS security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  status TEXT, -- 'success', 'failed', 'blocked', 'suspicious'
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_logs_user ON security_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_ip ON security_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_security_logs_status ON security_logs(status);
CREATE INDEX IF NOT EXISTS idx_security_logs_created ON security_logs(created_at);

-- ============================================================
-- 4. 添加邮箱验证表
-- ============================================================

CREATE TABLE IF NOT EXISTS email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  verification_code TEXT NOT NULL,
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_verifications_user ON email_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verifications_code ON email_verifications(verification_code);

-- ============================================================
-- 5. 给 users 表添加安全字段
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_failed_login TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_ip TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS registration_ip TEXT;

-- ============================================================
-- 6. 创建安全检查函数
-- ============================================================

-- 函数：检查IP是否被封禁
CREATE OR REPLACE FUNCTION is_ip_blacklisted(p_ip TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM blacklist
    WHERE identifier = p_ip
      AND identifier_type = 'ip'
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql;

-- 函数：检查邮箱是否被封禁
CREATE OR REPLACE FUNCTION is_email_blacklisted(p_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM blacklist
    WHERE identifier = p_email
      AND identifier_type = 'email'
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql;

-- 函数：记录安全日志
CREATE OR REPLACE FUNCTION log_security_event(
  p_user_id UUID,
  p_action TEXT,
  p_ip_address TEXT,
  p_status TEXT,
  p_details JSONB DEFAULT '{}'
)
RETURNS void AS $$
BEGIN
  INSERT INTO security_logs (user_id, action, ip_address, status, details)
  VALUES (p_user_id, p_action, p_ip_address, p_status, p_details);
END;
$$ LANGUAGE plpgsql;

-- 函数：检查速率限制（每小时最多N次操作）
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier TEXT,
  p_action_type TEXT,
  p_max_attempts INTEGER,
  p_window_minutes INTEGER DEFAULT 60
)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
  v_window_start TIMESTAMP;
BEGIN
  v_window_start := NOW() - (p_window_minutes || ' minutes')::INTERVAL;

  -- 计算时间窗口内的操作次数
  SELECT COUNT(*) INTO v_count
  FROM rate_limits
  WHERE identifier = p_identifier
    AND action_type = p_action_type
    AND window_start > v_window_start;

  -- 如果超过限制，返回 false
  IF v_count >= p_max_attempts THEN
    RETURN false;
  END IF;

  -- 记录本次操作
  INSERT INTO rate_limits (identifier, action_type)
  VALUES (p_identifier, p_action_type);

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 7. 设置 RLS 策略
-- ============================================================

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE blacklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;

-- 只有管理员可以查看速率限制
CREATE POLICY "Only admins can view rate limits" ON rate_limits
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
  );

-- 只有管理员可以管理黑名单
CREATE POLICY "Only admins can view blacklist" ON blacklist
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
  );

CREATE POLICY "Only admins can manage blacklist" ON blacklist
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
  );

-- 只有管理员可以查看安全日志
CREATE POLICY "Only admins can view security logs" ON security_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
  );

-- 用户可以查看自己的邮箱验证
CREATE POLICY "Users can view own email verifications" ON email_verifications
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- 8. 定期清理旧数据（性能优化）
-- ============================================================

-- 清理30天前的速率限制记录
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limits
  WHERE window_start < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- 清理90天前的安全日志
CREATE OR REPLACE FUNCTION cleanup_old_security_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM security_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 9. 注释说明
-- ============================================================

COMMENT ON TABLE rate_limits IS '速率限制表 - 防止暴力攻击';
COMMENT ON TABLE blacklist IS '黑名单表 - 封禁恶意用户/IP';
COMMENT ON TABLE security_logs IS '安全日志表 - 记录可疑操作';
COMMENT ON TABLE email_verifications IS '邮箱验证表';

COMMENT ON FUNCTION is_ip_blacklisted IS '检查IP是否被封禁';
COMMENT ON FUNCTION is_email_blacklisted IS '检查邮箱是否被封禁';
COMMENT ON FUNCTION check_rate_limit IS '检查速率限制（防止暴力攻击）';
COMMENT ON FUNCTION log_security_event IS '记录安全事件到日志';
