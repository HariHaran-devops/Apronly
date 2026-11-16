begin;

-- Apronly: secure admin review workflow for restaurant hiring requests.

alter table public.restaurant_hiring_requests
  add column if not exists review_note text,
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz;

alter table public.restaurant_hiring_requests
  drop constraint if exists restaurant_hiring_requests_review_note_length;

alter table public.restaurant_hiring_requests
  add constraint restaurant_hiring_requests_review_note_length
  check (review_note is null or char_length(review_note) <= 2000);

create index if not exists restaurant_hiring_requests_review_queue_idx
  on public.restaurant_hiring_requests (created_at asc)
  where status = 'pending_review'::public.hiring_request_status;

-- Clear a previous decision whenever a restaurant resubmits a request.
create or replace function public.reset_hiring_request_review_on_resubmit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status is distinct from new.status
     and new.status = 'pending_review'::public.hiring_request_status then
    new.review_note := null;
    new.reviewed_by := null;
    new.reviewed_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists restaurant_hiring_request_reset_review
  on public.restaurant_hiring_requests;

create trigger restaurant_hiring_request_reset_review
before update of status on public.restaurant_hiring_requests
for each row
execute function public.reset_hiring_request_review_on_resubmit();

-- Only an authenticated Apronly admin may review a submitted request.
-- Requests can only be reviewed while they are pending_review.
create or replace function public.review_restaurant_hiring_request(
  p_request_id uuid,
  p_decision text,
  p_review_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid;
  v_current_status public.hiring_request_status;
  v_new_status public.hiring_request_status;
  v_note text;
begin
  v_admin_id := (select auth.uid());

  if v_admin_id is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_admin() then
    raise exception 'Administrator access required';
  end if;

  if p_request_id is null then
    raise exception 'A hiring request is required';
  end if;

  if p_decision not in ('approved', 'rejected', 'changes_requested') then
    raise exception 'Invalid review decision';
  end if;

  v_note := nullif(btrim(coalesce(p_review_note, '')), '');

  if p_decision in ('rejected', 'changes_requested')
     and (v_note is null or char_length(v_note) < 10) then
    raise exception 'Provide a review reason of at least 10 characters';
  end if;

  if v_note is not null and char_length(v_note) > 2000 then
    raise exception 'Review note must not exceed 2000 characters';
  end if;

  v_new_status := p_decision::public.hiring_request_status;

  select status
    into v_current_status
  from public.restaurant_hiring_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Hiring request not found';
  end if;

  if v_current_status <> 'pending_review'::public.hiring_request_status then
    raise exception 'Only requests pending review can receive a decision';
  end if;

  update public.restaurant_hiring_requests
  set
    status = v_new_status,
    review_note = v_note,
    reviewed_by = v_admin_id,
    reviewed_at = now()
  where id = p_request_id;

  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    v_admin_id,
    'restaurant_hiring_request_' || p_decision,
    'restaurant_hiring_request',
    p_request_id::text,
    jsonb_build_object(
      'previous_status', v_current_status,
      'new_status', v_new_status,
      'review_note', v_note
    )
  );

  return p_request_id;
end;
$$;

revoke all on function public.review_restaurant_hiring_request(uuid, text, text)
  from public, anon, authenticated;

grant execute on function public.review_restaurant_hiring_request(uuid, text, text)
  to authenticated;

commit;

