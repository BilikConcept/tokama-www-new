-- Replace the temporary numeric Journal URLs with stable, descriptive slugs.
-- The application keeps permanent redirects from every old URL.
with slug_changes(old_slug, new_slug) as (
  values
    ('10', 'najciekawsze-wyspy-na-jezioraku'),
    ('11', 'sekrety-jezioraka'),
    ('12', 'rezerwaty-przyrody-w-okolicach-ilawy'),
    ('13', 'ptaki-nad-jeziorem-labedz'),
    ('14', 'romantyczny-weekend-nad-jeziorem'),
    ('15', 'wyspa-wielka-zulawa'),
    ('16', 'domki-przyjazne-zwierzetom'),
    ('17', 'wynajem-domku-na-prywatna-uroczystosc'),
    ('18', 'wedkarstwo-na-jezioraku-i-jeziorze-labedz'),
    ('19', 'zeglowanie-po-pojezierzu-ilawskim'),
    ('20', 'grzybobranie-na-pojezierzu-ilawskim'),
    ('21', 'sporty-wodne-na-pojezierzu-ilawskim')
)
update public.tokama_articles as article
set
  slug = changes.new_slug,
  seo = jsonb_set(
    coalesce(article.seo, '{}'::jsonb),
    '{canonical}',
    to_jsonb('/blog/' || changes.new_slug),
    true
  ),
  updated_at = now()
from slug_changes as changes
where article.slug = changes.old_slug;
