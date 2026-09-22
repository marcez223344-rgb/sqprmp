-- Fixes an ambiguity that only real Postgres rejects: record_attempt declares OUT columns
-- named attempts_count / genuine_attempts_count, so the unqualified references on the right-hand
-- side of the UPDATE resolved to both the OUT parameter and the table column
-- ("column reference \"attempts_count\" is ambiguous", SQLSTATE 42702), which made every exercise
-- submit fail. Non-destructive: the function body is replaced, the signature is unchanged.
create or replace function public.record_attempt(
  p_user_id uuid, p_exercise_id uuid, p_sql text, p_status text, p_feedback jsonb,
  p_execution_ms integer, p_row_count integer, p_is_genuine boolean
)
returns table (attempt_id uuid, first_completion boolean, attempts_count integer, genuine_attempts_count integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_attempt_id uuid;
  v_first boolean := false;
  v_prog public.exercise_progress%rowtype;
begin
  insert into public.attempts (user_id, exercise_id, sql, status, feedback, execution_ms, row_count, is_genuine)
  values (p_user_id, p_exercise_id, p_sql, p_status, coalesce(p_feedback, '[]'::jsonb), p_execution_ms, p_row_count, p_is_genuine)
  returning id into v_attempt_id;

  insert into public.exercise_progress (user_id, exercise_id) values (p_user_id, p_exercise_id)
  on conflict (user_id, exercise_id) do nothing;

  select * into v_prog from public.exercise_progress where user_id = p_user_id and exercise_id = p_exercise_id for update;
  if p_status = 'correct' and v_prog.status <> 'completed' then v_first := true; end if;

  update public.exercise_progress as ep set
    attempts_count = ep.attempts_count + 1,
    genuine_attempts_count = ep.genuine_attempts_count + (case when p_is_genuine then 1 else 0 end),
    status = case when p_status = 'correct' then 'completed' else ep.status end,
    first_completed_at = case when v_first then now() else ep.first_completed_at end,
    best_attempt_id = case when p_status = 'correct' and ep.best_attempt_id is null then v_attempt_id else ep.best_attempt_id end,
    last_activity_at = now()
  where ep.user_id = p_user_id and ep.exercise_id = p_exercise_id
  returning ep.* into v_prog;

  return query select v_attempt_id, v_first, v_prog.attempts_count, v_prog.genuine_attempts_count;
end;
$$;
revoke execute on function public.record_attempt(uuid, uuid, text, text, jsonb, integer, integer, boolean) from public, anon, authenticated;
grant execute on function public.record_attempt(uuid, uuid, text, text, jsonb, integer, integer, boolean) to service_role;
