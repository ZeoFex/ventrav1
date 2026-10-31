CREATE TABLE IF NOT EXISTS shop_conversations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
    customer_order_id uuid NOT NULL REFERENCES customer_orders(id) ON DELETE CASCADE,
    shopper_id uuid NOT NULL REFERENCES shoppers(id) ON DELETE CASCADE,
    invoice_id varchar(50) NOT NULL,
    shop_name varchar(255) NOT NULL,
    customer_name varchar(255) NOT NULL,
    customer_phone varchar(30) NOT NULL,
    customer_region varchar(100) NOT NULL,
    total_ghs varchar(20) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shop_conversations_business_id_idx ON shop_conversations (business_id);
CREATE INDEX IF NOT EXISTS shop_conversations_shopper_id_idx ON shop_conversations (shopper_id);
CREATE INDEX IF NOT EXISTS shop_conversations_order_id_idx ON shop_conversations (customer_order_id);

CREATE TABLE IF NOT EXISTS shop_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid NOT NULL REFERENCES shop_conversations(id) ON DELETE CASCADE,
    sender varchar(16) NOT NULL,
    sender_name varchar(255) NOT NULL,
    body text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shop_messages_conversation_id_idx ON shop_messages (conversation_id);
