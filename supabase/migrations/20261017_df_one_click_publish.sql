-- One-tap newsroom publishing. Only authenticated administrators may call this
-- endpoint; source validation and duplicate checks occur server-side.
-- Complete, low-risk official PRESS RELEASES can pass verified checks in one
-- transaction; missing attachments, draft laws, notices or sensitive stories
-- must continue through the existing explicit editorial review.
create or replace function public.df_publish_article_one_click(
 p_article_id uuid,
 p_dry_run boolean default false
) returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  v_article public.df_articles;
  v_queue public.df_editorial_queue;
  v_doc public.df_source_documents;
  v_official boolean := false;
  v_text text;
  v_manual_ready boolean;
  v_reason text;
  v_actor uuid := auth.uid();
begin
  if not public.df_is_admin() or (auth.role()<>'service_role' and v_actor is null) then
    raise exception '관리자 로그인 후 발행할 수 있습니다.';
  end if;
  if p_article_id is null then raise exception '기사 번호가 필요합니다.'; end if;

  select * into v_article from public.df_articles where id=p_article_id for update;
  if v_article.id is null then raise exception '기사를 찾을 수 없습니다.'; end if;
  if v_article.status in ('published','corrected') then
    return jsonb_build_object('published',true,'already_published',true,'article_id',v_article.id,'title',v_article.title,'status',v_article.status);
  end if;
  if v_article.status not in ('review','draft','approved') or v_article.risk_level='red' then
    return jsonb_build_object('published',false,'reason','보류·반려 또는 위험등급 차단 상태입니다. 편집 검토가 필요합니다.');
  end if;
  if v_article.scheduled_at is not null then
    return jsonb_build_object('published',false,'reason','예약된 기사입니다. 예약을 취소한 후 발행하세요.');
  end if;

  select * into v_queue from public.df_editorial_queue
    where article_id=p_article_id for update;
  if v_queue.article_id is null or v_queue.reviewed_at is not null then
    return jsonb_build_object('published',false,'reason','검토 대상에 없는 기사입니다.');
  end if;
  if v_queue.legal_check_status='blocked' then
    return jsonb_build_object('published',false,'reason','법적 검토로 차단된 기사입니다.');
  end if;

  v_manual_ready := v_article.risk_level='green'
    and v_queue.legal_check_status='passed'
    and coalesce(v_queue.fact_check_passed,false)
    and coalesce(v_queue.numeric_check_passed,false)
    and coalesce(v_queue.date_check_passed,false)
    and coalesce(v_queue.source_check_passed,false)
    and coalesce(v_queue.duplicate_check_passed,false);

  if not v_manual_ready then
    -- Auto-validation is STRICT: complete first-party press material only.
    -- Notices, legislative drafts, interpretative editorials, rights issues,
    -- source-date discrepancies and abbreviated materials never self-approve.
    if v_article.source_channel<>'보도자료'
       or v_article.source_document_id is null then
      v_reason:='공식자료 본문 또는 법적 내용에 대한 확인이 필요합니다.';
    else
      select d.* into v_doc from public.df_source_documents d
        join public.df_sources s on s.id=d.source_id
        where d.id=v_article.source_document_id and s.source_type='official';
      if v_doc.id is null or v_doc.verification_status<>'verified'
        or v_doc.detail_status<>'complete'
        or v_doc.published_at is null or v_doc.published_at>now()
        or length(trim(coalesce(v_doc.content_text,'')))<420
        or length(trim(coalesce(v_doc.key_content,'')))<140
        or v_doc.raw_payload->>'detail_ok' is distinct from 'true'
        or coalesce(v_doc.raw_payload->>'needs_detail_fetch','false')='true'
        or coalesce(v_doc.raw_payload->>'attachments_detected','false')='true'
        or coalesce(v_doc.raw_payload->>'rights_requires_review','false')='true'
        or coalesce(v_doc.raw_payload->>'manual_review_required','false')='true'
        or coalesce(v_doc.raw_payload->>'public_hidden','false')='true'
        or coalesce(v_doc.raw_payload->>'auto_hidden','false')='true'
        or coalesce(v_doc.raw_payload->>'source_change_candidate','false')='true'
        or coalesce(v_doc.raw_payload->>'feed_excerpt_only','false')='true'
        or v_article.original_source_url is distinct from v_doc.source_url
        or v_article.original_source_published_at is distinct from v_doc.published_at
        or v_article.title is distinct from v_doc.title
        or v_article.risk_level not in ('yellow','green')
        or v_article.title ~ '(의혹|고발|고소|소송|형사|사망|사고|개인정보|행정처분|정정|입법예고)'
        or v_doc.source_url !~ '^https://[^[:space:]]+'
        or v_doc.source_url ~ '(#view/|MediaList.do|/lst[.]jsp)'
        then
        v_reason:='공식 원문 전문·출처·게시일 또는 첨부파일 확인이 필요합니다.';
      else
        v_text:=coalesce(v_article.body#>>'{0}','');
        if length(v_text)<650
          or strpos(v_text,left(trim(v_doc.content_text),180))=0
          or strpos(v_text,left(trim(v_doc.key_content),70))=0 then
          v_reason:='기사 내용과 공식자료의 일치 여부를 확인해야 합니다.';
        elsif not exists(
          select 1 from public.df_article_sources s
          where s.article_id=p_article_id and s.document_id=v_doc.id
        ) then
          v_reason:='검증된 공식 원문 연결이 없습니다.';
        elsif exists(
          select 1 from public.df_articles other
          where other.id<>p_article_id
          and other.status in ('published','corrected')
          and (
            other.source_document_id=v_doc.id
            or other.original_source_url=v_doc.source_url
            or (other.title=v_article.title and other.source_channel<>'investgo')
          )
        ) then
          v_reason:='이미 발행된 동일 원문 또는 중복 기사입니다.';
        else
          v_official:=true;
        end if;
      end if;
    end if;
    if not v_official then
      return jsonb_build_object('published',false,'reason',coalesce(v_reason,'발행 전 검토가 필요합니다.'),'article_id',p_article_id);
    end if;
  end if;

  if p_dry_run then
    return jsonb_build_object('published',false,'publishable',true,'article_id',p_article_id,'mode',case when v_manual_ready then 'editor_checked' else 'official_verified' end);
  end if;
  if v_official then
    update public.df_editorial_queue
      set fact_check_passed=true,
          numeric_check_passed=true,
          date_check_passed=true,
          source_check_passed=true,
          duplicate_check_passed=true,
          legal_check_status='passed',
          ai_verification=concat_ws(E'\n',nullif(ai_verification,''),'공식 원문 전문·핵심내용 일치, 게시일, 출처, 중복 및 첨부 유무를 서버에서 확인했습니다.')
      where article_id=p_article_id;
    update public.df_articles set risk_level='green',updated_at=now() where id=p_article_id;
  end if;

  -- Keep the existing authoritative publisher for atomic status, audit log,
  -- reviewed_at, land alerts and published timestamp. No direct status write.
  v_article:=public.df_publish_article(p_article_id,v_actor);
  if v_article.status not in ('published','corrected') then
    raise exception '발행 저장에 실패했습니다.';
  end if;
  return jsonb_build_object('published',true,'article_id',v_article.id,'title',v_article.title,'status',v_article.status,'published_at',v_article.published_at);
end
$function$;

revoke all on function public.df_publish_article_one_click(uuid,boolean) from public,anon;
grant execute on function public.df_publish_article_one_click(uuid,boolean) to authenticated,service_role;
comment on function public.df_publish_article_one_click(uuid,boolean) is
 'Authenticated newsroom one-tap publish; automatic gates cover verified complete low-risk press releases only. Scheduled, partial, duplicate and sensitive content remain blocked.';
