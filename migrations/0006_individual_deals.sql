ALTER TABLE bets ADD COLUMN legacy_agreement text;
-- Preserve historical collective terms without converting a shared sum into many debts.
UPDATE bets b SET legacy_agreement=b.stake WHERE b.phase='locked' OR (
 EXISTS(SELECT 1 FROM members m WHERE m.bet_id=b.id AND m.side='for') AND
 EXISTS(SELECT 1 FROM members m WHERE m.bet_id=b.id AND m.side='against') AND
 NOT EXISTS(SELECT 1 FROM members m WHERE m.bet_id=b.id AND NOT EXISTS(
 SELECT 1 FROM acceptances a WHERE a.bet_id=b.id AND a.person_id=m.person_id AND a.revision=b.revision AND a.accepted=true)));
ALTER TABLE bets ADD COLUMN legacy_members text;
UPDATE bets b SET legacy_members=(SELECT COALESCE(json_agg(m.person_id),'[]'::json)::text FROM members m WHERE m.bet_id=b.id) WHERE legacy_agreement IS NOT NULL;
CREATE TABLE deals (
 id text PRIMARY KEY, bet_id text NOT NULL REFERENCES bets(id) ON DELETE CASCADE,
 proposer_id text NOT NULL REFERENCES participants(id), recipient_id text NOT NULL REFERENCES participants(id),
 stake text NOT NULL, status text NOT NULL CHECK(status IN ('pending','accepted','rejected','withdrawn','superseded')),
 replaces_id text REFERENCES deals(id), created text NOT NULL, decided text,
 CHECK(proposer_id<>recipient_id)
);
CREATE UNIQUE INDEX one_accepted_pair ON deals(bet_id,LEAST(proposer_id,recipient_id),GREATEST(proposer_id,recipient_id)) WHERE status='accepted';
CREATE UNIQUE INDEX one_pending_pair ON deals(bet_id,LEAST(proposer_id,recipient_id),GREATEST(proposer_id,recipient_id)) WHERE status='pending';
