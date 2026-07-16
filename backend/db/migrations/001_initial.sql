-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ── MASTER TABLES ─────────────────────────────────────────────────────────────

CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50),
    linkedin_url VARCHAR(500),
    github_url VARCHAR(500),
    portfolio_url VARCHAR(500),
    university VARCHAR(255),
    degree VARCHAR(255),
    graduation_date DATE,
    visa_status VARCHAR(50) DEFAULT 'F-1',
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    proficiency VARCHAR(20) DEFAULT 'intermediate',
    verified BOOLEAN DEFAULT FALSE,
    source VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    stack TEXT[],
    github_url VARCHAR(500),
    live_url VARCHAR(500),
    is_live BOOLEAN DEFAULT FALSE,
    domains TEXT[],
    highlights JSONB,
    start_date DATE,
    end_date DATE,
    display_order INTEGER DEFAULT 0,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE experience (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    company VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    dates VARCHAR(100),
    bullets TEXT[],
    domains TEXT[],
    display_order INTEGER DEFAULT 0,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE education (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    degree VARCHAR(255) NOT NULL,
    school VARCHAR(255) NOT NULL,
    track VARCHAR(255),
    relevant_courses TEXT,
    start_date DATE,
    end_date DATE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) NOT NULL UNIQUE,
    value TEXT,
    category VARCHAR(50),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ── TRANSACTIONAL TABLES ──────────────────────────────────────────────────────

CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company VARCHAR(255) NOT NULL,
    role VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    remote_type VARCHAR(20),
    jd_text TEXT,
    jd_embedding VECTOR(1536),
    required_skills TEXT[],
    preferred_skills TEXT[],
    domain VARCHAR(100),
    team_focus TEXT,
    source_url VARCHAR(500),
    status VARCHAR(50) DEFAULT 'found',
    h1b_sponsor BOOLEAN,
    f1_eligible BOOLEAN DEFAULT TRUE,
    found_at TIMESTAMP DEFAULT NOW(),
    applied_at TIMESTAMP,
    deadline DATE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    file_path VARCHAR(500),
    skills_included TEXT[],
    projects_selected TEXT[],
    experience_selected TEXT[],
    multiplier DECIMAL(4,3),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    resume_id UUID REFERENCES resumes(id) ON DELETE SET NULL,
    applied_at TIMESTAMP DEFAULT NOW(),
    follow_up_sent_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'applied',
    rejection_reason TEXT,
    notes TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE interviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    round INTEGER DEFAULT 1,
    format VARCHAR(50),
    interview_date TIMESTAMP,
    interviewer_name VARCHAR(255),
    interviewer_role VARCHAR(255),
    questions_asked TEXT[],
    outcome VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE outreach (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    contact_name VARCHAR(255),
    contact_role VARCHAR(255),
    contact_email VARCHAR(255),
    contact_linkedin VARCHAR(500),
    message_draft TEXT,
    platform VARCHAR(50),
    sent_at TIMESTAMP,
    response_at TIMESTAMP,
    response_text TEXT,
    status VARCHAR(50) DEFAULT 'drafted',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ── INTELLIGENCE TABLES ───────────────────────────────────────────────────────

CREATE TABLE skill_confirmations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    skill_name VARCHAR(100) NOT NULL,
    confirmed BOOLEAN NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE learned_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(100),
    preference TEXT,
    confidence DECIMAL(3,2) DEFAULT 0.5,
    evidence TEXT[],
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ── SYSTEM TABLES ─────────────────────────────────────────────────────────────

CREATE TABLE activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id VARCHAR(255) UNIQUE NOT NULL,
    agent_type VARCHAR(50),
    state JSONB,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ── HISTORY TABLES ────────────────────────────────────────────────────────────

CREATE TABLE skill_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
    field_changed VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    changed_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE project_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    field_changed VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    changed_at TIMESTAMP DEFAULT NOW()
);

-- ── INDEXES ───────────────────────────────────────────────────────────────────

CREATE INDEX idx_skills_user_id ON skills(user_id);
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_experience_user_id ON experience(user_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_company ON jobs(company);
CREATE INDEX idx_applications_job_id ON applications(job_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_activity_log_action ON activity_log(action);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at);
CREATE INDEX idx_sessions_thread_id ON sessions(thread_id);
