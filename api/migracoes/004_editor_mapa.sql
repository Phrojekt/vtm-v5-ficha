-- 1) A Ilha do Zwart saiu da cidade base (agora é rio). Some também de cada crônica:
--    o bairro, o único ponto que ficava nela e o diário ligado aos dois.
delete from mapa_eventos where (target_type = 'district' and target_id = 'ilha-do-zwart')
                            or (target_type = 'poi' and target_id = 'ruinas-lazareto');
delete from mapa_pontos where id = 'ruinas-lazareto';
update mapa_pontos set district = '' where district = 'ilha-do-zwart';
delete from mapa_bairros where id = 'ilha-do-zwart';

-- 2) Editor de mapa.
--    Bairros: contorno desenhado no editor (null = o da cidade base) e posição do nome.
alter table mapa_bairros add column if not exists geom jsonb;
alter table mapa_bairros add column if not exists label_x double precision;
alter table mapa_bairros add column if not exists label_y double precision;
alter table mapa_bairros add column if not exists custom boolean not null default false;

--    Traços desenhados pelo mestre: ruas, áreas (água, parque…), pontes, muros e textos.
create table if not exists mapa_tracos (
  cronica_id uuid not null references cronicas(id) on delete cascade,
  id         text not null,
  kind       text not null,
  name       text not null default '',
  pts        jsonb not null,
  props      jsonb not null default '{}',
  revealed   boolean not null default true,
  ordem      bigint not null default 0,
  updated_at bigint not null default 0,
  primary key (cronica_id, id)
);

--    Elementos da cidade base apagados no editor (quadras, árvores, avenidas…), por chave.
alter table cronicas add column if not exists mapa_removidos jsonb not null default '[]';
