# Prisma Migration Guide

This document explains the database migration strategy for the Medicare Hospital Management System.

## Migration Strategy

We use Prisma Migrate for schema migrations. This provides:
- Version-controlled schema changes
- Automatic migration file generation
- Rollback capabilities
- Production-safe deployments

## Creating Migrations

### 1. Make Schema Changes
Edit `prisma/schema.prisma` with your desired changes.

### 2. Generate Migration
```bash
cd backend
npx prisma migrate dev --name <description_of_change>
```

Example:
```bash
npx prisma migrate dev --name add_patient_insurance_fields
```

### 3. Review Generated Migration
Check the generated SQL in `prisma/migrations/<timestamp>_<description>/migration.sql`

### 4. Test Locally
The migration automatically runs against your local database when you use `migrate dev`.

## Production Deployment

For production, use `migrate deploy` which:
- Only applies pending migrations
- Does not generate new migrations
- Is safe for production use

```bash
npx prisma migrate deploy
```

## Rolling Back Migrations

### Rollback Last Migration (Development)
```bash
npx prisma migrate resolve --rolled-back <migration_name>
npx prisma migrate dev
```

### Rollback One Migration
```bash
npx prisma migrate resolve --applied <migration_name>
```

## Best Practices

1. **Always create migrations for schema changes** - Never manually edit the database
2. **Test migrations locally first** - Before deploying to production
3. **Backup before production migrations** - Always backup your database
4. **Review generated SQL** - Ensure it matches your expectations
5. **Use descriptive names** - Make migration names clear and specific
6. **Don't edit migration files** - Create new migrations instead
7. **Commit migration files** - They are part of your version control

## Troubleshooting

### Migration Conflicts
If you get migration conflicts:
```bash
npx prisma migrate resolve --applied <migration_name>
```

### Reset Database (Development Only)
```bash
npx prisma migrate reset
```
⚠️ This will delete all data!

### Check Migration Status
```bash
npx prisma migrate status
```

## Seed Data

Seed data is managed separately from migrations:

```bash
# Run seeds
npm run seed

# Or directly
npx prisma db seed
```

See `prisma/seed.ts` for seed data configuration.

## Environment Variables

Ensure these are set:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
```

## CI/CD Integration

In your deployment pipeline:
```bash
# Install dependencies
npm install

# Generate Prisma Client
npx prisma generate

# Deploy migrations
npx prisma migrate deploy

# Start application
npm start
```
