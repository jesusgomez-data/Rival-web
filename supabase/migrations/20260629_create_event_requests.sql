CREATE TABLE IF NOT EXISTS event_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    event_name TEXT NOT NULL,
    type TEXT NOT NULL,
    date DATE NOT NULL,
    location TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    details TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Enable RLS (though we only interact with it using service role from backend)
ALTER TABLE event_requests ENABLE ROW LEVEL SECURITY;
