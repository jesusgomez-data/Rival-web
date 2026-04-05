-- Ejecuta este comando en el SQL Editor de tu panel de Supabase para habilitar los Mensajes Directos:

CREATE TABLE IF NOT EXISTS user_chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_participants (
    chat_id UUID REFERENCES user_chats(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (chat_id, user_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID REFERENCES user_chats(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT,
    shared_post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE user_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Evitamos duplicados en checks simples y agregamos politicas basicas de lectura/escritura
CREATE POLICY "Chats Read" ON user_chats FOR SELECT USING (true);
CREATE POLICY "Chats Insert" ON user_chats FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Participants Read" ON chat_participants FOR SELECT USING (true);
CREATE POLICY "Participants Insert" ON chat_participants FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Messages Read" ON chat_messages FOR SELECT USING (true);
CREATE POLICY "Messages Insert" ON chat_messages FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
