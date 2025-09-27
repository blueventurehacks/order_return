-- Companies
CREATE TABLE companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Customers
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id),
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    -- Consider a UNIQUE on (company_id, email) if needed in your domain
    -- UNIQUE (company_id, email)
    -- Indexes
    -- email is indexed below
    -- company_id is indexed below
);

CREATE INDEX ix_customers_company_id ON customers (company_id);
CREATE INDEX ix_customers_email ON customers (email);

-- Orders
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id),
    customer_id INT NOT NULL REFERENCES customers(id),
    order_number VARCHAR(64) NOT NULL,
    total_amount NUMERIC(10, 2),
    currency VARCHAR(3) DEFAULT 'USD' NOT NULL
);

CREATE INDEX ix_orders_company_id ON orders (company_id);
CREATE INDEX ix_orders_customer_id ON orders (customer_id);
CREATE INDEX ix_orders_order_number ON orders (order_number);

-- Order Status History
CREATE TABLE order_status_history (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    changed_by VARCHAR(50),
    notes TEXT
);

CREATE INDEX ix_order_status_history_order_id ON order_status_history (order_id);

-- Return Requests
CREATE TABLE return_requests (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id),
    order_id INT NOT NULL REFERENCES orders(id),
    reason TEXT,
    status VARCHAR(20) DEFAULT 'PENDING' NOT NULL,
    rma_code VARCHAR(32) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    -- Note: to keep updated_at in sync at the DB layer, add a trigger if required
);

CREATE INDEX ix_return_requests_company_id ON return_requests (company_id);
CREATE INDEX ix_return_requests_order_id ON return_requests (order_id);
CREATE INDEX ix_return_requests_rma_code ON return_requests (rma_code);

-- Return Items
CREATE TABLE return_items (
    id SERIAL PRIMARY KEY,
    return_request_id INT NOT NULL REFERENCES return_requests(id),
    sku VARCHAR(64) NOT NULL,
    quantity INT DEFAULT 1 NOT NULL,
    condition_note TEXT
);

CREATE INDEX ix_return_items_return_request_id ON return_items (return_request_id);

-- Shipments
CREATE TABLE shipments (
    id SERIAL PRIMARY KEY,
    return_request_id INT NOT NULL REFERENCES return_requests(id),
    carrier VARCHAR(64),
    tracking_number VARCHAR(64),
    label_url VARCHAR(512),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ix_shipments_return_request_id ON shipments (return_request_id);
CREATE INDEX ix_shipments_tracking_number ON shipments (tracking_number);

-- Refunds
CREATE TABLE refunds (
    id SERIAL PRIMARY KEY,
    return_request_id INT NOT NULL REFERENCES return_requests(id),
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD' NOT NULL,
    processed BOOLEAN DEFAULT FALSE NOT NULL,
    processed_at TIMESTAMP
);

CREATE INDEX ix_refunds_return_request_id ON refunds (return_request_id);

-- Fraud Reviews
CREATE TABLE fraud_reviews (
    id SERIAL PRIMARY KEY,
    return_request_id INT NOT NULL REFERENCES return_requests(id),
    risk_score INT DEFAULT 0 NOT NULL,
    notes TEXT,
    reviewed BOOLEAN DEFAULT FALSE NOT NULL
);

CREATE INDEX ix_fraud_reviews_return_request_id ON fraud_reviews (return_request_id);