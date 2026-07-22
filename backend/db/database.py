from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from loguru import logger
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://jobos:jobos123@localhost:5432/jobos")

# Managed Postgres providers (Render, Heroku, Neon, etc.) hand back a plain
# postgres:// or postgresql:// URL, often with a libpq-style `sslmode` query
# param — normalize the scheme to asyncpg and translate `sslmode` since
# asyncpg's connect() doesn't recognize that keyword (it wants `ssl`).
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

parts = urlsplit(DATABASE_URL)
query = dict(parse_qsl(parts.query))
sslmode = query.pop("sslmode", None)
if sslmode and sslmode != "disable":
    query["ssl"] = "require"
DATABASE_URL = urlunsplit(parts._replace(query=urlencode(query)))

engine = create_async_engine(DATABASE_URL, echo=False)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

class Base(DeclarativeBase):
    pass

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception as e:
            await session.rollback()
            raise
        finally:
            await session.close()

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database initialized")
