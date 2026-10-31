// Fields a CSV column can be mapped to when importing contacts or leads, with
// header names we recognise automatically (compared lowercase, ignoring spaces,
// dashes and underscores). Custom fields are added at runtime as "cf:<key>".

export type ImportTarget = "contacts" | "leads";
export type ImportField = { key: string; label: string; aliases: string[] };

const PERSON: ImportField[] = [
  { key: "first_name", label: "First name", aliases: ["firstname", "first", "givenname", "fname"] },
  { key: "last_name", label: "Last name", aliases: ["lastname", "last", "surname", "familyname", "lname"] },
  { key: "full_name", label: "Full name (split into first/last)", aliases: ["name", "fullname", "contactname", "contact"] },
  { key: "email", label: "Email", aliases: ["email", "emailaddress", "e-mail", "mail", "workemail"] },
  { key: "phone", label: "Phone", aliases: ["phone", "phonenumber", "telephone", "tel", "workphone", "businessphone"] },
  { key: "mobile_phone", label: "Mobile phone", aliases: ["mobile", "mobilephone", "cell", "cellphone"] },
  { key: "job_title", label: "Job title", aliases: ["title", "jobtitle", "position", "role"] },
  { key: "company_name", label: "Company", aliases: ["company", "companyname", "organization", "organisation", "account", "business"] },
  { key: "linkedin_url", label: "LinkedIn", aliases: ["linkedin", "linkedinurl", "linkedinprofile"] },
  { key: "website", label: "Website", aliases: ["website", "url", "web", "site"] },
  { key: "secondary_email", label: "Second email", aliases: ["secondaryemail", "email2", "otheremail", "personalemail"] },
  { key: "facebook_url", label: "Facebook", aliases: ["facebook"] },
  { key: "instagram_url", label: "Instagram", aliases: ["instagram"] },
  { key: "x_url", label: "X (Twitter)", aliases: ["twitter", "x"] },
  { key: "address_line1", label: "Street address", aliases: ["address", "street", "address1", "addressline1", "streetaddress"] },
  { key: "address_line2", label: "Address line 2", aliases: ["address2", "addressline2", "suite", "apt"] },
  { key: "city", label: "City", aliases: ["city", "town"] },
  { key: "region", label: "State / region", aliases: ["state", "region", "province", "county"] },
  { key: "postal_code", label: "Postal code", aliases: ["zip", "zipcode", "postalcode", "postcode"] },
  { key: "country", label: "Country", aliases: ["country"] },
  { key: "source_detail", label: "Source detail", aliases: ["sourcedetail", "campaign", "referrer"] },
  { key: "notes", label: "Notes", aliases: ["notes", "note", "comments", "description"] },
];

export const IMPORT_FIELDS: Record<ImportTarget, ImportField[]> = {
  contacts: PERSON,
  leads: [...PERSON, { key: "source", label: "Source", aliases: ["source", "leadsource"] }],
};

const norm = (s: string) => s.toLowerCase().replace(/[\s_\-.]/g, "");

// Best guess field for each CSV header ("" = don't import). Each field is used at most once.
export function guessMapping(headers: string[], fields: ImportField[], custom: { key: string; label: string }[]): string[] {
  const used = new Set<string>();
  return headers.map((h) => {
    const n = norm(h);
    const hit =
      fields.find((f) => !used.has(f.key) && (norm(f.label) === n || f.aliases.some((a) => norm(a) === n))) ??
      custom.map((c) => ({ key: `cf:${c.key}`, label: c.label })).find((c) => !used.has(c.key) && norm(c.label) === n);
    if (!hit) return "";
    used.add(hit.key);
    return hit.key;
  });
}
