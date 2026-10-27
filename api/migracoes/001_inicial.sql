-- Ficha de Sangue — esquema inicial
-- gen_random_uuid() é nativo do Postgres 13+; não precisa de extensão.

create table usuarios (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  nome        text not null default '',
  senha_hash  text not null,
  criado_em   timestamptz not null default now()
);
create unique index usuarios_email_uk on usuarios (lower(email));

-- O token de sessão nunca é guardado: só o sha256 dele.
create table sessoes (
  token_hash  bytea primary key,
  usuario_id  uuid not null references usuarios(id) on delete cascade,
  criado_em   timestamptz not null default now(),
  usado_em    timestamptz not null default now(),
  expira_em   timestamptz not null
);
create index sessoes_usuario_ix on sessoes (usuario_id);

create table cronicas (
  id             uuid primary key default gen_random_uuid(),
  nome           text not null,
  descricao      text not null default '',
  narrador_id    uuid not null references usuarios(id) on delete cascade,
  codigo_convite text not null unique,
  criado_em      timestamptz not null default now()
);

create table cronica_membros (
  cronica_id  uuid not null references cronicas(id) on delete cascade,
  usuario_id  uuid not null references usuarios(id) on delete cascade,
  papel       text not null check (papel in ('narrador', 'jogador')),
  entrou_em   timestamptz not null default now(),
  primary key (cronica_id, usuario_id)
);
create index cronica_membros_usuario_ix on cronica_membros (usuario_id);

-- O id da ficha pode vir do navegador: assim uma ficha criada offline
-- já nasce com o id definitivo e a sincronização não precisa remapear nada.
create table fichas (
  id            uuid primary key,
  dono_id       uuid not null references usuarios(id) on delete cascade,
  cronica_id    uuid references cronicas(id) on delete set null,
  nome          text not null default '',
  sistema       text not null default 'vampiro',
  resumo        jsonb not null default '{}',
  dados         jsonb not null,
  versao        integer not null default 1,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  excluida_em   timestamptz
);
create index fichas_dono_ix on fichas (dono_id, atualizado_em);
create index fichas_cronica_ix on fichas (cronica_id) where excluida_em is null;

-- Histórico. Salvamentos seguidos do mesmo autor em poucos minutos
-- reaproveitam a última linha (o salvamento automático não vira enxurrada);
-- versões com rótulo nunca são reaproveitadas nem podadas.
create table ficha_versoes (
  ficha_id   uuid not null references fichas(id) on delete cascade,
  versao     integer not null,
  dados      jsonb not null,
  autor_id   uuid references usuarios(id) on delete set null,
  rotulo     text,
  criado_em  timestamptz not null default now(),
  primary key (ficha_id, versao)
);

create table compartilhamentos (
  token        text primary key,
  ficha_id     uuid not null references fichas(id) on delete cascade,
  criado_por   uuid not null references usuarios(id) on delete cascade,
  criado_em    timestamptz not null default now(),
  revogado_em  timestamptz
);
create index compartilhamentos_ficha_ix on compartilhamentos (ficha_id);
