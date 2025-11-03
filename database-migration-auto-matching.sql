-- SheFixes Database Migration - Auto Matching System
-- This migration adds support for technician service areas and availability management

-- 1. First, ensure all necessary fields exist in technicians table
ALTER TABLE technicians
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS service_area TEXT[], -- Original service area field
ADD COLUMN IF NOT EXISTS service_cities TEXT[], -- Array of cities they serve (more specific)
ADD COLUMN IF NOT EXISTS service_categories TEXT[], -- Alias for specialties
ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS client_preference TEXT DEFAULT 'women-only',
ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'female',
ADD COLUMN IF NOT EXISTS tools TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS jobs_completed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS region TEXT DEFAULT 'us',
ADD COLUMN IF NOT EXISTS service_radius_km INTEGER DEFAULT 50, -- Service radius in kilometers
ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7), -- For distance calculation
ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7); -- For distance calculation

-- 2. Create technician_availability table for managing available time slots
CREATE TABLE IF NOT EXISTS technician_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id UUID REFERENCES technicians(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time_slot TIME NOT NULL, -- Start time of the slot (e.g., 09:00, 10:00, etc.)
  duration_minutes INTEGER DEFAULT 60, -- Duration of each slot
  is_available BOOLEAN DEFAULT true,
  is_booked BOOLEAN DEFAULT false,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(technician_id, date, time_slot)
);

-- 3. Enable RLS on technician_availability
ALTER TABLE technician_availability ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for technician_availability
-- Anyone can view available slots (for booking purposes)
CREATE POLICY "Anyone can view availability" ON technician_availability
  FOR SELECT USING (true);

-- Only system can insert/update availability (technicians will need admin access or special function)
-- For now, we'll create a permissive policy and handle access in the application layer
CREATE POLICY "Technicians can manage their availability" ON technician_availability
  FOR ALL USING (true);

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_technician_availability_technician_id ON technician_availability(technician_id);
CREATE INDEX IF NOT EXISTS idx_technician_availability_date ON technician_availability(date);
CREATE INDEX IF NOT EXISTS idx_technician_availability_is_available ON technician_availability(is_available, is_booked);
CREATE INDEX IF NOT EXISTS idx_technicians_service_cities ON technicians USING GIN(service_cities);
CREATE INDEX IF NOT EXISTS idx_technicians_specialties ON technicians USING GIN(specialties);

-- 6. Create trigger for updated_at on technician_availability
CREATE TRIGGER update_technician_availability_updated_at BEFORE UPDATE ON technician_availability
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Update existing sample technicians with service areas (if they exist)
UPDATE technicians SET
  service_cities = ARRAY['San Francisco', 'Oakland', 'Berkeley', 'San Jose'],
  service_radius_km = 50,
  latitude = 37.7749,
  longitude = -122.4194
WHERE email = 'sarah@shefixes.com' AND EXISTS (SELECT 1 FROM technicians WHERE email = 'sarah@shefixes.com');

UPDATE technicians SET
  service_cities = ARRAY['Los Angeles', 'Santa Monica', 'Pasadena', 'Long Beach'],
  service_radius_km = 60,
  latitude = 34.0522,
  longitude = -118.2437
WHERE email = 'maria@shefixes.com' AND EXISTS (SELECT 1 FROM technicians WHERE email = 'maria@shefixes.com');

UPDATE technicians SET
  service_cities = ARRAY['New York', 'Brooklyn', 'Queens', 'Manhattan'],
  service_radius_km = 40,
  latitude = 40.7128,
  longitude = -74.0060
WHERE email = 'emily@shefixes.com' AND EXISTS (SELECT 1 FROM technicians WHERE email = 'emily@shefixes.com');

UPDATE technicians SET
  service_cities = ARRAY['Chicago', 'Evanston', 'Oak Park', 'Naperville'],
  service_radius_km = 55,
  latitude = 41.8781,
  longitude = -87.6298
WHERE email = 'jessica@shefixes.com' AND EXISTS (SELECT 1 FROM technicians WHERE email = 'jessica@shefixes.com');

UPDATE technicians SET
  service_cities = ARRAY['Seattle', 'Bellevue', 'Tacoma', 'Redmond'],
  service_radius_km = 45,
  latitude = 47.6062,
  longitude = -122.3321
WHERE email = 'lisa@shefixes.com' AND EXISTS (SELECT 1 FROM technicians WHERE email = 'lisa@shefixes.com');

-- 8. Helper function to generate availability slots for a technician
CREATE OR REPLACE FUNCTION generate_availability_slots(
  p_technician_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_start_time TIME DEFAULT '09:00',
  p_end_time TIME DEFAULT '17:00',
  p_slot_duration_minutes INTEGER DEFAULT 60
)
RETURNS INTEGER AS $$
DECLARE
  current_date DATE;
  current_time TIME;
  slots_created INTEGER := 0;
