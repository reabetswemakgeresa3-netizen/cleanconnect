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


-- ============================================================
-- V3 ADDITIONS — CleanConnect Workers portal
-- ============================================================

-- Link cleaners to auth accounts so they can sign in to the Worker Portal
ALTER TABLE cleaners ADD COLUMN IF NOT EXISTS user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE;

-- Proper cleaner assignment on bookings (cleaner_assigned keeps the display name)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cleaner_id UUID REFERENCES cleaners(id);
CREATE INDEX IF NOT EXISTS idx_bookings_cleaner_id ON bookings(cleaner_id);

-- Cleaners manage their own row
CREATE POLICY "Users can register as cleaner"
  ON cleaners FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Cleaners can update own row"
  ON cleaners FOR UPDATE USING (auth.uid() = user_id);

-- Cleaners can see and update the bookings assigned to them
CREATE POLICY "Cleaners can view assigned bookings"
  ON bookings FOR SELECT USING (
    cleaner_id IN (SELECT id FROM cleaners WHERE user_id = auth.uid())
  );

CREATE POLICY "Cleaners can update assigned bookings"
  ON bookings FOR UPDATE USING (
    cleaner_id IN (SELECT id FROM cleaners WHERE user_id = auth.uid())
  );


-- ============================================================
-- V4 ADDITIONS — Live cleaner location tracking
-- ============================================================

ALTER TABLE cleaners ADD COLUMN IF NOT EXISTS current_lat DOUBLE PRECISION;
ALTER TABLE cleaners ADD COLUMN IF NOT EXISTS current_lng DOUBLE PRECISION;
ALTER TABLE cleaners ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ;

-- Stream cleaner location updates to customers via Supabase Realtime
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE cleaners;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================
-- V5 ADDITIONS — Real pictures (cleaner profile photos)
-- ============================================================

