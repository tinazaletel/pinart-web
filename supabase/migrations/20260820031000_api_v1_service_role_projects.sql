/*
  JAVNI BRALNI API v1 — manjkajoča pravica za service_role na `projects`.

  Migracija 20260722060000 je pravice za service_role naštela izrecno (ne
  "all tables in schema"), tabela public.projects pa je nastala pozneje
  (20260819100000) in je pravico dala samo vlogi `authenticated`. Posledica:
  /api/v1/projekti bi s service-role ključem dobil "permission denied for
  table projects", medtem ko bi /api/v1/stranke in /api/v1/racuni delovala —
  torej tiha, delna okvara.

  Javni API SAMO bere, zato tu damo samo `select`. Če bo kdaj obstajala pot,
  ki projekt zapiše prek service-role, naj se to zapiše z novo migracijo in
  zavestno.
*/

grant select on table public.projects to service_role;
