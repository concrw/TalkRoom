-- 1) Add training_weeks to talk_rooms
ALTER TABLE public.talk_rooms
ADD COLUMN IF NOT EXISTS training_weeks integer NOT NULL DEFAULT 3;

-- Restrict to allowed values (1,2,3,5,9) using CHECK (not time-based)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'talk_rooms_training_weeks_allowed'
  ) THEN
    ALTER TABLE public.talk_rooms
    ADD CONSTRAINT talk_rooms_training_weeks_allowed
    CHECK (training_weeks IN (1,2,3,5,9));
  END IF;
END $$;

-- 2) Add course_completed to room_participants
ALTER TABLE public.room_participants
ADD COLUMN IF NOT EXISTS course_completed boolean NOT NULL DEFAULT false;

-- 3) Create training_courses table
CREATE TABLE IF NOT EXISTS public.training_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  talk_room_id uuid NOT NULL,
  course_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_days integer NOT NULL,
  start_date date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, talk_room_id)
);

ALTER TABLE public.training_courses ENABLE ROW LEVEL SECURITY;

-- Policies for training_courses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='training_courses' AND policyname='Users can view their own training courses'
  ) THEN
    CREATE POLICY "Users can view their own training courses"
    ON public.training_courses
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='training_courses' AND policyname='Users can create their own training courses'
  ) THEN
    CREATE POLICY "Users can create their own training courses"
    ON public.training_courses
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='training_courses' AND policyname='Users can update their own training courses'
  ) THEN
    CREATE POLICY "Users can update their own training courses"
    ON public.training_courses
    FOR UPDATE
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='training_courses' AND policyname='Users can delete their own training courses'
  ) THEN
    CREATE POLICY "Users can delete their own training courses"
    ON public.training_courses
    FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Trigger for updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_training_courses_updated_at'
  ) THEN
    CREATE TRIGGER update_training_courses_updated_at
    BEFORE UPDATE ON public.training_courses
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Indexes for training_courses
CREATE INDEX IF NOT EXISTS idx_training_courses_user ON public.training_courses (user_id);
CREATE INDEX IF NOT EXISTS idx_training_courses_room ON public.training_courses (talk_room_id);

-- 4) Create daily_logs table
CREATE TABLE IF NOT EXISTS public.daily_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  talk_room_id uuid NOT NULL,
  day_number integer NOT NULL,
  morning_promise text,
  evening_review text,
  log_date date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, talk_room_id, day_number)
);

ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;

-- RLS for daily_logs: users manage own logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='daily_logs' AND policyname='Users can view their own daily logs'
  ) THEN
    CREATE POLICY "Users can view their own daily logs"
    ON public.daily_logs
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='daily_logs' AND policyname='Users can insert their own daily logs'
  ) THEN
    CREATE POLICY "Users can insert their own daily logs"
    ON public.daily_logs
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='daily_logs' AND policyname='Users can update their own daily logs'
  ) THEN
    CREATE POLICY "Users can update their own daily logs"
    ON public.daily_logs
    FOR UPDATE
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='daily_logs' AND policyname='Users can delete their own daily logs'
  ) THEN
    CREATE POLICY "Users can delete their own daily logs"
    ON public.daily_logs
    FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Trigger for updated_at on daily_logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_daily_logs_updated_at'
  ) THEN
    CREATE TRIGGER update_daily_logs_updated_at
    BEFORE UPDATE ON public.daily_logs
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Indexes for daily_logs
CREATE INDEX IF NOT EXISTS idx_daily_logs_room ON public.daily_logs (talk_room_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_user ON public.daily_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_room_day ON public.daily_logs (talk_room_id, day_number);

-- 5) RPC to safely share ONLY evening_review with room participants
CREATE OR REPLACE FUNCTION public.get_evening_logs(_room_id uuid)
RETURNS TABLE (
  user_id uuid,
  day_number integer,
  evening_review text,
  log_date date,
  created_at timestamptz
) AS $$
  SELECT dl.user_id, dl.day_number, dl.evening_review, dl.log_date, dl.created_at
  FROM public.daily_logs dl
  WHERE dl.talk_room_id = _room_id
    AND dl.evening_review IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.room_participants rp
      WHERE rp.room_id = _room_id AND rp.user_id = auth.uid()
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_evening_logs(uuid) TO authenticated;
