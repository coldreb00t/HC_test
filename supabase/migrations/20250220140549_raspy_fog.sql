-- Insert test data for development
DO $$
DECLARE
  v_trainer_id uuid;
  v_client_count integer;
BEGIN
  -- Get first trainer ID
  SELECT id INTO v_trainer_id
  FROM auth.users
  WHERE raw_user_meta_data->>'role' = 'trainer'
  LIMIT 1;

  -- Count existing clients
  SELECT COUNT(*) INTO v_client_count FROM clients;

  -- Only insert test data if we have no clients
  IF v_client_count = 0 THEN
    -- Insert test clients with random UUIDs as user_ids
    INSERT INTO clients (user_id, first_name, last_name, phone, subscription_status)
    VALUES 
      (gen_random_uuid(), 'Анна', 'Петрова', '+7 (999) 123-45-67', 'active'),
      (gen_random_uuid(), 'Иван', 'Сидоров', '+7 (999) 234-56-78', 'active'),
      (gen_random_uuid(), 'Мария', 'Иванова', '+7 (999) 345-67-89', 'inactive');

    -- Insert test workouts for each client
    INSERT INTO workouts (client_id, trainer_id, start_time, end_time, title)
    SELECT 
      c.id as client_id,
      v_trainer_id as trainer_id,
      (NOW()::date + '10:00'::time) as start_time,
      (NOW()::date + '11:00'::time) as end_time,
      'Персональная тренировка' as title
    FROM clients c;
  END IF;
END $$;