-- 补丁脚本：创建缺失的 update_updated_at_column() 函数
-- 先运行这个，然后再运行 database-migration-safe-version.sql

-- 创建 update_updated_at_column 函数（如果不存在）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 验证函数是否创建成功
SELECT 'Function created successfully!' as status;
