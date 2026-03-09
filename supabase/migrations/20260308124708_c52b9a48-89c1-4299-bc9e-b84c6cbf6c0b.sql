CREATE OR REPLACE FUNCTION public.notify_eligible_users_on_new_job()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  eligible_user RECORD;
  job_provinces text[];
  job_edu_levels text[];
  job_edu_fields text[];
  min_required_rank int;
  max_field_rank int;
BEGIN
  IF NOT NEW.is_active THEN
    RETURN NEW;
  END IF;

  job_provinces := COALESCE(NEW.provinces, '{}');
  job_edu_levels := COALESCE(NEW.required_education_levels, '{}');
  job_edu_fields := COALESCE(NEW.required_education_fields, '{}');

  SELECT COALESCE(MIN(
    CASE lvl
      WHEN 'matric' THEN 1
      WHEN 'intermediate' THEN 2
      WHEN 'bachelor' THEN 3
      WHEN 'master' THEN 4
      WHEN 'phd' THEN 5
      ELSE 0
    END
  ), 0) INTO min_required_rank
  FROM unnest(job_edu_levels) AS lvl;

  SELECT COALESCE(MAX(
    CASE ef.education_level
      WHEN 'matric' THEN 1
      WHEN 'intermediate' THEN 2
      WHEN 'bachelor' THEN 3
      WHEN 'master' THEN 4
      WHEN 'phd' THEN 5
      ELSE 0
    END
  ), 0) INTO max_field_rank
  FROM education_fields ef
  WHERE ef.id::text = ANY(job_edu_fields);

  FOR eligible_user IN
    SELECT DISTINCT p.user_id
    FROM profiles p
    WHERE
      (p.date_of_birth IS NULL OR (
        EXTRACT(YEAR FROM age(CURRENT_DATE, p.date_of_birth))::int BETWEEN NEW.min_age AND NEW.max_age
      ))
      AND (NEW.gender_requirement IS NULL OR p.gender IS NULL OR p.gender::text = NEW.gender_requirement::text)
      AND (
        array_length(job_provinces, 1) IS NULL
        OR p.province IS NULL
        OR EXISTS (
          SELECT 1 FROM unnest(job_provinces) prov
          WHERE lower(prov) = lower(p.province) OR lower(prov) LIKE '%all%'
        )
      )
      AND (
        array_length(job_edu_levels, 1) IS NULL
        OR EXISTS (
          SELECT 1 FROM user_educations ue
          WHERE ue.user_id = p.user_id
          AND (CASE ue.education_level
            WHEN 'matric' THEN 1
            WHEN 'intermediate' THEN 2
            WHEN 'bachelor' THEN 3
            WHEN 'master' THEN 4
            WHEN 'phd' THEN 5
            ELSE 0
          END) >= min_required_rank
        )
      )
      AND (
        array_length(job_edu_fields, 1) IS NULL
        OR EXISTS (
          SELECT 1 FROM user_educations ue
          WHERE ue.user_id = p.user_id
          AND ue.education_field_id IS NOT NULL
          AND ue.education_field_id::text = ANY(job_edu_fields)
        )
        OR (max_field_rank > 0 AND EXISTS (
          SELECT 1 FROM user_educations ue
          WHERE ue.user_id = p.user_id
          AND (CASE ue.education_level
            WHEN 'matric' THEN 1
            WHEN 'intermediate' THEN 2
            WHEN 'bachelor' THEN 3
            WHEN 'master' THEN 4
            WHEN 'phd' THEN 5
            ELSE 0
          END) > max_field_rank
        ))
      )
      AND NOT EXISTS (
        SELECT 1 FROM user_roles ur WHERE ur.user_id = p.user_id AND ur.role = 'admin'
      )
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, reference_id, reference_type)
    VALUES (
      eligible_user.user_id,
      'new_eligible_job',
      'New Job Match!',
      'A new job "' || NEW.title || '" in ' || NEW.department || ' matches your profile. Apply before ' || to_char(NEW.last_date, 'DD Mon YYYY') || '.',
      NEW.id,
      'job'
    );
  END LOOP;

  RETURN NEW;
END;
$function$;