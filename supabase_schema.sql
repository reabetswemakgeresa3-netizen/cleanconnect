-- ============================================================
-- CleanConnect Database Schema
-- Run this in: Supabase → SQL Editor → New Query
-- ============================================================

-- 1. PROFILES TABLE
-- Stores extra user info beyond what Supabase auth provides
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);


-- 2. BOOKINGS TABLE
CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY DEFAULT 'CC-' || upper(substr(gen_random_uuid()::text, 1, 8)),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Service details
  service_id TEXT NOT NULL,
  service_name TEXT NOT NULL,
  sqm INTEGER NOT NULL CHECK (sqm > 0),

  -- Location
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  province TEXT NOT NULL,
  special_instructions TEXT,

  -- Scheduling
  booking_date DATE NOT NULL,
  time_slot TEXT NOT NULL,

  -- Contact
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,

  -- Financials
  amount INTEGER NOT NULL CHECK (amount >= 0),
  payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
  payment_reference TEXT,

  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in-progress', 'completed', 'cancelled')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Users can only see their own bookings
CREATE POLICY "Users can view own bookings"
  ON bookings FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create bookings"
  ON bookings FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can cancel their own pending bookings
CREATE POLICY "Users can update own pending bookings"
  ON bookings FOR UPDATE USING (
    auth.uid() = user_id AND status = 'pending'
  );


-- 3. AUTO-UPDATE TIMESTAMPS
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- 4. AUTO-CREATE PROFILE ON SIGNUP
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email,
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- 5. USEFUL INDEXES
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_date ON bookings(booking_date);


-- ============================================================
-- V2 ADDITIONS — run these if upgrading from v1
-- ============================================================

-- Add cleaner assignment to bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cleaner_assigned TEXT;

-- Cleaners table
CREATE TABLE IF NOT EXISTS cleaners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  avatar_emoji TEXT DEFAULT '🧹',
  location TEXT,
  province TEXT,
  specialties TEXT[] DEFAULT '{}',
  rating DECIMAL(3,2) DEFAULT 5.0,
  total_jobs INTEGER DEFAULT 0,
  bio TEXT,
  verified BOOLEAN DEFAULT false,
  available BOOLEAN DEFAULT true,
  languages TEXT[] DEFAULT '{English}',
  response_time TEXT DEFAULT '< 2 hours',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE cleaners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cleaners are publicly viewable" ON cleaners FOR SELECT USING (true);
