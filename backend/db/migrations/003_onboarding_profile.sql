-- Onboarding + job preferences. New signups get a guided flow to fill in
-- education, skills, projects, and job preferences before landing in the
-- app; onboarding_completed gates that. Existing accounts predate the flow
-- entirely, so they're backfilled to TRUE — nobody who's already using the
-- app should be forced through it retroactively.

ALTER TABLE user_profiles ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE user_profiles SET onboarding_completed = TRUE;

ALTER TABLE user_profiles ADD COLUMN job_type VARCHAR(50);
ALTER TABLE user_profiles ADD COLUMN remote_preference VARCHAR(50);
ALTER TABLE user_profiles ADD COLUMN target_roles TEXT[];
ALTER TABLE user_profiles ADD COLUMN preferred_locations TEXT[];
