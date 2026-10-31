-- CRM-06: more detail on companies: type, annual revenue range, social links and
-- a mailing address. Types and revenue ranges are fixed lists for now (the app
-- shows labels; see lib/companies.ts). Edits are logged on the timeline by the
-- existing log_record_updated trigger.

alter table public.companies
  add column company_type text check (company_type in ('prospect', 'customer', 'partner', 'vendor', 'competitor', 'other')),
  add column annual_revenue text check (annual_revenue in ('<1m', '1-5m', '5-25m', '25-100m', '100m+')),
  add column linkedin_url text check (linkedin_url is null or linkedin_url ~* '^https?://'),
  add column facebook_url text check (facebook_url is null or facebook_url ~* '^https?://'),
  add column instagram_url text check (instagram_url is null or instagram_url ~* '^https?://'),
  add column x_url text check (x_url is null or x_url ~* '^https?://'),
  add column address_line1 text check (char_length(address_line1) <= 200),
  add column address_line2 text check (char_length(address_line2) <= 200),
  add column city text check (char_length(city) <= 100),
  add column region text check (char_length(region) <= 100),
  add column postal_code text check (char_length(postal_code) <= 20),
  add column country text check (char_length(country) <= 100);

create index companies_type_idx on public.companies (workspace_id, company_type);
