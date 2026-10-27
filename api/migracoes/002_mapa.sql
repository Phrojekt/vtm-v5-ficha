-- Mapa da crônica (o antigo Belmont Noturno): bairros, pontos, personagens,
-- vínculos, diário e cenas — tudo pertence a uma crônica. Os ids são texto,
-- iguais aos do Belmont, e os horários ficam em milissegundos (bigint), como o
-- front do mapa já espera.

alter table cronicas add column mapa_ativo boolean not null default false;
alter table cronicas add column mapa_atualizado_em bigint not null default 0;

create table mapa_bairros (
  cronica_id   uuid not null references cronicas(id) on delete cascade,
  id           text not null,
  name         text not null default '',
  sub          text not null default '',
  faction      text not null default 'neutral',
  blurb        text not null default '',
  domain       text not null default '',
  private_note text not null default '',
  masquerade   integer not null default 0,
  revealed     boolean not null default false,
  updated_at   bigint not null default 0,
  primary key (cronica_id, id)
);

create table mapa_pontos (
  cronica_id   uuid not null references cronicas(id) on delete cascade,
  id           text not null,
  name         text not null default '',
  icon         text not null default 'star',
  faction      text not null default 'neutral',
  type         text not null default 'outro',
  district     text not null default '',
  domain       text not null default '',
  blurb        text not null default '',
  x            double precision not null default 0,
  y            double precision not null default 0,
  private_note text not null default '',
  custom       boolean not null default false,
  revealed     boolean not null default false,
  updated_at   bigint not null default 0,
  primary key (cronica_id, id)
);

create table mapa_personagens (
  cronica_id   uuid not null references cronicas(id) on delete cascade,
  id           text not null,
  name         text not null,
  clan         text not null default '',
  faction      text not null default 'neutral',
  role         text not null default '',
  status       text not null default 'ativo',
  description  text not null default '',
  private_note text not null default '',
  hidden       boolean not null default false,
  revealed     boolean not null default false,
  -- a ficha completa do personagem (de NPC do mestre ou de um jogador)
  ficha_id     uuid references fichas(id) on delete set null,
  created_at   bigint not null default 0,
  updated_at   bigint not null default 0,
  primary key (cronica_id, id)
);

create table mapa_personagem_locais (
  cronica_id uuid not null,
  npc_id     text not null,
  poi_id     text not null,
  relation   text not null default 'dominio',
  primary key (cronica_id, npc_id, poi_id),
  foreign key (cronica_id, npc_id) references mapa_personagens(cronica_id, id) on delete cascade,
  foreign key (cronica_id, poi_id) references mapa_pontos(cronica_id, id) on delete cascade
);

create table mapa_eventos (
  cronica_id  uuid not null references cronicas(id) on delete cascade,
  id          text not null,
  target_type text not null,
  target_id   text not null,
  kind        text not null default 'note',
  session     text not null default '',
  body        text not null,
  visibility  text not null default 'public' check (visibility in ('public', 'private')),
  delta       integer,
  created_by  text not null default '',
  created_at  bigint not null default 0,
  primary key (cronica_id, id)
);
create index mapa_eventos_alvo_ix on mapa_eventos (cronica_id, target_type, target_id, created_at);

create table mapa_cenas (
  cronica_id uuid not null references cronicas(id) on delete cascade,
  id         text not null,
  name       text not null,
  x double precision, y double precision, w double precision, h double precision,
  created_by text not null default '',
  created_at bigint not null default 0,
  primary key (cronica_id, id)
);
