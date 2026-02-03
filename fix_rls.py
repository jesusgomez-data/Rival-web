#!/usr/bin/env python3
"""
Execute SQL in Supabase to fix RLS policies
"""

from supabase import create_client
import os

# Get environment variables
supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not supabase_url or not supabase_key:
    print("Error: Missing Supabase credentials")
    exit(1)

# Create Supabase client
supabase = create_client(supabase_url, supabase_key)

# SQL to fix RLS
sql_commands = [
    "DROP POLICY IF EXISTS 'Enable public read access' ON organizations;",
    "DROP POLICY IF EXISTS 'Enable insert for authenticated users' ON organizations;",
    "CREATE POLICY 'Enable public insert for organizations' ON organizations FOR INSERT WITH CHECK (true);",
    "CREATE POLICY 'Enable public read access' ON organizations FOR SELECT USING (true);",
    "ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;",
]

print("❌ Note: This method won't work with ANON_KEY")
print("You need to go to Supabase Dashboard > SQL Editor and run:")
print()
for cmd in sql_commands:
    print(cmd)
