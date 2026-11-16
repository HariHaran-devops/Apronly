begin;

create or replace function public.respond_to_candidate_invitation(
  p_invitation_id uuid,
  p_response text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_candidate_id uuid;
  v_match_id uuid;
  v_status public.candidate_invitation_status;
  v_expires_at timestamptz;
  v_next_status public.candidate_match_status;
begin
  v_candidate_id := (select auth.uid());

  if v_candidate_id is null then
    raise exception 'Authentication required';
  end if;

  if p_response is null or p_response not in ('accepted', 'declined') then
    raise exception 'Response must be accepted or declined';
  end if;

  select i.match_id, i.status, i.expires_at
  into v_match_id, v_status, v_expires_at
  from public.candidate_opportunity_invitations i
  where i.id = p_invitation_id
    and i.candidate_id = v_candidate_id
  for update;

  if not found then
    raise exception 'Invitation not found';
  end if;

  if v_status <> 'pending' then
    raise exception 'This invitation has already been answered or closed';
  end if;

  if v_expires_at <= now() then
    update public.candidate_opportunity_invitations
    set status = 'expired'
    where id = p_invitation_id;

    update public.candidate_vacancy_matches
    set status = 'closed'
    where id = v_match_id;

    insert into public.candidate_recruitment_events (
      match_id,
      actor_id,
      event_type,
      metadata
    )
    values (
      v_match_id,
      v_candidate_id,
      'candidate_invitation_expired',
      jsonb_build_object('invitation_id', p_invitation_id)
    );

    return null;
  end if;

  update public.candidate_opportunity_invitations
  set
    status = p_response::public.candidate_invitation_status,
    responded_at = now()
  where id = p_invitation_id;

  if p_response = 'accepted' then
    v_next_status := 'accepted'::public.candidate_match_status;
  else
    v_next_status := 'declined'::public.candidate_match_status;
  end if;

  update public.candidate_vacancy_matches
  set status = v_next_status
  where id = v_match_id;

  insert into public.candidate_recruitment_events (
    match_id,
    actor_id,
    event_type,
    metadata
  )
  values (
    v_match_id,
    v_candidate_id,
    'candidate_invitation_' || p_response,
    '{}'::jsonb
  );

  return v_match_id;
end;
$$;

revoke all on function public.respond_to_candidate_invitation(uuid, text)
  from public, anon, authenticated;

grant execute on function public.respond_to_candidate_invitation(uuid, text)
  to authenticated;

commit;
