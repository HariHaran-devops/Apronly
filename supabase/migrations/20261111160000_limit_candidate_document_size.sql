-- ============================================================
-- APRONLY: LIMIT CANDIDATE DOCUMENT UPLOAD SIZE
-- Maximum file size: 1,000,000 bytes (1 MB)
-- ============================================================

do $$
declare
    updated_rows integer;
begin
    update storage.buckets
    set file_size_limit = 1000000
    where id = 'candidate-documents';

    get diagnostics updated_rows = row_count;

    if updated_rows = 0 then
        raise exception 'candidate-documents bucket was not found';
    end if;
end;
$$;

-- ============================================================
-- END OF MIGRATION
-- ============================================================