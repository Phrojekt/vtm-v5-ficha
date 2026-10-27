-- Histórico legível: o que mudou em cada versão, calculado ao salvar
-- ({ itens: [{g, t}], mais, total, criada?, restaurada? }). Versões antigas
-- ficam com null e são preenchidas na primeira vez que alguém abre o histórico.
alter table ficha_versoes add column if not exists mudancas jsonb;
create index if not exists ficha_versoes_recentes_ix on ficha_versoes (criado_em desc);
