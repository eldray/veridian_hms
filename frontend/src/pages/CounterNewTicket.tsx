// src/pages/CounterNewTicket.tsx
//
// Opening a counter ticket is the entry page of the counter, not a modal: the desk names
// the customer, and the ticket page it lands on is where selling, ordering and billing
// happen. A walk-in gives a name and maybe an age or phone — nothing is invented for them,
// so no folder number or date of birth is fabricated here.
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../store/toastStore';
import { AlertCircle, ArrowLeft, Store, UserPlus } from 'lucide-react';
import { Button, cn, INPUT, PageHeader } from '../components/ui';
import { createCounterTicket, searchCounterClients, searchCounterPatients } from '../api';
import { describeApiError } from '../utils/apiError';
import { identityOf, shell, unwrap } from '../utils/counterTicket';

type IdentityMode = 'new' | 'existing' | 'patient';

const MODES: Array<[IdentityMode, string]> = [['new', 'New name'], ['existing', 'Returning'], ['patient', 'Registered patient']];

export default function CounterNewTicket() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [identityMode, setIdentityMode] = useState<IdentityMode>('new');
  const [form, setForm] = useState({ name: '', ageYears: '', phone: '', reason: '' });
  const [clientSearch, setClientSearch] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [clientMatches, setClientMatches] = useState<any[]>([]);
  const [patientMatches, setPatientMatches] = useState<any[]>([]);
  const [chosenClient, setChosenClient] = useState<any | null>(null);
  const [chosenPatient, setChosenPatient] = useState<any | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // A swallowed search failure would read as "nobody of that name exists" and send the desk
  // into creating a second identity for a customer who already has one.
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (identityMode === 'existing' && clientSearch.trim().length >= 2) {
        try {
          setClientMatches(unwrap(await searchCounterClients(clientSearch.trim())));
          setSearchError(null);
        } catch (err: any) {
          setClientMatches([]);
          setSearchError(describeApiError(err, 'The counter book could not be searched.'));
        }
      }
      if (identityMode === 'patient' && patientSearch.trim().length >= 2) {
        try {
          setPatientMatches(unwrap(await searchCounterPatients(patientSearch.trim())));
          setSearchError(null);
        } catch (err: any) {
          setPatientMatches([]);
          setSearchError(describeApiError(err, 'The patient register could not be searched.'));
        }
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [clientSearch, patientSearch, identityMode]);

  const submit = useCallback(async () => {
    const payload: any = { reason: form.reason.trim() || undefined };
    if (identityMode === 'new') {
      if (!form.name.trim()) { toastError('A name is required', 'Type the customer name before opening the ticket.'); return; }
      const age = form.ageYears.trim();
      if (age !== '' && (!Number.isSafeInteger(Number(age)) || Number(age) < 0 || Number(age) > 120)) {
        toastError('Check the age', 'Enter a whole age between 0 and 120, or leave it blank.');
        return;
      }
      payload.client = {
        name: form.name.trim(),
        ageYears: age === '' ? undefined : Number(age),
        phone: form.phone.trim() || undefined,
      };
    } else if (identityMode === 'existing') {
      if (!chosenClient) { toastError('Pick a customer', 'Search and select the returning customer.'); return; }
      payload.clientId = chosenClient.id;
    } else {
      if (!chosenPatient) { toastError('Pick a patient', 'Search and select the registered patient.'); return; }
      payload.patientId = chosenPatient.id;
    }

    setBusy(true);
    try {
      const response = await createCounterTicket(payload);
      const ticket = response?.data ?? response;
      success('Ticket open', `Now selling for ${identityOf(ticket).label}.`);
      navigate(`/dashboard/counter/${ticket.id}`);
    } catch (err: any) {
      toastError('Ticket not opened', describeApiError(err, 'The counter ticket could not be opened.'));
    } finally {
      setBusy(false);
    }
  }, [chosenClient, chosenPatient, form, identityMode, navigate, success, toastError]);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="New counter ticket"
        subtitle="Name the customer at the desk, then sell, order and bill on the ticket"
        icon={Store}
        accent="cyan"
        actions={(
          <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/dashboard/counter')}>
            Back to counter
          </Button>
        )}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,560px)_minmax(0,1fr)] gap-4 items-start">
        <section className={`${shell} p-5`}>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Who is at the counter?</h2>
          <div className="flex flex-wrap gap-2 my-4">
            {MODES.map(([key, text]) => (
              <button
                key={key}
                onClick={() => setIdentityMode(key)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${identityMode === key ? 'border-[var(--icon-cyan-text)] bg-[var(--bg-main)] font-medium text-[var(--text-primary)]' : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-main)]'}`}
              >
                {text}
              </button>
            ))}
          </div>

          {identityMode === 'new' ? (
            <div className="space-y-3">
              <input autoFocus className={cn(INPUT, 'w-full')} placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <input className={cn(INPUT, 'w-full')} type="number" min={0} max={120} placeholder="Age (optional)" value={form.ageYears} onChange={(e) => setForm({ ...form, ageYears: e.target.value })} />
                <input className={cn(INPUT, 'w-full')} placeholder="Phone (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <p className="text-xs text-[var(--text-secondary)]">Only the name is needed. Nothing is invented for them — no folder number, no date of birth.</p>
            </div>
          ) : null}

          {identityMode === 'existing' ? (
            <div className="space-y-3">
              <input autoFocus className={cn(INPUT, 'w-full')} placeholder="Search the counter book by name or phone" value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} />
              <ul className="divide-y divide-[var(--border-color)] border border-[var(--border-color)] rounded-lg overflow-hidden max-h-56 overflow-y-auto">
                {clientMatches.map((client) => (
                  <li key={client.id}>
                    <button className={`w-full text-left px-3 py-2 text-sm hover:bg-[var(--bg-main)] ${chosenClient?.id === client.id ? 'bg-[var(--bg-main)]' : ''} text-[var(--text-primary)]`} onClick={() => setChosenClient(client)}>
                      {client.name} <span className="text-xs text-[var(--text-secondary)]">· {client.ticketCount} visit(s) · {client.ageYears != null ? `${client.ageYears} yrs` : 'age not given'} · {client.phone || 'no phone'}</span>
                      {client.registeredPatientId ? <span className="text-xs text-[var(--icon-orange-text)]"> · has a folder</span> : null}
                    </button>
                  </li>
                ))}
                {clientMatches.length === 0 && !searchError ? <li className="px-3 py-2 text-sm text-[var(--text-secondary)]">{clientSearch.trim().length >= 2 ? 'No counter customer matches.' : 'Type at least two letters to search.'}</li> : null}
              </ul>
              {chosenClient ? <p className="text-xs text-[var(--text-secondary)]">Opening for {chosenClient.name}. Their previous visits stay in one history.</p> : null}
            </div>
          ) : null}

          {identityMode === 'patient' ? (
            <div className="space-y-3">
              <input autoFocus className={cn(INPUT, 'w-full')} placeholder="Search the register by name, folder or phone" value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} />
              <ul className="divide-y divide-[var(--border-color)] border border-[var(--border-color)] rounded-lg overflow-hidden max-h-56 overflow-y-auto">
                {patientMatches.map((patient) => (
                  <li key={patient.id}>
                    <button className={`w-full text-left px-3 py-2 text-sm hover:bg-[var(--bg-main)] ${chosenPatient?.id === patient.id ? 'bg-[var(--bg-main)]' : ''} text-[var(--text-primary)]`} onClick={() => setChosenPatient(patient)}>
                      {`${patient.surname || ''} ${patient.otherNames || ''}`.trim()}
                      <span className="text-xs text-[var(--text-secondary)]"> · Folder {patient.folderNumber} · {patient.gender}</span>
                    </button>
                  </li>
                ))}
                {patientMatches.length === 0 && !searchError ? <li className="px-3 py-2 text-sm text-[var(--text-secondary)]">{patientSearch.trim().length >= 2 ? 'No registered patient matches.' : 'Type at least two letters to search.'}</li> : null}
              </ul>
            </div>
          ) : null}

          {searchError ? (
            <div role="alert" className="mt-3 flex items-center gap-2 rounded-lg border border-[var(--icon-red-text)] bg-[var(--icon-red-bg)] px-3 py-2 text-sm text-[var(--icon-red-text)]">
              <AlertCircle className="h-4 w-4 shrink-0" /> {searchError} An empty list here may be this failure, not a missing name.
            </div>
          ) : null}

          <div className="mt-4">
            <input className={cn(INPUT, 'w-full')} placeholder="What are they here for? (optional)" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          </div>

          <div className="flex justify-end gap-2 mt-5">
            <Button variant="secondary" onClick={() => navigate('/dashboard/counter')}>Cancel</Button>
            <Button variant="soft" accent="cyan" icon={UserPlus} loading={busy} disabled={busy} onClick={submit}>Open ticket</Button>
          </div>
        </section>

        <section className={`${shell} p-5`}>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">What a counter ticket is</h3>
          <ul className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
            <li>· A ticket is a visit of its own. It orders a lab test or a scan, hands stock over through the pharmacy, raises a bill and prints — all without a folder number.</li>
            <li>· Use “Registered patient” when the customer already has a folder, so the visit lands in the same history instead of creating a second name.</li>
            <li>· “Returning” finds a customer the counter has served before by name and phone; the counter keeps its own book, separate from the patient register.</li>
            <li>· Anything clinical — a consultation, a diagnosis, an admission — belongs on the visit screen, not here. The counter refuses a ticket that is not a walk-in.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
