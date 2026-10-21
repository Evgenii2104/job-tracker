ALTER TABLE applications
  ADD CONSTRAINT applications_user_id_job_id_key
  UNIQUE (user_id, job_id);
