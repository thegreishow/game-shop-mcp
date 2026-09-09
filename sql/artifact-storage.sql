-- Run once in the dedicated Game Shop Supabase project.
insert into storage.buckets (id, name, public, file_size_limit)
values ('game-shop-artifacts', 'game-shop-artifacts', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = 52428800;

-- Game Shop uses its server-side service role for object persistence.
-- Keep this bucket private; clients receive artifact metadata through Game Shop rather than anonymous storage access.
