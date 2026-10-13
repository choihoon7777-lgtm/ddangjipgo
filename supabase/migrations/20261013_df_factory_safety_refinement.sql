-- Strengthen publication criteria and deduplication of official documents.

do $$
declare
  definition text;
  old_condition text := 'and coalesce(r.raw_payload->>''attachment_text_extracted'',''true'')<>''false''';
  new_condition text := 'and coalesce(r.raw_payload->>''detail_ok'',''false'')=''true''
        and (coalesce(r.raw_payload->>''attachments_detected'',''false'')<>''true''
             or coalesce(r.raw_payload->>''attachment_text_extracted'',''false'')=''true'')';
  old_dedup text := 'and not exists(select 1 from public.df_articles a where a.source_document_id=d.id)';
  new_dedup text := 'and not exists(select 1 from public.df_articles a where a.source_document_id=d.id)
        and not exists(select 1 from public.df_articles a where a.original_source_url=d.source_url and coalesce(a.source_channel,'''')<>''investgo'')';
begin
  definition:=pg_get_functiondef('public.df_run_official_article_factory(integer)'::regprocedure);
  if position(old_condition in definition)=0 or position(old_dedup in definition)=0 then
    raise exception 'Factory source code unexpectedly changed; refusing unsafe patch';
  end if;
  definition:=replace(definition,old_condition,new_condition);
  definition:=replace(definition,old_dedup,new_dedup);
  execute definition;
end;
$$;
revoke all on function public.df_run_official_article_factory(integer) from public,anon,authenticated;
