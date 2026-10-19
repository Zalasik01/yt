-- Identidade visual do canal: foto de perfil e banner gerados pela fábrica.
alter table channels
  add column if not exists avatar_path text,
  add column if not exists banner_path text;
