-- SheFixes 数据库迁移：信用分系统、双向评价、举报机制
-- 运行此 SQL 在 Supabase SQL Editor 中

-- ============================================================
-- 第一部分：添加 status 字段到现有表
-- ============================================================

-- 1. 给 users 表添加 status 字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'suspended', 'banned'));

-- 2. 给 technicians 表添加 status 字段和其他必要字段
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended', 'banned'));
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS service_area TEXT[];
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS service_categories TEXT[];
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10,2);
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS client_preference TEXT DEFAULT 'women-only';
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'female';
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS jobs_completed INTEGER DEFAULT 0;
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS region TEXT DEFAULT 'us';
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS tools TEXT;

-- 3. 给 users 表添加管理员标识
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- ============================================================
-- 第二部分：创建信用分系统表
-- ============================================================

-- 4. 用户信用分表
CREATE TABLE IF NOT EXISTS user_reputation (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  credit_score INTEGER DEFAULT 100 CHECK (credit_score >= 0 AND credit_score <= 100),
  total_bookings INTEGER DEFAULT 0,
  completed_bookings INTEGER DEFAULT 0,
  cancelled_bookings INTEGER DEFAULT 0,
  no_show_count INTEGER DEFAULT 0,
  reported_count INTEGER DEFAULT 0,
  positive_reviews INTEGER DEFAULT 0,
  negative_reviews INTEGER DEFAULT 0,
  last_booking_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 技师信用分表
CREATE TABLE IF NOT EXISTS technician_reputation (
  technician_id UUID PRIMARY KEY REFERENCES technicians(id) ON DELETE CASCADE,
  credit_score INTEGER DEFAULT 100 CHECK (credit_score >= 0 AND credit_score <= 100),
  total_jobs INTEGER DEFAULT 0,
  completed_jobs INTEGER DEFAULT 0,
  cancelled_jobs INTEGER DEFAULT 0,
  no_show_count INTEGER DEFAULT 0,
  reported_count INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 5.00,
  response_time_avg INTEGER DEFAULT 0, -- 平均响应时间（分钟）
  on_time_rate DECIMAL(5,2) DEFAULT 100.00, -- 准时率
  last_job_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 第三部分：创建双向评价系统表
-- ============================================================

-- 6. 双向评价表（替换原有的 reviews 表）
CREATE TABLE IF NOT EXISTS mutual_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE UNIQUE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  technician_id UUID REFERENCES technicians(id) ON DELETE CASCADE,

  -- 用户评价技师
  user_to_tech_rating INTEGER CHECK (user_to_tech_rating >= 1 AND user_to_tech_rating <= 5),
  user_to_tech_comment TEXT,
  user_to_tech_tags TEXT[], -- 例如：['专业', '准时', '友好'] 或 ['迟到', '态度差']
  user_to_tech_submitted_at TIMESTAMP WITH TIME ZONE,

  -- 技师评价用户
  tech_to_user_rating INTEGER CHECK (tech_to_user_rating >= 1 AND tech_to_user_rating <= 5),
  tech_to_user_comment TEXT,
  tech_to_user_tags TEXT[], -- 例如：['友好', '配合'] 或 ['爽约', '骚扰']
  tech_to_user_submitted_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 第四部分：创建举报系统表
-- ============================================================

-- 7. 举报记录表
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  reporter_id UUID NOT NULL, -- 举报人ID（可以是用户或技师）
  reporter_type TEXT NOT NULL CHECK (reporter_type IN ('user', 'technician')),
  reported_id UUID NOT NULL, -- 被举报人ID
  reported_type TEXT NOT NULL CHECK (reported_type IN ('user', 'technician')),

  report_category TEXT NOT NULL, -- 举报类别
  -- 用户举报技师：'poor_service', 'overcharge', 'rude', 'harassment', 'no_show', 'other'
  -- 技师举报用户：'no_show', 'harassment', 'malicious_review', 'non_payment', 'other'

  report_reason TEXT NOT NULL, -- 详细原因
  evidence_urls TEXT[], -- 证据图片/截图URL

  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),
  admin_notes TEXT, -- 管理员备注
  action_taken TEXT, -- 采取的行动（扣分、警告、封禁等）
  reviewed_by UUID REFERENCES users(id), -- 审核管理员
  reviewed_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 第五部分：创建信用分变动日志表（用于追踪）
-- ============================================================

-- 8. 信用分变动历史表
CREATE TABLE IF NOT EXISTS reputation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID, -- 如果是用户
  technician_id UUID, -- 如果是技师
  user_type TEXT NOT NULL CHECK (user_type IN ('user', 'technician')),

  change_amount INTEGER NOT NULL, -- 变动分数（正数为加分，负数为扣分）
  previous_score INTEGER NOT NULL,
  new_score INTEGER NOT NULL,

  reason TEXT NOT NULL, -- 原因
  -- 例如：'completed_booking', 'received_5_star', 'no_show', 'reported', 等

  related_booking_id UUID REFERENCES bookings(id),
  related_review_id UUID REFERENCES mutual_reviews(id),
  related_report_id UUID REFERENCES reports(id),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 第六部分：创建索引提高查询性能
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_user_reputation_score ON user_reputation(credit_score);
CREATE INDEX IF NOT EXISTS idx_technician_reputation_score ON technician_reputation(credit_score);
CREATE INDEX IF NOT EXISTS idx_mutual_reviews_booking ON mutual_reviews(booking_id);
CREATE INDEX IF NOT EXISTS idx_mutual_reviews_user ON mutual_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_mutual_reviews_tech ON mutual_reviews(technician_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id, reporter_type);
CREATE INDEX IF NOT EXISTS idx_reports_reported ON reports(reported_id, reported_type);
CREATE INDEX IF NOT EXISTS idx_reputation_history_user ON reputation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_reputation_history_tech ON reputation_history(technician_id);

-- ============================================================
-- 第七部分：设置 RLS (Row Level Security) 策略
-- ============================================================

ALTER TABLE user_reputation ENABLE ROW LEVEL SECURITY;
ALTER TABLE technician_reputation ENABLE ROW LEVEL SECURITY;
ALTER TABLE mutual_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE reputation_history ENABLE ROW LEVEL SECURITY;

-- 用户信用分策略
CREATE POLICY "Users can view their own reputation" ON user_reputation
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can update reputation" ON user_reputation
  FOR ALL USING (true);

-- 技师信用分策略（公开可见）
CREATE POLICY "Anyone can view technician reputation" ON technician_reputation
  FOR SELECT USING (true);

-- 双向评价策略
CREATE POLICY "Users can view reviews for their bookings" ON mutual_reviews
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM technicians WHERE technicians.user_id = auth.uid() AND technicians.id = mutual_reviews.technician_id)
  );

