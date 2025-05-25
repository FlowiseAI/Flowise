-- Create triggers table
CREATE TABLE IF NOT EXISTS triggers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL,
    chatflow_id UUID NOT NULL,
    config JSONB,
    is_active BOOLEAN DEFAULT true,
    tenant_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create trigger_events table
CREATE TABLE IF NOT EXISTS trigger_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trigger_id UUID NOT NULL REFERENCES triggers(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    payload JSONB,
    result JSONB,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_triggers_chatflow_id ON triggers(chatflow_id);
CREATE INDEX IF NOT EXISTS idx_triggers_tenant_id ON triggers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_trigger_events_trigger_id ON trigger_events(trigger_id);

-- Add RLS policies
ALTER TABLE triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE trigger_events ENABLE ROW LEVEL SECURITY;

-- Create policies for multi-tenant access
CREATE POLICY tenant_isolation_triggers ON triggers
    USING (tenant_id = current_setting('app.current_tenant', TRUE));

CREATE POLICY tenant_isolation_trigger_events ON trigger_events
    USING (trigger_id IN (SELECT id FROM triggers WHERE tenant_id = current_setting('app.current_tenant', TRUE)));

-- Create function to set updated_at automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to update updated_at
CREATE TRIGGER update_triggers_updated_at
    BEFORE UPDATE ON triggers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();