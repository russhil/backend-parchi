# Database Migration Instructions

## Issue: Missing Columns in Patients Table

The Supabase database is missing some columns that are defined in `schema.sql`:
- `phone`
- `email`
- `address`

## Quick Fix Applied

For now, the backend has been updated to skip these columns when creating patients. The phone number is still returned in the API response but not stored in the database.

## Permanent Solution

To fully resolve this and store phone numbers in the database, run the migration file in your Supabase SQL Editor:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to: Project > SQL Editor
3. Copy and paste the contents of `migrations.sql`
4. Click "Run" to execute the migration

### Migration SQL
```sql
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS address TEXT;

CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
```

## After Running Migration

Once the migration is complete, uncomment the phone/email/address fields in `main.py`:

```python
# In the create_new_patient function, uncomment these lines:
if req.phone:
    patient_data["phone"] = req.phone
if req.email:
    patient_data["email"] = req.email
if req.address:
    patient_data["address"] = req.address
```

Then remove the temporary response modifications.

## Testing

After migration, test patient creation:
```bash
curl -X POST http://localhost:8000/patients \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Patient","phone":"1234567890","age":25,"gender":"Male"}'
```

The phone should now be stored in the database.
