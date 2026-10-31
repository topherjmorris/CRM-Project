"use client";

// Company + contact pickers for linking a task. Pick a company first and the
// contact list narrows to that company's people. Picking a contact while no
// company is chosen fills in the contact's company. Submits `company_id` and
// `contact_id` with the surrounding form.

import { useState } from "react";
import type { ContactOption } from "@/lib/contacts";

type Option = { id: string; label: string };
type Props = {
  companies?: Option[];
  contacts?: ContactOption[];
  defaultCompanyId?: string | null;
  defaultContactId?: string | null;
  // Form layout: inline row (quick add) or labelled fields (task editor).
  labelled?: boolean;
};

const selectClass = "h-8 min-w-0 max-w-full rounded-lg border border-input bg-transparent px-2 text-sm";

export function CompanyContactPicker({ companies, contacts, defaultCompanyId, defaultContactId, labelled }: Props) {
  const [companyId, setCompanyId] = useState(defaultCompanyId ?? "");
  const [contactId, setContactId] = useState(defaultContactId ?? "");
  const visibleContacts = companyId && contacts ? contacts.filter((c) => c.companyId === companyId) : (contacts ?? []);

  const companySelect = companies && (
    <select
      id="company_id"
      name="company_id"
      value={companyId}
      aria-label="Company"
      className={selectClass}
      onChange={(e) => {
        setCompanyId(e.target.value);
        // Drop a chosen contact who doesn't work at the newly chosen company.
        const current = contacts?.find((c) => c.id === contactId);
        if (e.target.value && current && current.companyId !== e.target.value) setContactId("");
      }}
    >
      <option value="">Select company</option>
      {companies.map((c) => (
        <option key={c.id} value={c.id}>{c.label}</option>
      ))}
    </select>
  );

  const contactSelect = contacts && (
    <select
      id="contact_id"
      name="contact_id"
      value={contactId}
      aria-label="Contact"
      className={selectClass}
      onChange={(e) => {
        setContactId(e.target.value);
        const picked = contacts.find((c) => c.id === e.target.value);
        if (companies && !companyId && picked?.companyId) setCompanyId(picked.companyId);
      }}
    >
      <option value="">{companyId && !visibleContacts.length ? "No contacts at this company" : "Select contact"}</option>
      {visibleContacts.map((c) => (
        <option key={c.id} value={c.id}>{c.label}</option>
      ))}
    </select>
  );

  if (!labelled) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {companySelect}
        {contactSelect}
      </div>
    );
  }
  return (
    <>
      {companySelect && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="company_id" className="text-sm font-medium">Company</label>
          {companySelect}
        </div>
      )}
      {contactSelect && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="contact_id" className="text-sm font-medium">Contact</label>
          {contactSelect}
        </div>
      )}
    </>
  );
}
