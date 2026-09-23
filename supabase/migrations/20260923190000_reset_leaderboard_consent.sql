-- Reset the ranking consent before the board is switched on (OA-20).
--
-- Why: `profiles.leaderboard_opt_in` has existed since Phase 2, and the checkbox that set it was
-- labelled with a narrower sentence than the one the owner approved on 2026-09-23. The board is
-- about to start publishing alias, avatar, level, XP and weekly practice volume to other signed-in
-- learners. Acting on a tick made against wording that did not name all of that would be consent in
-- form only, so every existing tick is cleared here and has to be given again under the current
-- sentence (`profile.hints.leaderboardOptIn`). Re-ticking it in /perfil takes one click and the
-- trigger from 20260923171000 dates it correctly.
--
-- This clears consent; it never grants it. Nobody loses progress, XP or a certificate.

update public.profiles
set leaderboard_opt_in = false
where leaderboard_opt_in;

-- The trigger added by 20260923171000_leaderboard_consent_and_gating stamps
-- `leaderboard_opt_in_at` on this change, so the opt-out itself is dated.
