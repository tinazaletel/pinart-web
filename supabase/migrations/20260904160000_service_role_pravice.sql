-- PRAVICE STREŽNIŠKE VLOGE ZA VSE TABELE
--
-- V tem projektu tabele, ustvarjene prek SQL urejevalnika, ne dobijo
-- samodejno pravic za service_role: 4. 9. 2026 je »permission denied« ustavil
-- najprej vprašalnik o cenah, nato izvoz podatkov (private_time_entries,
-- presence_entries, user_data_requests, chat_participant, chat_thread,
-- chat_message). Strežnik (service_role) mora videti vse tabele — RLS ga tako
-- ali tako obide; anon in authenticated tu NE dobita ničesar.
-- Varno za ponovni zagon.

grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
alter default privileges in schema public grant all privileges on tables to service_role;
alter default privileges in schema public grant all privileges on sequences to service_role;
