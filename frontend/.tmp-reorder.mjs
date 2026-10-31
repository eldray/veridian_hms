import fs from 'node:fs';

const path = 'src/pages/MedicalEntries.tsx';
const raw = fs.readFileSync(path, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
const L = raw.split(/\r?\n/);

const at = (n) => L[n - 1]; // 1-based
const need = (n, needle) => {
  if (!at(n).includes(needle)) throw new Error(`line ${n} expected ${needle} but got: ${at(n)}`);
};
need(1929, 'ORDERS: one panel per order type');
need(1930, "activeTab === 'orders'");
need(1962, "orderTab === 'consumables'");
need(1977, 'LABS: the request');
need(1978, "orderTab === 'labs'");
need(2077, 'DIAGNOSIS + PROCEDURES');
need(2120, "orderTab === 'procedures'");
need(2195, 'MEDICATIONS: prescription');
need(2196, "orderTab === 'medications'");
need(2282, 'SCANS: the request');
need(2283, "orderTab === 'scans'");
need(2358, ')}');
need(2360, 'GENERAL INFO');

const slice = (a, b) => L.slice(a - 1, b); // inclusive, 1-based

const A = slice(1929, 1976); // orders wrapper with sub-tab card + consumables
const B = slice(1977, 2075); // labs pair
const C = slice(2077, 2193); // diagnosis + procedures grid
const D = slice(2195, 2280); // medications pair
const E = slice(2282, 2358); // scans pair

const withOrdersCondition = (block) => {
  const copy = [...block];
  const i = copy.findIndex(line => line.includes("orderTab ==="));
  if (i < 0) throw new Error('order condition not found');
  copy[i] = copy[i].replace(/\{activeTab === 'orders' && orderTab === '[a-z]+' && \(/, "{activeTab === 'orders' && (");
  return copy;
};

// Consumables only: drop the sub-tab card, keep the panel and reword its comment/condition.
const consumables = [
  `              {/* Consumables are stock issued against the visit: recording one deducts stock`,
  `                  immediately, with no prescription/dispense step. */}`,
  "              {activeTab === 'orders' && (",
  ...A.slice(34, 46),
];

const region = [
  ...withOrdersCondition(D),
  '',
  ...consumables,
  '',
  ...withOrdersCondition(B),
  '',
  ...withOrdersCondition(E),
  '',
  ...withOrdersCondition(C),
];

const out = [...L.slice(0, 1928), ...region, ...L.slice(2358)].join(eol);
fs.writeFileSync(path, out);
console.log('reordered; new line count', out.split(/\r?\n/).length);
