-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable PostGIS for location queries (optional, but recommended)
-- CREATE EXTENSION IF NOT EXISTS "postgis";

-- Profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  instruments TEXT[] DEFAULT '{}',
  genres TEXT[] DEFAULT '{}',
  experience_level TEXT CHECK (experience_level IN ('beginner', 'intermediate', 'advanced', 'professional')),
  bio TEXT,
  availability TEXT,
  city TEXT,
  country TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  links JSONB DEFAULT '{}',
  avatar_url TEXT,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Jams table
CREATE TABLE jams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  host_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  jam_time TIMESTAMPTZ NOT NULL,
  city TEXT,
  country TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  desired_instruments TEXT[] DEFAULT '{}',
  max_attendees INT DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Jam members table
CREATE TABLE jam_members (
  jam_id UUID NOT NULL REFERENCES jams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'attendee' CHECK (role IN ('host', 'attendee')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (jam_id, user_id)
);

-- Direct messages table
CREATE TABLE dms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_a UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_a_last_read_at TIMESTAMPTZ DEFAULT NOW(),
  user_b_last_read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_a, user_b),
  CHECK (user_a < user_b)
);

-- Messages table (for both DMs and jam chats)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_type TEXT NOT NULL CHECK (room_type IN ('dm', 'jam')),
  room_id UUID NOT NULL,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_profiles_location ON profiles(lat, lng) WHERE lat IS NOT NULL AND lng IS NOT NULL;
CREATE INDEX idx_profiles_instruments ON profiles USING GIN(instruments);
CREATE INDEX idx_profiles_genres ON profiles USING GIN(genres);
CREATE INDEX idx_jams_location ON jams(lat, lng) WHERE lat IS NOT NULL AND lng IS NOT NULL;
CREATE INDEX idx_jams_time ON jams(jam_time);
CREATE INDEX idx_jam_members_jam ON jam_members(jam_id);
CREATE INDEX idx_jam_members_user ON jam_members(user_id);
CREATE INDEX idx_messages_room ON messages(room_type, room_id, created_at DESC);
CREATE INDEX idx_dms_users ON dms(user_a, user_b);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jams_updated_at BEFORE UPDATE ON jams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate distance using Haversine formula
CREATE OR REPLACE FUNCTION haversine_distance(
  lat1 DOUBLE PRECISION,
  lng1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION,
  lng2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION AS $$
DECLARE
  earth_radius_km DOUBLE PRECISION := 6371;
  dlat DOUBLE PRECISION;
  dlng DOUBLE PRECISION;
  a DOUBLE PRECISION;
  c DOUBLE PRECISION;
BEGIN
  dlat := radians(lat2 - lat1);
  dlng := radians(lng2 - lng1);
  a := sin(dlat / 2) * sin(dlat / 2) +
       cos(radians(lat1)) * cos(radians(lat2)) *
       sin(dlng / 2) * sin(dlng / 2);
  c := 2 * atan2(sqrt(a), sqrt(1 - a));
  RETURN earth_radius_km * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE jams ENABLE ROW LEVEL SECURITY;
ALTER TABLE jam_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE dms ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view profiles"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);


-- Storage policies for Avatars bucket
-- Ensure RLS is enabled on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Public read access for files in the "avatars" bucket (so avatar URLs work without auth)
CREATE POLICY "Public read for avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Only authenticated users can upload to the avatars bucket, and the object must be owned by them
CREATE POLICY "Authenticated users can upload avatars"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND owner = auth.uid());

-- Owners can update their own avatar files
CREATE POLICY "Users can update own avatars"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'avatars' AND owner = auth.uid());

-- Owners can delete their own avatar files (used when removing/replacing avatars)
CREATE POLICY "Users can delete own avatars"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND owner = auth.uid());

-- Jams policies
CREATE POLICY "Anyone can view jams"
  ON jams FOR SELECT
  USING (true);

CREATE POLICY "Users can create jams"
  ON jams FOR INSERT
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts can update their jams"
  ON jams FOR UPDATE
  USING (auth.uid() = host_id);

CREATE POLICY "Hosts can delete their jams"
  ON jams FOR DELETE
  USING (auth.uid() = host_id);

-- Jam members policies
CREATE POLICY "Users can view jam members for their jams"
  ON jam_members FOR SELECT
  USING (
    user_id = auth.uid() OR
    jam_id IN (SELECT id FROM jams WHERE host_id = auth.uid())
  );

CREATE POLICY "Users can request to join jams"
  ON jam_members FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    status = 'pending'
  );

CREATE POLICY "Hosts can update member status"
  ON jam_members FOR UPDATE
  USING (
    jam_id IN (SELECT id FROM jams WHERE host_id = auth.uid())
  );

CREATE POLICY "Users can cancel pending requests"
  ON jam_members FOR DELETE
  USING (
    auth.uid() = user_id
    AND status = 'pending'
  );

-- DMs policies
CREATE POLICY "Users can view their DMs"
  ON dms FOR SELECT
  USING (user_a = auth.uid() OR user_b = auth.uid());

CREATE POLICY "Users can create DMs"
  ON dms FOR INSERT
  WITH CHECK (user_a = auth.uid() OR user_b = auth.uid());

-- Helper function to mark a DM as read for the current user
CREATE OR REPLACE FUNCTION mark_dm_read(p_dm_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  UPDATE dms
  SET user_a_last_read_at = NOW()
  WHERE id = p_dm_id AND user_a = auth.uid();

  UPDATE dms
  SET user_b_last_read_at = NOW()
  WHERE id = p_dm_id AND user_b = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION mark_dm_read(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mark_dm_read(UUID) TO authenticated;

-- Messages policies
CREATE POLICY "Users can view messages in their rooms"
  ON messages FOR SELECT
  USING (
    -- For DMs: user must be part of the DM
    (room_type = 'dm' AND room_id IN (
      SELECT id FROM dms WHERE user_a = auth.uid() OR user_b = auth.uid()
    ))
    OR
    -- For jam chats: user must be a member or host
    (room_type = 'jam' AND (
      room_id IN (SELECT jam_id FROM jam_members WHERE user_id = auth.uid() AND status = 'approved')
      OR
      room_id IN (SELECT id FROM jams WHERE host_id = auth.uid())
    ))
  );

CREATE POLICY "Users can send messages in their rooms"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    (
      -- For DMs: user must be part of the DM
      (room_type = 'dm' AND room_id IN (
        SELECT id FROM dms WHERE user_a = auth.uid() OR user_b = auth.uid()
      ))
      OR
      -- For jam chats: user must be a member or host
      (room_type = 'jam' AND (
        room_id IN (SELECT jam_id FROM jam_members WHERE user_id = auth.uid() AND status = 'approved')
        OR
        room_id IN (SELECT id FROM jams WHERE host_id = auth.uid())
      ))
    )
  );
