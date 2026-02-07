
-- Script to identify Foreign Keys that might block User deletion
-- Run this in Supabase SQL Editor

SELECT
    tc.table_schema, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name, 
    rc.delete_rule 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.referential_constraints AS rc
      ON tc.constraint_name = rc.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE 
    constraint_type = 'FOREIGN KEY' 
    AND (
        (ccu.table_name = 'users' AND ccu.table_schema = 'auth')
        OR 
        (ccu.table_name = 'profiles' AND ccu.table_schema = 'public')
    )
    AND rc.delete_rule != 'CASCADE' 
    AND rc.delete_rule != 'SET NULL';

-- If this query returns any rows, those tables are configured to RESTRICT or NO ACTION 
-- upon deletion of the referenced user/profile, causing the "Database error deleting user".
