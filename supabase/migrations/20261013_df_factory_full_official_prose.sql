-- Full-text article output: do not cut verified source paragraphs to 1,800 / 14,000 chars.
-- Keep existing source-verification and editorial-publication gates unchanged.
do $$
declare
  def text;
begin
  def:=pg_get_functiondef('public.df_run_official_article_factory(integer)'::regprocedure);
  if position('left(v_key,1800)' in def)=0 or position('left(r.content_text,14000)' in def)=0 then
    raise exception 'Factory definition changed: refuse unsafe patch';
  end if;
  def:=replace(def,'left(v_key,1800)','v_key');
  def:=replace(def,'left(r.content_text,14000)','r.content_text');
  execute def;
end
$$;
revoke all on function public.df_run_official_article_factory(integer) from public,anon,authenticated;