CREATE POLICY "Users can create reviews" ON mutual_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their reviews" ON mutual_reviews
  FOR UPDATE USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM technicians WHERE technicians.user_id = auth.uid() AND technicians.id = mutual_reviews.technician_id)
  );

-- 举报策略
CREATE POLICY "Users can view their own reports" ON reports
  FOR SELECT USING (
    reporter_id = auth.uid() OR
    reported_id = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
  );

CREATE POLICY "Users can create reports" ON reports
  FOR INSERT WITH CHECK (reporter_id = auth.uid());

-- 管理员可以更新举报
CREATE POLICY "Admins can update reports" ON reports
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
  );

-- 信用分历史策略
CREATE POLICY "Users can view their own reputation history" ON reputation_history
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM technicians WHERE technicians.user_id = auth.uid() AND technicians.id = reputation_history.technician_id)
  );

-- ============================================================
-- 第八部分：创建触发器和函数
-- ============================================================

-- 触发器：用户注册时自动创建信用分记录
CREATE OR REPLACE FUNCTION create_user_reputation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_reputation (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_user_created ON users;
CREATE TRIGGER on_user_created
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_reputation();

-- 触发器：技师注册时自动创建信用分记录
CREATE OR REPLACE FUNCTION create_technician_reputation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO technician_reputation (technician_id)
  VALUES (NEW.id)
  ON CONFLICT (technician_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_technician_created ON technicians;
CREATE TRIGGER on_technician_created
  AFTER INSERT ON technicians
  FOR EACH ROW
  EXECUTE FUNCTION create_technician_reputation();

-- 触发器：更新 mutual_reviews 的 updated_at
DROP TRIGGER IF EXISTS update_mutual_reviews_updated_at ON mutual_reviews;
CREATE TRIGGER update_mutual_reviews_updated_at
  BEFORE UPDATE ON mutual_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 触发器：更新 user_reputation 的 updated_at
DROP TRIGGER IF EXISTS update_user_reputation_updated_at ON user_reputation;
CREATE TRIGGER update_user_reputation_updated_at
  BEFORE UPDATE ON user_reputation
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 触发器：更新 technician_reputation 的 updated_at
DROP TRIGGER IF EXISTS update_technician_reputation_updated_at ON technician_reputation;
CREATE TRIGGER update_technician_reputation_updated_at
  BEFORE UPDATE ON technician_reputation
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 第九部分：创建计算信用分的函数
-- ============================================================

-- 函数：计算用户信用分
CREATE OR REPLACE FUNCTION calculate_user_credit_score(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_score INTEGER := 100;
  v_rep RECORD;
BEGIN
  SELECT * INTO v_rep FROM user_reputation WHERE user_id = p_user_id;

  IF v_rep IS NULL THEN
    RETURN 100;
  END IF;

  -- 基础分 100
  v_score := 100;

  -- 完成预约加分：每次 +2 分（最多 +20）
  v_score := v_score + LEAST(v_rep.completed_bookings * 2, 20);

  -- 好评加分：每个 +3 分（最多 +30）
  v_score := v_score + LEAST(v_rep.positive_reviews * 3, 30);

  -- 取消预约扣分：每次 -3 分
  v_score := v_score - (v_rep.cancelled_bookings * 3);

  -- 爽约扣分：每次 -10 分
  v_score := v_score - (v_rep.no_show_count * 10);

  -- 差评扣分：每个 -5 分
  v_score := v_score - (v_rep.negative_reviews * 5);

  -- 被举报扣分：每次 -15 分
  v_score := v_score - (v_rep.reported_count * 15);

  -- 限制在 0-100 范围内
  v_score := GREATEST(0, LEAST(100, v_score));

  RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- 函数：计算技师信用分
CREATE OR REPLACE FUNCTION calculate_technician_credit_score(p_technician_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_score INTEGER := 100;
  v_rep RECORD;
BEGIN
  SELECT * INTO v_rep FROM technician_reputation WHERE technician_id = p_technician_id;

  IF v_rep IS NULL THEN
    RETURN 100;
  END IF;

  -- 基础分 100
  v_score := 100;

  -- 完成工作加分：每次 +2 分（最多 +20）
  v_score := v_score + LEAST(v_rep.completed_jobs * 2, 20);

  -- 高评分加分：平均分 >= 4.5，+10 分
  IF v_rep.average_rating >= 4.5 THEN
    v_score := v_score + 10;
  END IF;

  -- 准时率加分：>= 95%，+5 分
  IF v_rep.on_time_rate >= 95 THEN
    v_score := v_score + 5;
  END IF;

  -- 取消工作扣分：每次 -3 分
  v_score := v_score - (v_rep.cancelled_jobs * 3);

  -- 爽约扣分：每次 -10 分
  v_score := v_score - (v_rep.no_show_count * 10);

  -- 被举报扣分：每次 -15 分
  v_score := v_score - (v_rep.reported_count * 15);

  -- 限制在 0-100 范围内
  v_score := GREATEST(0, LEAST(100, v_score));

  RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 第十部分：添加管理员账号（示例）
-- ============================================================

-- 注意：请在 Supabase Auth 中创建管理员账号后，
-- 使用该账号的 UUID 更新以下 SQL
-- 示例：UPDATE users SET is_admin = true WHERE email = 'admin@shefixes.com';

COMMENT ON TABLE user_reputation IS '用户信用分表';
COMMENT ON TABLE technician_reputation IS '技师信用分表';
COMMENT ON TABLE mutual_reviews IS '双向评价表';
COMMENT ON TABLE reports IS '举报记录表';
COMMENT ON TABLE reputation_history IS '信用分变动历史表';