ALTER TABLE cleaners ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Public bucket for cleaner profile photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('cleaner-photos', 'cleaner-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Each cleaner uploads into a folder named after their auth user id
CREATE POLICY "Cleaners upload own photo" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'cleaner-photos' AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Cleaners update own photo" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'cleaner-photos' AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Cleaner photos are public" ON storage.objects
  FOR SELECT USING (bucket_id = 'cleaner-photos');


-- ============================================================
-- V6 ADDITIONS — Profile photos, cancellation policy, contact form
-- ============================================================

-- Avatars bucket for customer/user profile pictures (profiles.avatar_url
-- already existed since V1)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users upload own avatar" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own avatar" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own avatar" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Avatars are publicly viewable" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- Allow a "pending-review" payment status for cancellations made inside the
-- 4-hour refund window (fee may apply, flagged for manual review instead of
-- an automatic refund)
ALTER TABLE bookings DROP CONSTRAINT bookings_payment_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_payment_status_check
  CHECK (payment_status IN ('unpaid', 'paid', 'refunded', 'pending-review'));

-- Contact/support form submissions
CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Anyone (including logged-out visitors) can submit the contact form.
-- Deliberately no SELECT policy: with RLS enabled and no read grant for
-- anon/authenticated, submissions can only be read via the Supabase
-- dashboard/service role — there's no in-app admin-role system to check
-- against, so this is how "only admins can read them" is enforced here.
CREATE POLICY "Anyone can submit a contact message" ON contact_messages
  FOR INSERT WITH CHECK (true);


-- ============================================================
-- V7 ADDITIONS — WhatsApp OTP signup/login (replaces native SMS phone auth)
-- ============================================================

-- Short-lived verification codes for the send-whatsapp-otp /
-- verify-whatsapp-otp Edge Functions. Only ever touched with the service
-- role key (inside those functions), never from the browser.
CREATE TABLE IF NOT EXISTS otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  verified BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_otp_codes_phone ON otp_codes(phone);

ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;
-- Deliberately no policies at all: RLS enabled + zero grants means anon and
-- authenticated roles get NO access whatsoever. Only the service_role key
-- (used inside the Edge Functions) can read/write.

-- Edge Function secrets (set once via the Management API or `supabase secrets
-- set`, not tracked here): TWILIO_SID, TWILIO_TOKEN, TWILIO_WHATSAPP_FROM
-- (shared with the existing send-whatsapp function).


-- ============================================================
-- V8 ADDITIONS — Real admin accounts (replaces the client-side PIN gate)
-- ============================================================

CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- An admin can only ever see their OWN row. This is what makes the
-- `EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())` subquery below
-- work under RLS — the caller is always checking their own membership, so
-- their own row is visible to them. No INSERT/UPDATE policy: admins are only
-- ever added via direct SQL with the service role, never self-service.
CREATE POLICY "Admins can view own admin row"
  ON admin_users FOR SELECT USING (auth.uid() = id);

-- Admin-wide access, layered on top of the existing owner/cleaner policies
-- (RLS policies OR together — nothing above is removed or narrowed).
CREATE POLICY "Admins can view all bookings"
  ON bookings FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

CREATE POLICY "Admins can update all bookings"
  ON bookings FOR UPDATE
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- Supersedes the V6 comment above: contact_messages had no admin-role system
-- to check against at the time, so reads were dashboard/service-role only.
-- Now there is one.
CREATE POLICY "Admins can view contact messages"
  ON contact_messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- Bootstrap the first admin account.
INSERT INTO admin_users (id, full_name)
VALUES ('3c22adb3-71a3-4e26-ba5d-06f0e14d1035', 'Reabetswe Ramusi')
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- V9 ADDITIONS — Cash payment option
-- ============================================================

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'yoco' CHECK (payment_method IN ('yoco','cash'));


-- ============================================================
-- V10 ADDITIONS — Automated Yoco refunds
-- ============================================================

-- Audit trail for every refund attempt (success or failure). Written only
-- by the process-refund Edge Function via the service role.
CREATE TABLE IF NOT EXISTS refund_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  yoco_checkout_id TEXT,
  yoco_refund_id TEXT,
  amount NUMERIC,
  status TEXT NOT NULL CHECK (status IN ('succeeded','failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refund_log_booking_id ON refund_log(booking_id);

ALTER TABLE refund_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view refund log"
  ON refund_log FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- Edge Function secret (set once via `supabase secrets set` or the
-- dashboard, not tracked here): YOCO_SECRET_KEY. Separate from the
-- YOCO_SECRET_KEY Netlify env var used by create-checkout.js — Edge
-- Functions and Netlify Functions each have their own secret store.


-- ============================================================
-- V11 ADDITIONS — Ratings/reviews submission flow
-- ============================================================

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id TEXT NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  cleaner_id UUID NOT NULL REFERENCES cleaners(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_cleaner_id ON reviews(cleaner_id);

ALTER TABLE cleaners ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reviews"
  ON reviews FOR SELECT USING (true);

-- A customer can only review their OWN, COMPLETED booking, and only once
-- (the booking_id UNIQUE constraint above enforces the "once" part). No
-- UPDATE/DELETE policy: reviews are immutable once submitted.
CREATE POLICY "Customers can review their own completed bookings"
  ON reviews FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = reviews.booking_id
        AND bookings.user_id = auth.uid()
        AND bookings.status = 'completed'
    )
  );

-- SECURITY DEFINER because the submitting customer has no write grant on
-- cleaners at all — unlike Phase 1's admin check, the acting principal here
-- is NOT the row owner, so an "own row visible" policy can't apply.
CREATE OR REPLACE FUNCTION recompute_cleaner_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE cleaners SET
    rating = (SELECT ROUND(AVG(rating)::numeric, 2) FROM reviews WHERE cleaner_id = NEW.cleaner_id),
    review_count = (SELECT COUNT(*) FROM reviews WHERE cleaner_id = NEW.cleaner_id)
  WHERE id = NEW.cleaner_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recompute_cleaner_rating ON reviews;
CREATE TRIGGER trg_recompute_cleaner_rating
  AFTER INSERT ON reviews
  FOR EACH ROW EXECUTE FUNCTION recompute_cleaner_rating();


-- ============================================================
-- V12 ADDITIONS — Real notification bell
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  booking_id TEXT REFERENCES bookings(id) ON DELETE CASCADE,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- A user can only ever see/update their own notifications. Deliberately no
-- INSERT policy — only the create_booking_notification trigger below (which
-- runs SECURITY DEFINER, owned by the migration role) ever writes here.
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can mark own notifications read"
  ON notifications FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Stream new notifications to the bell in real time (same pattern as V4's
-- live cleaner-location tracking).
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Fires on every bookings UPDATE and creates the right notification(s) for
-- a status change, a refund, or a job completion — covering every existing
-- status-update call site (Admin, Dashboard cancellation, worker job
-- updates, process-refund) automatically, with no changes needed to any of
-- them. SECURITY DEFINER: the acting principal (admin, cleaner, or the
-- process-refund function) is never the booking's own customer, so this
-- can't be an "own row visible" policy the way Phase 1's admin check was.
CREATE OR REPLACE FUNCTION create_booking_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'completed' THEN
      INSERT INTO notifications (user_id, type, title, body, booking_id)
      VALUES (NEW.user_id, 'completed', 'Your clean is complete!',
        'How did ' || COALESCE(NEW.cleaner_assigned, 'your cleaner') || ' do? Tap to leave a rating.', NEW.id);
    ELSE
      INSERT INTO notifications (user_id, type, title, body, booking_id)
      VALUES (NEW.user_id, 'status_update', 'Booking ' || NEW.status,
        'Your ' || NEW.service_name || ' booking is now ' || NEW.status || '.', NEW.id);
    END IF;
  END IF;

  IF OLD.payment_status IS DISTINCT FROM NEW.payment_status AND NEW.payment_status = 'refunded' THEN
    INSERT INTO notifications (user_id, type, title, body, booking_id)
    VALUES (NEW.user_id, 'refund', 'Refund processed',
      'Your refund for ' || NEW.service_name || ' has been processed.', NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_booking_notification ON bookings;
CREATE TRIGGER trg_booking_notification
  AFTER UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION create_booking_notification();


-- ============================================================
-- V13 ADDITIONS — Broadcast a new booking to every worker (Uber-style)
-- ============================================================

-- job_status runs parallel to the existing "status" lifecycle column and is
-- specific to the broadcast/first-come-first-served acceptance mechanic.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS job_status TEXT NOT NULL DEFAULT 'broadcasting'
  CHECK (job_status IN ('broadcasting','accepted','in-progress','completed','cancelled'));
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS accepted_by UUID REFERENCES cleaners(id);

-- Bookings created with a specific pre-selected cleaner (the "Book {name}"
-- flow from a cleaner's profile) are already spoken for — never broadcast.
UPDATE bookings SET job_status = 'accepted', accepted_by = cleaner_id
  WHERE cleaner_id IS NOT NULL AND job_status = 'broadcasting';
UPDATE bookings SET job_status = 'completed' WHERE status = 'completed' AND job_status = 'broadcasting';
UPDATE bookings SET job_status = 'cancelled' WHERE status = 'cancelled' AND job_status = 'broadcasting';
-- Historical rows that never actually reached a real confirmed state
-- (abandoned/incomplete Yoco checkouts, sitting unpaid from before this
-- feature existed) must never surface as open jobs — only genuinely placed
-- bookings (cash, or Yoco once paid) belong in the broadcast pool.
UPDATE bookings SET job_status = 'cancelled'
  WHERE job_status = 'broadcasting' AND cleaner_id IS NULL
    AND payment_method != 'cash' AND payment_status != 'paid';

CREATE INDEX IF NOT EXISTS idx_bookings_job_status ON bookings(job_status);

-- Any registered cleaner can see jobs that are still up for grabs.
CREATE POLICY "Cleaners can view broadcasting jobs"
  ON bookings FOR SELECT
  USING (job_status = 'broadcasting' AND EXISTS (SELECT 1 FROM cleaners WHERE user_id = auth.uid()));

-- The race-safe accept: matches only currently-broadcasting rows (Postgres
-- re-evaluates this against the committed row for each concurrent UPDATE,
-- so only the first to commit actually changes anything), and WITH CHECK
-- ensures a cleaner can only ever claim a job for THEMSELVES.
CREATE POLICY "Cleaners can accept broadcasting jobs"
  ON bookings FOR UPDATE
  USING (job_status = 'broadcasting')
  WITH CHECK (accepted_by IN (SELECT id FROM cleaners WHERE user_id = auth.uid()));

-- Stream booking changes so every worker's "Available Jobs" list updates
-- live — same pattern as V4 (cleaner location) / V12 (notifications). Note:
-- once a row leaves job_status='broadcasting', it stops matching the SELECT
-- policy above for every OTHER cleaner, so Realtime won't deliver that
-- UPDATE to them (payloads are filtered per-subscriber against RLS). The
-- Worker Portal frontend works around this with an explicit Realtime
-- Broadcast event ("job-taken") sent by the accepting client, independent
-- of table RLS — see WorkerDashboard.jsx.
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- In-app record of which cleaners were broadcast which jobs, and whether
-- they've seen it yet (powers the Worker Portal's notification badge).
CREATE TABLE IF NOT EXISTS worker_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cleaner_id UUID NOT NULL REFERENCES cleaners(id) ON DELETE CASCADE,
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  seen BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_worker_notifications_cleaner_id ON worker_notifications(cleaner_id, sent_at DESC);

ALTER TABLE worker_notifications ENABLE ROW LEVEL SECURITY;

-- Deliberately no INSERT policy — only the notify-workers Edge Function
-- (service role) ever writes here.
CREATE POLICY "Cleaners can view own worker notifications"
  ON worker_notifications FOR SELECT
  USING (cleaner_id IN (SELECT id FROM cleaners WHERE user_id = auth.uid()));

CREATE POLICY "Cleaners can mark own worker notifications seen"
  ON worker_notifications FOR UPDATE
  USING (cleaner_id IN (SELECT id FROM cleaners WHERE user_id = auth.uid()))
  WITH CHECK (cleaner_id IN (SELECT id FROM cleaners WHERE user_id = auth.uid()));

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE worker_notifications;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Edge Function notify-workers: fetches every verified+available cleaner,
-- sends each a WhatsApp alert (reusing TWILIO_SID/TWILIO_TOKEN/
-- TWILIO_WHATSAPP_FROM, already set), and inserts one worker_notifications
-- row per cleaner. Called from Book.jsx (cash path, confirmed synchronously)
-- and BookingSuccess.jsx (Yoco path, once the redirect back confirms
-- payment). Idempotent: no-ops if the booking is no longer broadcasting.
--
-- send-whatsapp also gained a new type: 'job_accepted', sent by the
-- Worker Portal to the customer once a cleaner successfully claims their job.


-- ============================================================
-- V14 ADDITIONS — Admin Operations Centre: live activity log
-- ============================================================

-- Unified, admin-only event feed for the Overview tab's live activity feed,
-- and doubles as a per-booking timeline source for the Bookings tab.
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT,
  booking_id TEXT REFERENCES bookings(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_booking_id ON activity_log(booking_id);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view activity log"
  ON activity_log FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE activity_log;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- SECURITY DEFINER: none of the acting principals (a customer booking,
-- Postgres itself on signup, a cleaner registering) has any write grant on
-- activity_log — same reasoning as V11's rating-recompute trigger.
CREATE OR REPLACE FUNCTION log_booking_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_log (type, title, detail, booking_id)
    VALUES ('new_booking', 'New booking',
      NEW.contact_name || ' booked ' || NEW.service_name || ' · ' || COALESCE(NEW.city, ''), NEW.id);
    RETURN NEW;
  END IF;

  IF OLD.payment_status IS DISTINCT FROM NEW.payment_status AND NEW.payment_status = 'paid' THEN
    INSERT INTO activity_log (type, title, detail, booking_id)
    VALUES ('payment_received', 'Payment received',
      NEW.contact_name || ' paid for ' || NEW.service_name, NEW.id);
  END IF;

  IF OLD.job_status IS DISTINCT FROM NEW.job_status AND NEW.job_status = 'accepted' THEN
    INSERT INTO activity_log (type, title, detail, booking_id)
    VALUES ('job_accepted', 'Job accepted',
      COALESCE(NEW.cleaner_assigned, 'A cleaner') || ' accepted ' || NEW.service_name, NEW.id);
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed' THEN
    INSERT INTO activity_log (type, title, detail, booking_id)
    VALUES ('booking_completed', 'Booking completed',
      NEW.service_name || ' for ' || NEW.contact_name || ' marked complete', NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_booking_activity_insert ON bookings;
CREATE TRIGGER trg_log_booking_activity_insert
  AFTER INSERT ON bookings
  FOR EACH ROW EXECUTE FUNCTION log_booking_activity();

DROP TRIGGER IF EXISTS trg_log_booking_activity_update ON bookings;
CREATE TRIGGER trg_log_booking_activity_update
  AFTER UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION log_booking_activity();

CREATE OR REPLACE FUNCTION log_profile_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO activity_log (type, title, detail)
  VALUES ('new_signup', 'New customer signup', COALESCE(NEW.full_name, NEW.phone, NEW.email, 'A new user'));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_profile_activity ON profiles;
CREATE TRIGGER trg_log_profile_activity
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION log_profile_activity();

CREATE OR REPLACE FUNCTION log_cleaner_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO activity_log (type, title, detail)
  VALUES ('new_cleaner', 'New cleaner registration', NEW.name || ' · ' || COALESCE(NEW.location, ''));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_cleaner_activity ON cleaners;
CREATE TRIGGER trg_log_cleaner_activity
  AFTER INSERT ON cleaners
  FOR EACH ROW EXECUTE FUNCTION log_cleaner_activity();


-- ============================================================
-- V15 ADDITIONS — Admin Operations Centre: workers, messages, notes
-- ============================================================

-- Admins can verify/unverify/deactivate any cleaner, and force-assign a
-- cleaner to a stuck broadcasting job (Job Broadcast Monitor tab).
CREATE POLICY "Admins can update all cleaners"
  ON cleaners FOR UPDATE
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- Contact form submissions get a read/resolved workflow + an internal
-- tracking note, both admin-only to write.
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT false;
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS admin_notes TEXT;

CREATE POLICY "Admins can update contact messages"
  ON contact_messages FOR UPDATE
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- Free-text "known issues" board for the System Health tab — there's no
-- API access to Edge Function invocation logs from a client app, so this is
-- the documented fallback for tracking problems admins notice manually.
CREATE TABLE IF NOT EXISTS admin_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note TEXT NOT NULL,
  created_by UUID REFERENCES admin_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view admin notes"
  ON admin_notes FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

CREATE POLICY "Admins can add admin notes"
  ON admin_notes FOR INSERT
  WITH CHECK (created_by = auth.uid() AND EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

CREATE POLICY "Admins can delete admin notes"
  ON admin_notes FOR DELETE
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- Edge Functions: system-health (admin-only; pings Twilio, reports the
-- process-refund function's Yoco key mode without exposing the key itself).

-- ============================================================
-- V16 ADDITIONS — Worker Portal: post-acceptance active job flow
-- ============================================================

-- job_status gains 'en-route' as an intermediate stage between a cleaner
-- accepting a job and starting it, driving the Active Job screen's
-- progressive status controls ("I'm on my way" -> "I've arrived" ->
-- "Mark job as done"). Deliberately kept separate from bookings.status
-- (which stays 'confirmed' throughout this window) to avoid touching the
-- many places that assume status has exactly 5 values.
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_job_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_job_status_check
  CHECK (job_status IN ('broadcasting','accepted','en-route','in-progress','completed','cancelled'));

-- Edge Function: send-whatsapp gained three new `type` branches (en_route,
-- arrived, job_completed) sending the customer progress updates as the
-- cleaner moves through the Active Job screen's status controls.


-- ============================================================
-- V17 ADDITIONS — Review authorship controls, public review display,
-- Uber deep-link destination caching
-- ============================================================

-- Reviews were immutable-only under V11; the author can now fix/remove
-- their own feedback.
CREATE POLICY "Authors can update own reviews"
  ON reviews FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Authors can delete own reviews"
  ON reviews FOR DELETE USING (auth.uid() = user_id);

-- Reviews are public (V11's "Anyone can view reviews"), but profiles are
-- intentionally private (own-row-only RLS) -- so the reviewer's first name
-- is captured at submission time instead of joined from profiles later,
-- keeping the public Cleaners page and Admin's Workers tab from needing
-- any profiles access at all.
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reviewer_name TEXT;

-- Cache the geocoded destination on the booking itself so the Active Job
-- screen's map and Uber deep link don't need to re-hit Nominatim on every
-- load, and the dropoff pin is reliably pre-filled rather than depending on
-- geocoding finishing before the cleaner taps the button.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;
