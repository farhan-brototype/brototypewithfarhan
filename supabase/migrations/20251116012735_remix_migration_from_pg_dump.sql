--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.7

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'user'
);


--
-- Name: complaint_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.complaint_status AS ENUM (
    'submitted',
    'in_progress',
    'under_review',
    'resolved'
);


--
-- Name: create_notification(uuid, text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_notification(p_user_id uuid, p_title text, p_message text, p_type text, p_link text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO notifications (user_id, title, message, type, link)
  VALUES (p_user_id, p_title, p_message, p_type, p_link);
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;


--
-- Name: notify_assignment_created(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_assignment_created() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.assigned_to IS NOT NULL THEN
    PERFORM create_notification(
      NEW.assigned_to,
      'New Assignment',
      'You have been assigned: ' || NEW.title,
      'assignment',
      '/dashboard/assignment'
    );
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: notify_complaint_status_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_complaint_status_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.status != OLD.status THEN
    PERFORM create_notification(
      NEW.user_id,
      'Complaint Status Updated',
      'Your complaint status has been changed to: ' || NEW.status,
      'complaint',
      '/dashboard/complaint'
    );
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: notify_emergency_created(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_emergency_created() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Notify all admins
  INSERT INTO notifications (user_id, title, message, type, link)
  SELECT ur.user_id, 'Emergency Alert', 'A new emergency has been reported', 'emergency', '/admin/emergencies'
  FROM user_roles ur
  WHERE ur.role = 'admin';
  
  RETURN NEW;
END;
$$;


--
-- Name: notify_grade_posted(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_grade_posted() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.grade IS NOT NULL AND OLD.grade IS NULL THEN
    PERFORM create_notification(
      NEW.user_id,
      'Assignment Graded',
      'Your assignment has been graded',
      'grade',
      '/dashboard/assignment'
    );
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: track_grade_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.track_grade_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND NEW.grade IS NOT NULL AND OLD.grade IS DISTINCT FROM NEW.grade) THEN
    INSERT INTO grade_history (submission_id, grade, feedback, graded_by)
    VALUES (NEW.id, NEW.grade, NEW.admin_feedback, NEW.graded_by);
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: assignment_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assignment_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    assignment_id uuid NOT NULL,
    user_id uuid NOT NULL,
    status text DEFAULT 'submitted'::text NOT NULL,
    comments text,
    file_urls text[],
    submitted_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    grade integer,
    admin_feedback text,
    graded_at timestamp with time zone,
    graded_by uuid
);


--
-- Name: assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assignments (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    title text NOT NULL,
    description text,
    due_date timestamp with time zone,
    assigned_to uuid,
    assigned_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_messages (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    room_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    message text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    read_by uuid[]
);


--
-- Name: chat_rooms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_rooms (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: complaints; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.complaints (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    file_url text,
    status public.complaint_status DEFAULT 'submitted'::public.complaint_status,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contacts (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    role text NOT NULL,
    phone text NOT NULL,
    whatsapp text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: course_applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.course_applications (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    full_name text NOT NULL,
    email text NOT NULL,
    phone text NOT NULL,
    background text,
    message text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: emergencies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.emergencies (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    description text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: grade_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.grade_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    submission_id uuid NOT NULL,
    grade integer NOT NULL,
    feedback text,
    graded_by uuid NOT NULL,
    graded_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    link text,
    read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    full_name text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: refreshment_usage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refreshment_usage (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    date date DEFAULT CURRENT_DATE,
    minutes_used integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: assignment_submissions assignment_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_submissions
    ADD CONSTRAINT assignment_submissions_pkey PRIMARY KEY (id);


--
-- Name: assignments assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_pkey PRIMARY KEY (id);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: chat_rooms chat_rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_rooms
    ADD CONSTRAINT chat_rooms_pkey PRIMARY KEY (id);


--
-- Name: complaints complaints_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complaints
    ADD CONSTRAINT complaints_pkey PRIMARY KEY (id);


--
-- Name: contacts contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (id);


--
-- Name: course_applications course_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_applications
    ADD CONSTRAINT course_applications_pkey PRIMARY KEY (id);


--
-- Name: emergencies emergencies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emergencies
    ADD CONSTRAINT emergencies_pkey PRIMARY KEY (id);


--
-- Name: grade_history grade_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grade_history
    ADD CONSTRAINT grade_history_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: refreshment_usage refreshment_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refreshment_usage
    ADD CONSTRAINT refreshment_usage_pkey PRIMARY KEY (id);


--
-- Name: refreshment_usage refreshment_usage_user_id_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refreshment_usage
    ADD CONSTRAINT refreshment_usage_user_id_date_key UNIQUE (user_id, date);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: assignments on_assignment_created; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_assignment_created AFTER INSERT ON public.assignments FOR EACH ROW EXECUTE FUNCTION public.notify_assignment_created();


--
-- Name: complaints on_complaint_status_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_complaint_status_change AFTER UPDATE ON public.complaints FOR EACH ROW EXECUTE FUNCTION public.notify_complaint_status_change();


--
-- Name: emergencies on_emergency_created; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_emergency_created AFTER INSERT ON public.emergencies FOR EACH ROW EXECUTE FUNCTION public.notify_emergency_created();


--
-- Name: assignment_submissions on_grade_posted; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_grade_posted AFTER UPDATE ON public.assignment_submissions FOR EACH ROW EXECUTE FUNCTION public.notify_grade_posted();


--
-- Name: assignment_submissions track_grade_change_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER track_grade_change_trigger AFTER UPDATE ON public.assignment_submissions FOR EACH ROW EXECUTE FUNCTION public.track_grade_change();


--
-- Name: assignment_submissions update_assignment_submissions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_assignment_submissions_updated_at BEFORE UPDATE ON public.assignment_submissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: assignments update_assignments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON public.assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: complaints update_complaints_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_complaints_updated_at BEFORE UPDATE ON public.complaints FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: contacts update_contacts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: assignment_submissions assignment_submissions_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_submissions
    ADD CONSTRAINT assignment_submissions_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(id) ON DELETE CASCADE;


--
-- Name: assignments assignments_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: assignments assignments_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.chat_rooms(id) ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: complaints complaints_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complaints
    ADD CONSTRAINT complaints_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: emergencies emergencies_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emergencies
    ADD CONSTRAINT emergencies_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: grade_history grade_history_submission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grade_history
    ADD CONSTRAINT grade_history_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.assignment_submissions(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: refreshment_usage refreshment_usage_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refreshment_usage
    ADD CONSTRAINT refreshment_usage_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: notifications Admins can create notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can create notifications" ON public.notifications FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: grade_history Admins can insert grade history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert grade history" ON public.grade_history FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: complaints Admins can manage all complaints; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all complaints" ON public.complaints USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can manage all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all roles" ON public.user_roles USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: assignment_submissions Admins can manage all submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all submissions" ON public.assignment_submissions USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: assignments Admins can manage assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage assignments" ON public.assignments USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: chat_rooms Admins can manage chat rooms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage chat rooms" ON public.chat_rooms USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: contacts Admins can manage contacts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage contacts" ON public.contacts USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: emergencies Admins can view all emergencies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all emergencies" ON public.emergencies FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: course_applications Admins can view applications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view applications" ON public.course_applications FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: course_applications Everyone can submit applications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can submit applications" ON public.course_applications FOR INSERT WITH CHECK (true);


--
-- Name: contacts Everyone can view contacts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view contacts" ON public.contacts FOR SELECT USING (true);


--
-- Name: emergencies Users can create emergencies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create emergencies" ON public.emergencies FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: complaints Users can create own complaints; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own complaints" ON public.complaints FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: assignment_submissions Users can create own submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own submissions" ON public.assignment_submissions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: refreshment_usage Users can manage own usage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own usage" ON public.refreshment_usage USING ((auth.uid() = user_id));


--
-- Name: chat_messages Users can send messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can send messages" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK ((auth.uid() = sender_id));


--
-- Name: complaints Users can update own complaints; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own complaints" ON public.complaints FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: notifications Users can update own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: assignment_submissions Users can update own submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own submissions" ON public.assignment_submissions FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: chat_messages Users can update read status; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update read status" ON public.chat_messages FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: profiles Users can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);


--
-- Name: chat_rooms Users can view chat rooms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view chat rooms" ON public.chat_rooms FOR SELECT USING (true);


--
-- Name: chat_messages Users can view messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view messages" ON public.chat_messages FOR SELECT TO authenticated USING (true);


--
-- Name: assignments Users can view own assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own assignments" ON public.assignments FOR SELECT USING (((auth.uid() = assigned_to) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: complaints Users can view own complaints; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own complaints" ON public.complaints FOR SELECT USING (((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: emergencies Users can view own emergencies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own emergencies" ON public.emergencies FOR SELECT USING (((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: notifications Users can view own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_roles Users can view own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: assignment_submissions Users can view own submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own submissions" ON public.assignment_submissions FOR SELECT USING (((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: refreshment_usage Users can view own usage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own usage" ON public.refreshment_usage FOR SELECT USING (((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: grade_history Users can view their own grade history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own grade history" ON public.grade_history FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.assignment_submissions
  WHERE ((assignment_submissions.id = grade_history.submission_id) AND (assignment_submissions.user_id = auth.uid())))) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: assignment_submissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

--
-- Name: assignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_rooms; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;

--
-- Name: complaints; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

--
-- Name: contacts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

--
-- Name: course_applications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.course_applications ENABLE ROW LEVEL SECURITY;

--
-- Name: emergencies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.emergencies ENABLE ROW LEVEL SECURITY;

--
-- Name: grade_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.grade_history ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: refreshment_usage; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.refreshment_usage ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


