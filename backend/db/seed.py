"""
Seed script — populates database with Vishwaa's profile data.
Run once: python3 db/seed.py
"""
import asyncio
import uuid
from db.database import AsyncSessionLocal, init_db
from sqlalchemy import text

USER_ID = "550e8400-e29b-41d4-a716-446655440000"  # fixed UUID for Vishwaa

async def seed():
    await init_db()
    
    async with AsyncSessionLocal() as db:
        # Check if already seeded
        result = await db.execute(text("SELECT id FROM user_profiles WHERE id = :id"), {"id": USER_ID})
        if result.fetchone():
            print("Already seeded — skipping")
            return

        print("Seeding database...")

        # ── User Profile ──────────────────────────────────────────────────────
        await db.execute(text("""
            INSERT INTO user_profiles (id, name, email, phone, linkedin_url, github_url, portfolio_url, university, degree, visa_status)
            VALUES (:id, :name, :email, :phone, :linkedin, :github, :portfolio, :university, :degree, :visa)
        """), {
            "id": USER_ID,
            "name": "Vishwaa Shah",
            "email": "vishwaa.career@gmail.com",
            "phone": "+1 (469) 372-0558",
            "linkedin": "linkedin.com/in/vishwaa-shah",
            "github": "github.com/Vswashah",
            "portfolio": "vishwaashah.vercel.app",
            "university": "University of Texas at Dallas",
            "degree": "M.S. Computer Science",
            "visa": "F-1"
        })

        # ── Skills ────────────────────────────────────────────────────────────
        skills = [
            ("Python", "language"), ("JavaScript", "language"), ("TypeScript", "language"),
            ("Go", "language"), ("C++", "language"), ("SQL", "language"), ("Bash", "language"),
            ("React", "framework"), ("Node.js", "framework"), ("FastAPI", "framework"),
            ("Flask", "framework"), ("NestJS", "framework"), ("Next.js", "framework"),
            ("PostgreSQL", "database"), ("MySQL", "database"), ("Redis", "database"),
            ("pgvector", "database"), ("MongoDB", "database"),
            ("AWS", "cloud"), ("Docker", "cloud"), ("Kubernetes", "cloud"),
            ("Terraform", "cloud"), ("GitHub Actions", "cloud"), ("Azure", "cloud"),
            ("Linux", "tool"), ("Git", "tool"), ("Prometheus", "tool"), ("Grafana", "tool"),
            ("LangChain", "ai_ml"), ("LangGraph", "ai_ml"), ("LiteLLM", "ai_ml"),
            ("RAG", "ai_ml"), ("Kafka", "tool"),
        ]

        for name, category in skills:
            await db.execute(text("""
                INSERT INTO skills (id, user_id, name, category, proficiency, verified)
                VALUES (:id, :user_id, :name, :category, 'intermediate', TRUE)
            """), {"id": str(uuid.uuid4()), "user_id": USER_ID, "name": name, "category": category})

        # ── Projects ──────────────────────────────────────────────────────────
        projects = [
            {
                "name": "Fleet Telemetry Pipeline",
                "description": "Real-time vehicle telemetry pipeline processing 10K+ events/day",
                "stack": ["Python", "Go", "Kafka", "Redis", "PostgreSQL", "Prometheus", "Grafana", "AWS", "Docker", "Kubernetes"],
                "github_url": "github.com/Vswashah/fleet-telemetry",
                "live_url": None,
                "is_live": False,
                "domains": ["distributed_systems", "vehicle_software"],
                "highlights": {
                    "default": [
                        "Built distributed pipeline processing 10K+ events/day with 99% uptime — Kafka ingestion, Isolation Forest anomaly detection, PostgreSQL storage, Redis caching for <50ms lookups.",
                        "Full observability stack — Prometheus scrapes metrics, Grafana dashboards visualize throughput and anomaly rates in real time; deployed on AWS EKS with Terraform IaC and GitHub Actions CI/CD."
                    ]
                },
                "order": 1
            },
            {
                "name": "Trackly",
                "description": "Full-stack AI project tracking platform with RAG pipeline",
                "stack": ["React", "TypeScript", "Node.js", "PostgreSQL", "LangChain", "pgvector", "Docker", "AWS"],
                "github_url": None,
                "live_url": "trackly-eta-flame.vercel.app",
                "is_live": True,
                "domains": ["fullstack", "ai_ml"],
                "highlights": {
                    "default": [
                        "Shipped production SaaS platform solo — React/TypeScript frontend, Node.js REST API, PostgreSQL with pgvector, LangChain RAG pipeline delivering semantic search in <2s; live with real users.",
                        "AI-powered duplicate detection reduces manual entries 40% — LLM analyzes new tickets against existing history and auto-suggests resolutions; zero-downtime deployments via Kubernetes and GitHub Actions."
                    ]
                },
                "order": 2
            },
            {
                "name": "Phantom",
                "description": "Multi-agent AI debate system using LangGraph and LiteLLM",
                "stack": ["Python", "LangGraph", "LiteLLM", "FastAPI", "pgvector", "Docker"],
                "github_url": "github.com/Vswashah/phantom",
                "live_url": None,
                "is_live": False,
                "domains": ["ai_ml"],
                "highlights": {
                    "default": [
                        "Built production multi-agent AI system in under 2 weeks — LangGraph orchestrates 3 agents with real-time web search tool calling; LiteLLM handles multi-model inference across GPT, Claude, and Llama.",
                        "FastAPI REST backend serves structured debate outputs; pgvector stores semantic agent memory; open-source with comprehensive documentation and architecture diagrams."
                    ]
                },
                "order": 3
            },
            {
                "name": "AEGIS Platform",
                "description": "AI-powered IT and security compliance platform",
                "stack": ["Python", "React", "FastAPI", "PostgreSQL", "Docker", "AWS"],
                "github_url": None,
                "live_url": None,
                "is_live": False,
                "domains": ["ai_ml", "security"],
                "highlights": {
                    "default": [
                        "Co-founded Resilient Privacy and architected AEGIS — AI-powered IT security platform unifying ticketing, endpoint management, and knowledge base; selected for CometX Accelerator with Harvard Business School Foundry.",
                        "Placed top 20 out of 181 teams at Draper Pitch Competition — judges cited unified data architecture and native AI integration as key differentiators."
                    ]
                },
                "order": 4
            },
        ]

        import json
        for p in projects:
            await db.execute(text("""
                INSERT INTO projects (id, user_id, name, description, stack, github_url, live_url, is_live, domains, highlights, display_order)
                VALUES (:id, :user_id, :name, :description, :stack, :github_url, :live_url, :is_live, :domains, :highlights, :order)
            """), {
                "id": str(uuid.uuid4()),
                "user_id": USER_ID,
                "name": p["name"],
                "description": p["description"],
                "stack": p["stack"],
                "github_url": p["github_url"],
                "live_url": p["live_url"],
                "is_live": p["is_live"],
                "domains": p["domains"],
                "highlights": json.dumps(p["highlights"]),
                "order": p["order"]
            })

        # ── Experience ────────────────────────────────────────────────────────
        experience = [
            {
                "title": "CS Outreach Instructor",
                "company": "University of Texas at Dallas",
                "location": "Dallas, TX",
                "dates": "Jun 2026 – Present",
                "bullets": [
                    "Build and deploy interactive web tools for real student users — take end-to-end ownership of features, iterate based on feedback, deploy via CI/CD pipeline.",
                    "Design curriculum and hands-on coding exercises for 20+ students per session — translate complex technical concepts into accessible formats."
                ],
                "domains": ["fullstack", "teaching"],
                "order": 1
            },
            {
                "title": "Software Developer Intern",
                "company": "Palm Infotech",
                "location": "Surat, India",
                "dates": "Jan 2025 – Apr 2025",
                "bullets": [
                    "Built and maintained production REST APIs in Python/Node.js with MySQL — shipped 10+ features end-to-end in Agile sprints; 85%+ test coverage via GitHub Actions CI/CD with zero regression incidents.",
                    "Identified and resolved N+1 database query bottleneck causing production timeouts — added structured logging, rewrote with JOIN and Redis caching; response time dropped from 800ms to <250ms."
                ],
                "domains": ["fullstack", "backend", "distributed_systems"],
                "order": 2
            },
            {
                "title": "Computer Science Grader",
                "company": "University of Texas at Dallas",
                "location": "Dallas, TX",
                "dates": "Sep 2025 – May 2026",
                "bullets": [
                    "Evaluated 300+ student submissions/semester in Data Structures and Algorithms — collaborated with faculty on grading rubrics; maintained detailed feedback logs.",
                    "Co-authored empirical AI security research benchmarking 13 frontier LLMs across 569 real-world GitHub commits using CodeQL static analysis; 426 CPU hours distributed compute."
                ],
                "domains": ["research", "algorithms"],
                "order": 3
            },
            {
                "title": "Data Analyst Intern",
                "company": "Technokrit Solutions",
                "location": "India",
                "dates": "May 2024 – Aug 2024",
                "bullets": [
                    "Built Power BI dashboards and automated ETL pipelines surfacing KPIs across 3+ business teams — wrote SQL queries to retrieve and transform data from relational databases.",
                    "Applied statistical analysis to identify process optimization opportunities — cleaned and transformed raw datasets, documented data definitions and reporting processes."
                ],
                "domains": ["data_engineering", "analytics"],
                "order": 4
            },
        ]

        for e in experience:
            await db.execute(text("""
                INSERT INTO experience (id, user_id, title, company, location, dates, bullets, domains, display_order)
                VALUES (:id, :user_id, :title, :company, :location, :dates, :bullets, :domains, :order)
            """), {
                "id": str(uuid.uuid4()),
                "user_id": USER_ID,
                "title": e["title"],
                "company": e["company"],
                "location": e["location"],
                "dates": e["dates"],
                "bullets": e["bullets"],
                "domains": e["domains"],
                "order": e["order"]
            })

        # ── Settings ──────────────────────────────────────────────────────────
        settings = [
            ("autofit_enabled", "true", "resume"),
            ("follow_up_days", "5", "outreach"),
            ("f1_filter_enabled", "true", "jobs"),
            ("default_max_projects", "3", "resume"),
            ("default_max_experience", "3", "resume"),
        ]

        for key, value, category in settings:
            await db.execute(text("""
                INSERT INTO settings (id, key, value, category)
                VALUES (:id, :key, :value, :category)
            """), {"id": str(uuid.uuid4()), "key": key, "value": value, "category": category})

        await db.commit()
        print("✅ Database seeded successfully!")
        print(f"   User ID: {USER_ID}")
        print(f"   Skills: {len(skills)}")
        print(f"   Projects: {len(projects)}")
        print(f"   Experience: {len(experience)}")

asyncio.run(seed())
