-- Nove vrednosti morajo biti potrjene pred migracijo, ki jih uporablja v funkcijah.
alter type public.membership_role add value if not exists 'accounting';
alter type public.membership_role add value if not exists 'viewer';
