-- SheFixes 数据库迁移：安全版本（无 DROP 语句）
-- 运行此 SQL 在 Supabase SQL Editor 中

-- ============================================================
-- 第一部分：添加字段到现有表
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'suspended', 'banned'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

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

-- ============================================================
-- 第二部分：创建新表
-- ============================================================

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

CREATE TABLE IF NOT EXISTS technician_reputation (
  technician_id UUID PRIMARY KEY REFERENCES technicians(id) ON DELETE CASCADE,
  credit_score INTEGER DEFAULT 100 CHECK (credit_score >= 0 AND credit_score <= 100),
  total_jobs INTEGER DEFAULT 0,
  completed_jobs INTEGER DEFAULT 0,
  cancelled_jobs INTEGER DEFAULT 0,
  no_show_count INTEGER DEFAULT 0,
  reported_count INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 5.00,
  response_time_avg INTEGER DEFAULT 0,
  on_time_rate DECIMAL(5,2) DEFAULT 100.00,
  last_job_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mutual_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE UNIQUE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  technician_id UUID REFERENCES technicians(id) ON DELETE CASCADE,
  user_to_tech_rating INTEGER CHECK (user_to_tech_rating >= 1 AND user_to_tech_rating <= 5),
  user_to_tech_comment TEXT,
  user_to_tech_tags TEXT[],
  user_to_tech_submitted_at TIMESTAMP WITH TIME ZONE,
  tech_to_user_rating INTEGER CHECK (tech_to_user_rating >= 1 AND tech_to_user_rating <= 5),
  tech_to_user_comment TEXT,
  tech_to_user_tags TEXT[],
  tech_to_user_submitted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  reporter_id UUID NOT NULL,
  reporter_type TEXT NOT NULL CHECK (reporter_type IN ('user', 'technician')),
  reported_id UUID NOT NULL,
  reported_type TEXT NOT NULL CHECK (reported_type IN ('user', 'technician')),
  report_category TEXT NOT NULL,
  report_reason TEXT NOT NULL,
  evidence_urls TEXT[],
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),
  admin_notes TEXT,
  action_taken TEXT,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reputation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  technician_id UUID,
  user_type TEXT NOT NULL CHECK (user_type IN ('user', 'technician')),
  change_amount INTEGER NOT NULL,
  previous_score INTEGER NOT NULL,
  new_score INTEGER NOT NULL,
  reason TEXT NOT NULL,
  related_booking_id UUID REFERENCES bookings(id),
  related_review_id UUID REFERENCES mutual_reviews(id),
  related_report_id UUID REFERENCES reports(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 第三部分：创建索引
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
-- 第四部分：设置 RLS
-- ============================================================

ALTER TABLE user_reputation ENABLE ROW LEVEL SECURITY;
ALTER TABLE technician_reputation ENABLE ROW LEVEL SECURITY;
ALTER TABLE mutual_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE reputation_history ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 第五部分：创建 RLS 策略
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own reputation' AND tablename = 'user_reputation') THEN
    CREATE POLICY "Users can view their own reputation" ON user_reputation FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'System can update reputation' AND tablename = 'user_reputation') THEN
    CREATE POLICY "System can update reputation" ON user_reputation FOR ALL USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view technician reputation' AND tablename = 'technician_reputation') THEN
    CREATE POLICY "Anyone can view technician reputation" ON technician_reputation FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view reviews for their bookings' AND tablename = 'mutual_reviews') THEN
    CREATE POLICY "Users can view reviews for their bookings" ON mutual_reviews
      FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (SELECT 1 FROM technicians WHERE technicians.user_id = auth.uid() AND technicians.id = mutual_reviews.technician_id)
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can create reviews' AND tablename = 'mutual_reviews') THEN
    CREATE POLICY "Users can create reviews" ON mutual_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their reviews' AND tablename = 'mutual_reviews') THEN
    CREATE POLICY "Users can update their reviews" ON mutual_reviews
      FOR UPDATE USING (
        auth.uid() = user_id OR
        EXISTS (SELECT 1 FROM technicians WHERE technicians.user_id = auth.uid() AND technicians.id = mutual_reviews.technician_id)
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own reports' AND tablename = 'reports') THEN
    CREATE POLICY "Users can view their own reports" ON reports
      FOR SELECT USING (
        reporter_id = auth.uid() OR
        reported_id = auth.uid() OR
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can create reports' AND tablename = 'reports') THEN
    CREATE POLICY "Users can create reports" ON reports FOR INSERT WITH CHECK (reporter_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update reports' AND tablename = 'reports') THEN
    CREATE POLICY "Admins can update reports" ON reports
      FOR UPDATE USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own reputation history' AND tablename = 'reputation_history') THEN
    CREATE POLICY "Users can view their own reputation history" ON reputation_history
      FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM technicians WHERE technicians.user_id = auth.uid() AND technicians.id = reputation_history.technician_id)
      );
  END IF;
END $$;

-- ============================================================
-- 第六部分：创建函数
-- ============================================================

CREATE OR REPLACE FUNCTION create_user_reputation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_reputation (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_technician_reputation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO technician_reputation (technician_id)
  VALUES (NEW.id)
  ON CONFLICT (technician_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
  v_score := 100;
  v_score := v_score + LEAST(v_rep.completed_bookings * 2, 20);
  v_score := v_score + LEAST(v_rep.positive_reviews * 3, 30);
  v_score := v_score - (v_rep.cancelled_bookings * 3);
  v_score := v_score - (v_rep.no_show_count * 10);
  v_score := v_score - (v_rep.negative_reviews * 5);
  v_score := v_score - (v_rep.reported_count * 15);
  v_score := GREATEST(0, LEAST(100, v_score));
  RETURN v_score;
END;
$$ LANGUAGE plpgsql;

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
  v_score := 100;
  v_score := v_score + LEAST(v_rep.completed_jobs * 2, 20);
  IF v_rep.average_rating >= 4.5 THEN
    v_score := v_score + 10;
  END IF;
  IF v_rep.on_time_rate >= 95 THEN
    v_score := v_score + 5;
  END IF;
  v_score := v_score - (v_rep.cancelled_jobs * 3);
  v_score := v_score - (v_rep.no_show_count * 10);
  v_score := v_score - (v_rep.reported_count * 15);
  v_score := GREATEST(0, LEAST(100, v_score));
  RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 第七部分：创建触发器（仅当不存在时）
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_user_created') THEN
    CREATE TRIGGER on_user_created
      AFTER INSERT ON users
      FOR EACH ROW
      EXECUTE FUNCTION create_user_reputation();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_technician_created') THEN
    CREATE TRIGGER on_technician_created
      AFTER INSERT ON technicians
      FOR EACH ROW
      EXECUTE FUNCTION create_technician_reputation();
  END IF;
END $$;

COMMENT ON TABLE user_reputation IS '用户信用分表';
COMMENT ON TABLE technician_reputation IS '技师信用分表';
COMMENT ON TABLE mutual_reviews IS '双向评价表';
COMMENT ON TABLE reports IS '举报记录表';
COMMENT ON TABLE reputation_history IS '信用分变动历史表';
