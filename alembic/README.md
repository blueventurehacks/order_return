# Alembic Migrations

Initialize Alembic with:

```
alembic init alembic
```

Configure `alembic.ini` and `alembic/env.py` to use the `app.db:engine` and models metadata. Then generate migrations:

```
alembic revision --autogenerate -m "init"
alembic upgrade head
```
