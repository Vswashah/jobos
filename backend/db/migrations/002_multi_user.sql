-- Multi-user support. Every table that previously had no owner (jobs,
-- resumes, activity_log, settings) gets scoped to a user_id. Existing rows
-- (seeded under the fixed demo USER_ID) are backfilled to keep working —
-- signing up with that same seeded email claims the account rather than
-- orphaning its data.

ALTER TABLE user_profiles ADD COLUMN password_hash VARCHAR(255);

ALTER TABLE jobs ADD COLUMN user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE;
UPDATE jobs SET user_id = '550e8400-e29b-41d4-a716-446655440000' WHERE user_id IS NULL;
CREATE INDEX idx_jobs_user_id ON jobs(user_id);

ALTER TABLE resumes ADD COLUMN user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE;
UPDATE resumes SET user_id = '550e8400-e29b-41d4-a716-446655440000' WHERE user_id IS NULL;
CREATE INDEX idx_resumes_user_id ON resumes(user_id);

ALTER TABLE activity_log ADD COLUMN user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE;
UPDATE activity_log SET user_id = '550e8400-e29b-41d4-a716-446655440000' WHERE user_id IS NULL;
CREATE INDEX idx_activity_log_user_id ON activity_log(user_id);

-- settings was a single global key/value store (e.g. gmail_refresh_token) —
-- now per user, so the same key can exist once per user instead of once globally.
ALTER TABLE settings ADD COLUMN user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE;
UPDATE settings SET user_id = '550e8400-e29b-41d4-a716-446655440000' WHERE user_id IS NULL;
ALTER TABLE settings DROP CONSTRAINT settings_key_key;
ALTER TABLE settings ALTER COLUMN user_id SET NOT NULL;
CREATE UNIQUE INDEX idx_settings_user_key ON settings(user_id, key);
