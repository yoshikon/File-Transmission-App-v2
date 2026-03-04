/*
  # Fix Storage RLS Policies for File Upload

  1. Changes
    - Drop existing restrictive policies on storage.objects
    - Create new permissive policies for authenticated users to upload files
    - Allow public read access for file downloads

  2. Security
    - Authenticated users can upload files to delivery-files bucket
    - All users can read files from delivery-files bucket (needed for download links)
    - Service role has full access
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload files to their deliveries" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own delivery files" ON storage.objects;
DROP POLICY IF EXISTS "Service role has full access" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for downloads" ON storage.objects;

-- Allow authenticated users to upload to delivery-files bucket
CREATE POLICY "Authenticated users can upload to delivery-files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'delivery-files');

-- Allow authenticated users to read from delivery-files bucket
CREATE POLICY "Authenticated users can read delivery-files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'delivery-files');

-- Allow public read access (needed for recipient downloads via tokens)
CREATE POLICY "Public can read delivery-files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'delivery-files');

-- Allow authenticated users to update their files
CREATE POLICY "Authenticated users can update delivery-files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'delivery-files')
WITH CHECK (bucket_id = 'delivery-files');

-- Allow authenticated users to delete their files
CREATE POLICY "Authenticated users can delete delivery-files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'delivery-files');
