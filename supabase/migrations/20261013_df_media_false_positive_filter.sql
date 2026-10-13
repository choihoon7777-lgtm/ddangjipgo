
-- Eliminate confirmed keyword substring false positives without touching copyrighted content.
do $$
declare fn text;
begin
 fn:=pg_get_functiondef('public.df_media_ingest_ready()'::regprocedure);
 if position('if head !~ ' in fn)=0 then raise exception 'Parser changed; abort safe patch'; end if;
 fn:=replace(fn,
  'if head !~ ',
  'if head ~ ''(금융인재개발원|카페업계|아파트화재|아파트 화재|가족배려주차구획|노조 위한 통합|대만 증시)'' then continue; end if;'||E'\n    if head !~ ');
 execute fn;
end
$$;
revoke all on function public.df_media_ingest_ready() from public,anon,authenticated;
update public.df_media_leads
 set review_status='rejected',editor_note='자동 분류 정정: 개발·부동산·건설 기사와 직접적인 관련성이 낮음',reviewed_at=now()
 where review_status='candidate'
 and headline ~ '(금융인재개발원|카페업계|아파트화재|아파트 화재|가족배려주차구획|노조 위한 통합)';
