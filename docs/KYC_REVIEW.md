# KYC Manual Review — Founder / Admin Guide

This document is for the **founder and any authorised reviewer** performing manual KYC checks on submitted documents.

> ⚠️ This guide covers the **manual/mock phase** of KYC. Real Veriff or partner integration is planned for a later milestone.

---

## Overview

When a user submits KYC documents through the app:

1. Files are uploaded to the **`kyc-documents`** Supabase Storage bucket.
2. A row is inserted in the **`kyc_submissions`** table with `status = 'pending'`.
3. The user's `users.kyc_status` column is updated to `'pending'`.
4. Remittance (LogTransfer screen) is blocked until `kyc_status = 'verified'`.

---

## Storage Bucket: `kyc-documents`

All uploaded files live at:

```
kyc-documents/<supabase_user_id>/document_<timestamp>.<ext>
kyc-documents/<supabase_user_id>/selfie_<timestamp>.<ext>
```

### Access

Only authorised Supabase roles (service_role / admin) should have read access.  
The anon key used by the frontend has **upload-only** access via RLS policy — it cannot list or download other users' files.

---

## Database Tables

### `kyc_submissions`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK → users.id |
| `document_type` | text | citizenship / passport / driving_license / voter_id |
| `document_path` | text | storage path |
| `selfie_path` | text | storage path |
| `status` | text | pending / verified / rejected |
| `submitted_at` | timestamptz | auto-set on insert |
| `reviewed_at` | timestamptz | set manually when reviewed |
| `reviewer_note` | text | visible to user if rejected |

### `users.kyc_status`

One of: `unverified` | `pending` | `verified` | `rejected`

---

## Review Process (Manual Steps)

### Step 1 — Find pending submissions

```sql
SELECT
  u.id,
  u.phone,
  u.name,
  u.kyc_status,
  s.document_type,
  s.document_path,
  s.selfie_path,
  s.submitted_at
FROM kyc_submissions s
JOIN users u ON u.id = s.user_id
WHERE s.status = 'pending'
ORDER BY s.submitted_at ASC;
```

### Step 2 — Download and review files

In **Supabase Dashboard → Storage → kyc-documents**, navigate to the user's folder and download the document and selfie images.

Verify:
- [ ] Document is a recognised Nepal ID (citizenship, passport, driving license, voter ID)
- [ ] Document is not expired
- [ ] Document is clear and all text is readable
- [ ] Selfie shows the applicant holding the same document
- [ ] Face in selfie reasonably matches the document photo

### Step 3a — Approve

```sql
-- Approve the submission
UPDATE kyc_submissions
SET status = 'verified', reviewed_at = now()
WHERE user_id = '<uuid>';

-- Update user record
UPDATE users
SET kyc_status = 'verified'
WHERE id = '<uuid>';
```

### Step 3b — Reject

```sql
-- Reject with a note (shown to the user in the app)
UPDATE kyc_submissions
SET
  status = 'rejected',
  reviewed_at = now(),
  reviewer_note = 'Your selfie was too blurry. Please resubmit with a clear, well-lit photo.'
WHERE user_id = '<uuid>'
  AND status = 'pending';

-- Update user record
UPDATE users
SET kyc_status = 'rejected'
WHERE id = '<uuid>';
```

The `reviewer_note` is surfaced in the app's Rejected panel so the user knows how to fix their submission.

---

## KYC Status Flow

```
unverified
    │
    ▼ (user submits)
pending
    │
    ├─► verified   (admin approves)
    │
    └─► rejected   (admin rejects)
             │
             ▼ (user resubmits)
          pending
```

---

## Remittance Gate

The `LogTransfer` screen checks `session.kycStatus` (stored in localStorage after sign-in / refresh) before allowing the user to submit.

If `kycStatus !== 'verified'`, the screen renders a KYC prompt with a link to `/kyc` instead of the transfer form.

> **Note:** The session `kycStatus` is set at sign-in from `users.kyc_status`. If you verify a user server-side, they will see the change only after their next sign-in or session refresh. For beta, this is acceptable.

---

## Supabase Setup Checklist

Before the first KYC submission can work, complete these one-time steps:

- [ ] Create `kyc-documents` bucket in Supabase Storage (private).
- [ ] Set bucket RLS: authenticated users can insert their own files only.
  ```sql
  -- INSERT policy on storage.objects
  CREATE POLICY "Users can upload their own KYC files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'kyc-documents' AND name LIKE (auth.uid()::text || '/%'));
  ```
- [ ] Create `kyc_submissions` table with the schema above.
- [ ] Add `kyc_status text NOT NULL DEFAULT 'unverified'` column to `users` table if not already present.
- [ ] Add check constraint:
  ```sql
  ALTER TABLE users ADD CONSTRAINT kyc_status_values
    CHECK (kyc_status IN ('unverified', 'pending', 'verified', 'rejected'));
  ```
- [ ] Add RLS policy so users can only read and update their own row.

---

## Future: Veriff Integration

When Veriff or a local Nepal KYC partner is integrated:

1. Replace `uploadKycFile` + `submitKyc` in `src/services/kycService.js` with a call to the partner SDK.
2. Implement a webhook to receive approval/rejection callbacks and update `kyc_submissions` + `users.kyc_status` automatically.
3. The UI states (`pending`, `verified`, `rejected`) require no changes.