BEGIN
  current_date := p_start_date;

  -- Loop through each date
  WHILE current_date <= p_end_date LOOP
    -- Skip weekends (optional - comment out if technicians work weekends)
    IF EXTRACT(DOW FROM current_date) NOT IN (0, 6) THEN
      current_time := p_start_time;

      -- Loop through time slots for this date
      WHILE current_time < p_end_time LOOP
        -- Insert availability slot if it doesn't exist
        INSERT INTO technician_availability (technician_id, date, time_slot, duration_minutes, is_available, is_booked)
        VALUES (p_technician_id, current_date, current_time, p_slot_duration_minutes, true, false)
        ON CONFLICT (technician_id, date, time_slot) DO NOTHING;

        slots_created := slots_created + 1;
        current_time := current_time + (p_slot_duration_minutes || ' minutes')::INTERVAL;
      END LOOP;
    END IF;

    current_date := current_date + 1;
  END LOOP;

  RETURN slots_created;
END;
$$ LANGUAGE plpgsql;

-- 9. Generate initial availability for next 3 months for sample technicians
DO $$
DECLARE
  tech RECORD;
  start_date DATE := CURRENT_DATE;
  end_date DATE := CURRENT_DATE + INTERVAL '3 months';
BEGIN
  FOR tech IN SELECT id FROM technicians WHERE verified = true LOOP
    PERFORM generate_availability_slots(
      tech.id,
      start_date,
      end_date,
      '09:00'::TIME,
      '17:00'::TIME,
      60
    );
  END LOOP;
END $$;

-- 10. Function to find matching technicians based on location and service type
CREATE OR REPLACE FUNCTION find_matching_technicians(
  p_service_type TEXT,
  p_city TEXT,
  p_preferred_date DATE DEFAULT NULL
)
RETURNS TABLE (
  technician_id UUID,
  name TEXT,
  email TEXT,
  phone TEXT,
  service_categories TEXT[],
  specialties TEXT[],
  rating NUMERIC,
  photo_url TEXT,
  bio TEXT,
  city TEXT,
  service_cities TEXT[],
  service_area TEXT[],
  hourly_rate NUMERIC,
  selfie_verified BOOLEAN,
  distance_match BOOLEAN,
  available_slots_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.name,
    t.email,
    t.phone,
    t.service_categories,
    t.specialties,
    t.rating,
    t.photo_url,
    t.bio,
    t.city,
    t.service_cities,
    t.service_area,
    t.hourly_rate,
    t.selfie_verified,
    (p_city = ANY(COALESCE(t.service_cities, ARRAY[]::TEXT[]))
     OR p_city = ANY(COALESCE(t.service_area, ARRAY[]::TEXT[]))
     OR t.city = p_city) AS distance_match,
    COALESCE(
      (SELECT COUNT(*)
       FROM technician_availability ta
       WHERE ta.technician_id = t.id
         AND ta.is_available = true
         AND ta.is_booked = false
         AND (p_preferred_date IS NULL OR ta.date = p_preferred_date)
      ), 0
    ) AS available_slots_count
  FROM technicians t
  WHERE
    (t.verified = true OR t.status = 'approved')
    AND (
      -- Match by service categories or specialties
      p_service_type = ANY(COALESCE(t.service_categories, ARRAY[]::TEXT[]))
      OR p_service_type = ANY(COALESCE(t.specialties, ARRAY[]::TEXT[]))
      OR 'other' = ANY(COALESCE(t.service_categories, ARRAY[]::TEXT[]))
      OR 'other' = ANY(COALESCE(t.specialties, ARRAY[]::TEXT[]))
    )
    AND (
      -- Match by location
      p_city = ANY(COALESCE(t.service_cities, ARRAY[]::TEXT[]))
      OR p_city = ANY(COALESCE(t.service_area, ARRAY[]::TEXT[]))
      OR t.city = p_city
    )
  ORDER BY
    t.rating DESC,
    available_slots_count DESC;
END;
$$ LANGUAGE plpgsql;

-- 11. Function to get available time slots for a specific technician on a specific date
CREATE OR REPLACE FUNCTION get_available_slots(
  p_technician_id UUID,
  p_date DATE
)
RETURNS TABLE (
  slot_id UUID,
  time_slot TIME,
  duration_minutes INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    id,
    time_slot,
    duration_minutes
  FROM technician_availability
  WHERE
    technician_id = p_technician_id
    AND date = p_date
    AND is_available = true
    AND is_booked = false
  ORDER BY time_slot;
END;
$$ LANGUAGE plpgsql;

-- 12. Add comment explaining the migration
COMMENT ON TABLE technician_availability IS 'Stores available time slots for each technician. Technicians can update their availability monthly.';
COMMENT ON FUNCTION find_matching_technicians IS 'Finds technicians matching service type and location, ordered by rating and availability';
COMMENT ON FUNCTION generate_availability_slots IS 'Helper function to bulk generate availability slots for a technician';
COMMENT ON FUNCTION get_available_slots IS 'Gets all available time slots for a technician on a specific date';
