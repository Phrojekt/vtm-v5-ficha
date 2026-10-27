-- Rode uma vez no Postgres da VPS, como superusuário:
--   docker exec -i <container do postgres> psql -U postgres < criar-banco.sql
-- Troque a senha antes. O banco e o usuário são só da ficha: não enxergam o Precifa.
create role fichas login password 'TROQUE_ESTA_SENHA';
create database fichas owner fichas;
revoke all on database fichas from public;
