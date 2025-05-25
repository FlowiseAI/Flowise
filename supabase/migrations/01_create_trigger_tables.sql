-- Create triggers table
CREATE TABLE IF NOT EXISTS triggers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    chatflow_id UUID NOT NULL,
    config JSONB,
    is_active BOOLEAN DEFAULT true,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trigger_events table to log executions
CREATE TABLE IF NOT EXISTS trigger_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trigger_id UUID NOT NULL REFERENCES triggers(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    payload JSONB,
    result JSONB,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_triggers_chatflow_id ON triggers(chatflow_id);
CREATE INDEX IF NOT EXISTS idx_trigger_events_trigger_id ON trigger_events(trigger_id);
CREATE INDEX IF NOT EXISTS idx_triggers_type ON triggers(type);
CREATE INDEX IF NOT EXISTS idx_triggers_is_active ON triggers(is_active);

-- Create RLS policies for multi-tenant support
ALTER TABLE triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE trigger_events ENABLE ROW LEVEL SECURITY;

-- Create policy for triggers table
CREATE POLICY tenant_isolation_policy ON triggers
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Create policy for trigger_events table
CREATE POLICY tenant_isolation_policy ON trigger_events
    USING (trigger_id IN (
        SELECT id FROM triggers 
        WHERE tenant_id = current_setting('app.current_tenant_id', true)::UUID
    ));

-- Add tenant_id column to triggers table
ALTER TABLE triggers ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- Create function to automatically set updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_triggers_updated_at
BEFORE UPDATE ON triggers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trigger_events_updated_at
BEFORE UPDATE ON trigger_events
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();