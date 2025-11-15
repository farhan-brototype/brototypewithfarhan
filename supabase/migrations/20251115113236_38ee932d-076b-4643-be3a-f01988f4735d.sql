-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE app_role AS ENUM ('admin', 'user');
CREATE TYPE complaint_status AS ENUM ('submitted', 'in_progress', 'under_review', 'resolved');

-- Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_roles table (separate for security)
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Create assignments table
CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create complaints table
CREATE TABLE complaints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  file_url TEXT,
  status complaint_status DEFAULT 'submitted',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create emergencies table
CREATE TABLE emergencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create refreshment_usage table (track daily game usage)
CREATE TABLE refreshment_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  minutes_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Create contacts table
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  phone TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create course_applications table
CREATE TABLE course_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  background TEXT,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create chat_rooms table
CREATE TABLE chat_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'admin_user', 'all_users', 'private'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create chat_messages table
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE refreshment_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles" ON user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all roles" ON user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for assignments
CREATE POLICY "Users can view own assignments" ON assignments FOR SELECT USING (auth.uid() = assigned_to OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage assignments" ON assignments FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for complaints
CREATE POLICY "Users can view own complaints" ON complaints FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can create own complaints" ON complaints FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own complaints" ON complaints FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all complaints" ON complaints FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for emergencies
CREATE POLICY "Users can view own emergencies" ON emergencies FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can create emergencies" ON emergencies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all emergencies" ON emergencies FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for refreshment_usage
CREATE POLICY "Users can view own usage" ON refreshment_usage FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can manage own usage" ON refreshment_usage FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for contacts
CREATE POLICY "Everyone can view contacts" ON contacts FOR SELECT USING (true);
CREATE POLICY "Admins can manage contacts" ON contacts FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for course_applications
CREATE POLICY "Everyone can submit applications" ON course_applications FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view applications" ON course_applications FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for chat_rooms
CREATE POLICY "Users can view chat rooms" ON chat_rooms FOR SELECT USING (true);
CREATE POLICY "Admins can manage chat rooms" ON chat_rooms FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for chat_messages
CREATE POLICY "Users can view messages in their rooms" ON chat_messages FOR SELECT USING (true);
CREATE POLICY "Users can send messages" ON chat_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Create function to handle profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Add update triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_complaints_updated_at BEFORE UPDATE ON complaints FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Create default chat rooms
INSERT INTO chat_rooms (name, type) VALUES 
  ('Admin Support', 'admin_user'),
  ('All Users', 'all_users');

-- Insert default contacts
INSERT INTO contacts (name, role, phone, whatsapp) VALUES
  ('Brototype Support', 'Support Team', '9037133475', '9037133475');

-- Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;