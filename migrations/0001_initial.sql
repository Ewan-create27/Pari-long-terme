CREATE TABLE groups(id text PRIMARY KEY, name text NOT NULL);
CREATE TABLE participants(
 id text PRIMARY KEY, group_id text NOT NULL REFERENCES groups(id), name text NOT NULL,
 avatar text NOT NULL, color text NOT NULL, archived integer NOT NULL DEFAULT 0, demo integer NOT NULL DEFAULT 0
);
CREATE TABLE bets(
 id text PRIMARY KEY, group_id text NOT NULL REFERENCES groups(id), title text NOT NULL,
 description text NOT NULL, deadline text, stake text NOT NULL, status text NOT NULL DEFAULT 'active',
 result text, comment text, created text NOT NULL, closed text, demo integer NOT NULL DEFAULT 0,
 icon text, archived_at text,
 CHECK (status IN ('active','closed','archived'))
);
CREATE TABLE members(
 id text PRIMARY KEY, bet_id text NOT NULL REFERENCES bets(id), person_id text NOT NULL REFERENCES participants(id),
 side text NOT NULL CHECK (side IN ('for','against')), UNIQUE(bet_id,person_id)
);
CREATE TABLE reminders(
 id text PRIMARY KEY, bet_id text NOT NULL REFERENCES bets(id), next text NOT NULL,
 frequency text NOT NULL, timezone text NOT NULL, anchor text NOT NULL,
 active integer NOT NULL DEFAULT 1, lease text, attempts integer NOT NULL DEFAULT 0
);
CREATE INDEX idx_reminders_due ON reminders(active,next);
CREATE TABLE events(id text PRIMARY KEY, bet_id text NOT NULL REFERENCES bets(id), at text NOT NULL, text text NOT NULL);
CREATE TABLE deliveries(id text PRIMARY KEY, reminder_id text NOT NULL, subscription_id text NOT NULL, occurrence text NOT NULL, sent text NOT NULL);
CREATE TABLE settings(key text PRIMARY KEY, value text NOT NULL);
CREATE TABLE subscriptions(id text PRIMARY KEY, endpoint text NOT NULL UNIQUE, data text NOT NULL, created text NOT NULL);
CREATE TABLE avatars(key text PRIMARY KEY, bytes bytea NOT NULL CHECK (octet_length(bytes)<=250000), created text NOT NULL);
CREATE TABLE _sessions(hash text PRIMARY KEY, expires bigint NOT NULL, fingerprint text NOT NULL);
CREATE INDEX idx_session_expiry ON _sessions(expires);
