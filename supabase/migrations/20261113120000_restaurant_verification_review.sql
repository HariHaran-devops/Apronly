begin;

-- Add review lifecycle fields.
alter table public.restaurants
  add column if not exists review_status text,
  add column if not exists review_note text,
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz;

-- Preserve the existing state of restaurants before setting defaults.
update public.restaurants
set review_status = case
  when status = 'rejected'::public.restaurant_status
    or verification_status = 'rejected'::public.verification_status
    then 'rejected'
  when verification_status = 'verified'::public.verification_status
    then 'approved'
  else 'pending_review'
end
where review_status is null;

alter table public.restaurants
  alter column review_status set default 'pending_review',
  alter column review_status set not null;

alter table public.restaurants
  drop constraint if exists restaurants_review_status_check;

alter table public.restaurants
  add constraint restaurants_review_status_check
  check (
    review_status in (
      'pending_review',
      'changes_requested',
      'approved',
      'rejected'
    )
  );

alter table public.restaurants
  drop constraint if exists restaurants_review_note_length;

alter table public.restaurants
  add constraint restaurants_review_note_length
  check (review_note is null or char_length(review_note) <= 2000);

create index if not exists restaurants_review_queue_idx
  on public.restaurants (created_at asc)
  where review_status = 'pending_review';

-- Reset review when the restaurant business details are resubmitted.
create or replace function public.reset_restaurant_review_on_resubmit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.review_status = 'changes_requested'
     and old.status = 'pending'::public.restaurant_status
     and old.verification_status = 'unverified'::public.verification_status
     and (
       old.name is distinct from new.name
       or old.legal_name is distinct from new.legal_name
       or old.description is distinct from new.description
       or old.city is distinct from new.city
       or old.business_email is distinct from new.business_email
       or old.business_phone is distinct from new.business_phone
       or old.website_url is distinct from new.website_url
       or old.category is distinct from new.category
     ) then

    new.review_status := 'pending_review';
    new.review_note := null;
    new.reviewed_by := null;
    new.reviewed_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists restaurants_reset_review_on_resubmit
  on public.restaurants;

create trigger restaurants_reset_review_on_resubmit
before update of
  name,
  legal_name,
  description,
  city,
  business_email,
  business_phone,
  website_url,
  category
on public.restaurants
for each row
execute function public.reset_restaurant_review_on_resubmit();

-- Reset review when an outlet is changed during a requested correction.
create or replace function public.reset_restaurant_review_on_outlet_resubmit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_restaurant_id uuid;
begin
  if tg_op = 'DELETE' then
    v_restaurant_id := old.restaurant_id;
  else
    v_restaurant_id := new.restaurant_id;
  end if;

  update public.restaurants
  set
    review_status = 'pending_review',
    review_note = null,
    reviewed_by = null,
    reviewed_at = null
  where id = v_restaurant_id
    and review_status = 'changes_requested'
    and status = 'pending'::public.restaurant_status
    and verification_status = 'unverified'::public.verification_status;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists restaurant_outlet_reset_review_on_resubmit
  on public.restaurant_outlets;

create trigger restaurant_outlet_reset_review_on_resubmit
after insert or update or delete
on public.restaurant_outlets
for each row
execute function public.reset_restaurant_review_on_outlet_resubmit();

-- Secure administrator review function.
create or replace function public.review_restaurant_application(
  p_restaurant_id uuid,
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
  v_current_status public.restaurant_status;
  v_current_verification public.verification_status;
  v_review_status text;
  v_new_status public.restaurant_status;
  v_new_verification public.verification_status;
  v_note text;
begin
  v_admin_id := (select auth.uid());

  if v_admin_id is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_admin() then
    raise exception 'Administrator access required';
  end if;

  if p_restaurant_id is null then
    raise exception 'A restaurant application is required';
  end if;

  if p_decision is null
     or p_decision not in (
       'approved',
       'rejected',
       'changes_requested'
     ) then
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

  select status, verification_status, review_status
  into v_current_status, v_current_verification, v_review_status
  from public.restaurants
  where id = p_restaurant_id
  for update;

  if not found then
    raise exception 'Restaurant application not found';
  end if;

  if v_review_status <> 'pending_review' then
    raise exception 'Only applications pending review can receive a decision';
  end if;

  if v_current_status <> 'pending'::public.restaurant_status
     or v_current_verification <> 'unverified'::public.verification_status then
    raise exception 'Restaurant is not awaiting initial verification';
  end if;

  if p_decision = 'approved' then
    v_new_status := 'active'::public.restaurant_status;
    v_new_verification := 'verified'::public.verification_status;
  elsif p_decision = 'rejected' then
    v_new_status := 'rejected'::public.restaurant_status;
    v_new_verification := 'rejected'::public.verification_status;
  else
    v_new_status := 'pending'::public.restaurant_status;
    v_new_verification := 'unverified'::public.verification_status;
  end if;

  update public.restaurants
  set
    status = v_new_status,
    verification_status = v_new_verification,
    review_status = p_decision,
    review_note = v_note,
    reviewed_by = v_admin_id,
    reviewed_at = now()
  where id = p_restaurant_id;

  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    v_admin_id,
    'restaurant_application_' || p_decision,
    'restaurant',
    p_restaurant_id::text,
    jsonb_build_object(
      'previous_status', v_current_status,
      'previous_verification_status', v_current_verification,
      'new_status', v_new_status,
      'new_verification_status', v_new_verification,
      'review_note', v_note
    )
  );

  return p_restaurant_id;
end;
$$;

revoke all on function public.review_restaurant_application(uuid, text, text)
  from public, anon, authenticated;

grant execute on function public.review_restaurant_application(uuid, text, text)
  to authenticated;

commit;
