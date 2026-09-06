-- Keep cloud source archival aligned with the browser's original-evidence policy.
-- Supabase's file_size_limit is bytes; 50 MiB is the maximum original accepted by ChimneyAI.
update storage.buckets
set file_size_limit=52428800,
    allowed_mime_types=array[
      'image/jpeg','image/png','image/webp','image/gif',
      'image/heic','image/heif','image/heic-sequence','image/heif-sequence','image/x-heic','image/x-heif',
      'application/pdf','application/octet-stream','application/csv','text/plain','text/markdown','text/csv'
    ]::text[]
where id='pro-case-sources';
