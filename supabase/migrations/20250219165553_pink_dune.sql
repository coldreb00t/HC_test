-- Drop the existing view first
DROP VIEW IF EXISTS client_profiles;

-- Добавляем новые поля в таблицу clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS photo_url text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'inactive';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS subscription_end_date timestamptz;

-- Создаем таблицу для замеров клиента
CREATE TABLE IF NOT EXISTS client_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  date timestamptz DEFAULT now(),
  weight numeric(5,2),
  height numeric(5,2),
  chest numeric(5,2),
  waist numeric(5,2),
  hips numeric(5,2),
  biceps numeric(5,2),
  body_fat_percentage numeric(4,1),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Создаем таблицу для документов и анализов
CREATE TABLE IF NOT EXISTS client_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  title text NOT NULL,
  type text NOT NULL, -- 'analysis', 'medical_cert', 'other'
  file_url text NOT NULL,
  upload_date timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Создаем таблицу программ тренировок
CREATE TABLE IF NOT EXISTS training_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid REFERENCES auth.users(id),
  title text NOT NULL,
  description text,
  difficulty_level text, -- 'beginner', 'intermediate', 'advanced'
  duration_weeks integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Создаем таблицу для назначенных программ
CREATE TABLE IF NOT EXISTS client_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  program_id uuid REFERENCES training_programs(id),
  start_date timestamptz DEFAULT now(),
  end_date timestamptz,
  status text DEFAULT 'active', -- 'active', 'completed', 'cancelled'
  progress numeric(4,1) DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Создаем таблицу платежей
CREATE TABLE IF NOT EXISTS subscription_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  payment_date timestamptz DEFAULT now(),
  subscription_start timestamptz NOT NULL,
  subscription_end timestamptz NOT NULL,
  status text DEFAULT 'pending', -- 'pending', 'completed', 'failed'
  payment_method text,
  created_at timestamptz DEFAULT now()
);

-- Включаем RLS для новых таблиц
ALTER TABLE client_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;

-- Удаляем существующие политики, если они есть
DROP POLICY IF EXISTS "Trainers can view all measurements" ON client_measurements;
DROP POLICY IF EXISTS "Clients can view own measurements" ON client_measurements;
DROP POLICY IF EXISTS "Trainers can view all documents" ON client_documents;
DROP POLICY IF EXISTS "Clients can manage own documents" ON client_documents;
DROP POLICY IF EXISTS "Trainers can manage training programs" ON training_programs;
DROP POLICY IF EXISTS "Clients can view assigned programs" ON training_programs;
DROP POLICY IF EXISTS "Trainers can manage client programs" ON client_programs;
DROP POLICY IF EXISTS "Clients can view own programs" ON client_programs;
DROP POLICY IF EXISTS "Trainers can view all payments" ON subscription_payments;
DROP POLICY IF EXISTS "Clients can view own payments" ON subscription_payments;

-- Политики для замеров
CREATE POLICY "Trainers can view all measurements"
  ON client_measurements
  FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'trainer'
  );

CREATE POLICY "Clients can view own measurements"
  ON client_measurements
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients 
      WHERE user_id = auth.uid()
    )
  );

-- Политики для документов
CREATE POLICY "Trainers can view all documents"
  ON client_documents
  FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'trainer'
  );

CREATE POLICY "Clients can manage own documents"
  ON client_documents
  FOR ALL
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    client_id IN (
      SELECT id FROM clients 
      WHERE user_id = auth.uid()
    )
  );

-- Политики для программ тренировок
CREATE POLICY "Trainers can manage training programs"
  ON training_programs
  FOR ALL
  TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'trainer'
  )
  WITH CHECK (
    auth.jwt() ->> 'role' = 'trainer'
  );

CREATE POLICY "Clients can view assigned programs"
  ON training_programs
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT program_id 
      FROM client_programs 
      WHERE client_id IN (
        SELECT id FROM clients 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Политики для назначенных программ
CREATE POLICY "Trainers can manage client programs"
  ON client_programs
  FOR ALL
  TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'trainer'
  )
  WITH CHECK (
    auth.jwt() ->> 'role' = 'trainer'
  );

CREATE POLICY "Clients can view own programs"
  ON client_programs
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients 
      WHERE user_id = auth.uid()
    )
  );

-- Политики для платежей
CREATE POLICY "Trainers can view all payments"
  ON subscription_payments
  FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'trainer'
  );

CREATE POLICY "Clients can view own payments"
  ON subscription_payments
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients 
      WHERE user_id = auth.uid()
    )
  );

-- Создаем новое представление client_profiles
CREATE VIEW client_profiles AS
SELECT 
  c.id,
  c.user_id,
  c.first_name,
  c.last_name,
  get_auth_user_email(c.user_id) as email,
  c.phone,
  c.photo_url,
  c.subscription_status,
  c.subscription_end_date,
  c.created_at,
  (
    SELECT json_build_object(
      'id', w.id,
      'start_time', w.start_time,
      'title', w.title
    )
    FROM workouts w
    WHERE w.client_id = c.id
    AND w.start_time > CURRENT_TIMESTAMP
    ORDER BY w.start_time
    LIMIT 1
  ) as next_workout,
  (
    SELECT json_build_object(
      'id', cp.id,
      'program_title', tp.title,
      'progress', cp.progress
    )
    FROM client_programs cp
    JOIN training_programs tp ON tp.id = cp.program_id
    WHERE cp.client_id = c.id
    AND cp.status = 'active'
    ORDER BY cp.start_date DESC
    LIMIT 1
  ) as current_program,
  (
    SELECT row_to_json(m.*)
    FROM client_measurements m
    WHERE m.client_id = c.id
    ORDER BY m.date DESC
    LIMIT 1
  ) as latest_measurements
FROM clients c
WHERE 
  (EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND (raw_user_meta_data->>'role')::text = 'trainer'
  ))
  OR
  c.user_id = auth.uid();

-- Обновляем права доступа к представлению
GRANT SELECT ON client_profiles TO authenticated;