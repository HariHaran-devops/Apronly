-- Keep database document metadata validation aligned with
-- the candidate-documents Storage bucket limit of 1 MB.

alter table public.candidate_documents
  drop constraint if exists candidate_document_file_size;

alter table public.candidate_documents
  add constraint candidate_document_file_size
  check (file_size_bytes between 1 and 1000000);