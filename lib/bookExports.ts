import { exportToExcel } from '@/lib/exportToExcel';

/**
 * Column definitions for exporting the operating books to Excel.
 *
 * Every export here is driven by the same rows the page is currently showing,
 * so whatever month / driver / vehicle / status filter is applied on screen is
 * exactly what lands in the file. Nothing is re-fetched unfiltered.
 *
 * Money is written as a number, not a "₹1,234" string, so the columns can be
 * summed in Excel. Dates go out as YYYY-MM-DD, which sorts correctly as text
 * and is unambiguous — dd.mm.yyyy in the original books is not.
 */

type Column<T> = { header: string; value: (row: T) => string | number | null };

const day = (d: string | Date | null | undefined) =>
  d ? new Date(d).toISOString().slice(0, 10) : '';

/** Runs the column set over the rows and hands off to the .xls writer. */
function run<T>(filename: string, sheet: string, columns: Column<T>[], rows: T[]) {
  exportToExcel(
    filename,
    sheet,
    columns.map((c) => c.header),
    rows.map((r) => columns.map((c) => c.value(r))),
  );
}

/* ------------------------------------------------------------------ *
 * Daily book
 * ------------------------------------------------------------------ */

type SettlementRow = {
  date: string;
  driverName: string;
  shift: string | null;
  dutyType: string;
  dutyNote: string;
  openingBalance: number;
  earnings: Record<string, number>;
  totalEarnings: number;
  cashInHand: number;
  fuelExpense: number;
  tollExpense: number;
  totalExpense: number;
  netTotal: number;
  transferToBank: number;
  cashGiven: number;
  closingBalance: number;
  computedClosingBalance: number;
  discrepancy: boolean;
  discrepancyKind?: string[];
  notes?: string[];
  origin: string;
  source?: { sheet?: string };
};

const SETTLEMENT_COLUMNS: Column<SettlementRow>[] = [
  { header: 'Date', value: (r) => day(r.date) },
  { header: 'Driver', value: (r) => r.driverName },
  { header: 'Shift', value: (r) => r.shift ?? '' },
  { header: 'Duty', value: (r) => r.dutyType },
  { header: 'Duty note', value: (r) => r.dutyNote ?? '' },
  { header: 'Opening balance', value: (r) => r.openingBalance },
  { header: 'Uber', value: (r) => r.earnings?.uber ?? 0 },
  { header: 'Uber cash', value: (r) => r.earnings?.uberCash ?? 0 },
  { header: 'Rapido cash', value: (r) => r.earnings?.rapidoCash ?? 0 },
  { header: 'Rapido A/c', value: (r) => r.earnings?.rapidoAccount ?? 0 },
  { header: 'UPI (bank)', value: (r) => r.earnings?.upiBank ?? 0 },
  { header: 'Personal UPI', value: (r) => r.earnings?.personalUpi ?? 0 },
  { header: 'Offline', value: (r) => r.earnings?.offline ?? 0 },
  { header: 'Advance', value: (r) => r.earnings?.advance ?? 0 },
  { header: 'Takings', value: (r) => r.totalEarnings },
  { header: 'Cash in hand', value: (r) => r.cashInHand },
  { header: 'Fuel', value: (r) => r.fuelExpense },
  { header: 'Toll/other', value: (r) => r.tollExpense },
  { header: 'Total expense', value: (r) => r.totalExpense },
  { header: 'Net', value: (r) => r.netTotal },
  { header: 'To bank', value: (r) => r.transferToBank },
  { header: 'Cash to office', value: (r) => r.cashGiven },
  { header: 'Carried forward', value: (r) => r.closingBalance },
  { header: 'Carried (calculated)', value: (r) => r.computedClosingBalance },
  { header: 'Needs review', value: (r) => (r.discrepancy ? (r.discrepancyKind ?? []).join(', ') || 'yes' : '') },
  { header: 'Notes', value: (r) => (r.notes ?? []).join(' | ') },
  { header: 'Source', value: (r) => (r.origin === 'sheet' ? r.source?.sheet ?? 'spreadsheet' : 'entered in app') },
];

export const exportSettlements = (rows: SettlementRow[], label: string) =>
  run(`daily-book_${label}`, 'Daily Book', SETTLEMENT_COLUMNS, rows);

/* ------------------------------------------------------------------ *
 * Fuel
 * ------------------------------------------------------------------ */

type FuelRow = {
  date: string;
  driverName: string;
  vehicleCode: string;
  vehiclePlate: string;
  fuelType?: string;
  amount: number;
  quantity: number;
  ratePerUnit: number;
  meterReading: number | null;
  meterNote?: string;
  kmSinceLast: number | null;
  mileage: number | null;
  origin: string;
  source?: { sheet?: string };
};

const FUEL_COLUMNS: Column<FuelRow>[] = [
  { header: 'Date', value: (r) => day(r.date) },
  { header: 'Driver', value: (r) => r.driverName },
  { header: 'Vehicle', value: (r) => r.vehicleCode || '' },
  { header: 'Plate', value: (r) => (r.vehiclePlate?.startsWith('PENDING') ? '' : r.vehiclePlate ?? '') },
  { header: 'Fuel type', value: (r) => r.fuelType ?? '' },
  { header: 'Amount', value: (r) => r.amount },
  { header: 'Quantity (kg/L)', value: (r) => r.quantity },
  { header: 'Rate', value: (r) => r.ratePerUnit },
  // Left blank rather than 0 when the book recorded nothing — a 0 odometer is
  // a claim the car has never moved, which is not what a blank cell meant.
  { header: 'Odometer', value: (r) => r.meterReading ?? '' },
  { header: 'Odometer note', value: (r) => r.meterNote ?? '' },
  { header: 'Km since last fill', value: (r) => r.kmSinceLast ?? '' },
  { header: 'Mileage (km per kg/L)', value: (r) => r.mileage ?? '' },
  { header: 'Source', value: (r) => (r.origin === 'sheet' ? r.source?.sheet ?? 'spreadsheet' : 'entered in app') },
];

export const exportFuel = (rows: FuelRow[], label: string) =>
  run(`fuel-log_${label}`, 'Fuel & CNG', FUEL_COLUMNS, rows);

/* ------------------------------------------------------------------ *
 * Repairs
 * ------------------------------------------------------------------ */

type RepairRow = {
  date: string;
  vehiclePlate: string;
  vehicleCode: string;
  category: string;
  description: string;
  partsCost: number;
  labourCost: number;
  cost: number;
  odometer: number | null;
  garage: string;
  invoiceNo: string;
  status: string;
  downtimeDays: number;
  nextDueDate: string | null;
  nextDueOdometer: number | null;
  notes?: string;
  origin: string;
};

const REPAIR_COLUMNS: Column<RepairRow>[] = [
  { header: 'Date', value: (r) => day(r.date) },
  { header: 'Vehicle', value: (r) => r.vehicleCode || '' },
  { header: 'Plate', value: (r) => (r.vehiclePlate?.startsWith('PENDING') ? '' : r.vehiclePlate ?? '') },
  { header: 'Category', value: (r) => r.category },
  { header: 'Description', value: (r) => r.description ?? '' },
  { header: 'Parts', value: (r) => r.partsCost },
  { header: 'Labour', value: (r) => r.labourCost },
  { header: 'Total cost', value: (r) => r.cost },
  { header: 'Odometer', value: (r) => r.odometer ?? '' },
  { header: 'Garage', value: (r) => r.garage ?? '' },
  { header: 'Bill no.', value: (r) => r.invoiceNo ?? '' },
  { header: 'Status', value: (r) => r.status },
  { header: 'Days off road', value: (r) => r.downtimeDays },
  { header: 'Next due (date)', value: (r) => day(r.nextDueDate) },
  { header: 'Next due (km)', value: (r) => r.nextDueOdometer ?? '' },
  { header: 'Notes', value: (r) => r.notes ?? '' },
  { header: 'Source', value: (r) => (r.origin === 'sheet' ? 'duty register' : 'entered in app') },
];

export const exportRepairs = (rows: RepairRow[], label: string) =>
  run(`repairs_${label}`, 'Repairs', REPAIR_COLUMNS, rows);

/* ------------------------------------------------------------------ *
 * Drivers
 * ------------------------------------------------------------------ */

type DriverRow = {
  name: string;
  phone: string;
  email: string;
  license: string;
  status: string;
  active?: boolean;
  joinDate?: string;
  exitDate?: string | null;
  exitReason?: string;
  currentBalance?: number;
  balanceAtExit?: number | null;
  vehicle?: string | null;
  baseSalary?: number;
  perKmRate?: number;
  aliases?: string[];
};

const DRIVER_COLUMNS: Column<DriverRow>[] = [
  { header: 'Name', value: (r) => r.name },
  { header: 'Also written as', value: (r) => (r.aliases ?? []).join(', ') },
  { header: 'Phone', value: (r) => r.phone ?? '' },
  { header: 'Email', value: (r) => r.email ?? '' },
  { header: 'Licence', value: (r) => r.license ?? '' },
  { header: 'Employment', value: (r) => (r.active === false ? 'former' : 'current') },
  { header: 'Status', value: (r) => r.status ?? '' },
  { header: 'Joined', value: (r) => day(r.joinDate) },
  { header: 'Left', value: (r) => day(r.exitDate) },
  { header: 'Exit reason', value: (r) => r.exitReason ?? '' },
  { header: 'Vehicle', value: (r) => r.vehicle ?? '' },
  { header: 'Balance held', value: (r) => r.currentBalance ?? 0 },
  { header: 'Balance at exit', value: (r) => r.balanceAtExit ?? '' },
  { header: 'Base salary', value: (r) => r.baseSalary ?? 0 },
  { header: 'Per-km rate', value: (r) => r.perKmRate ?? 0 },
];

export const exportDrivers = (rows: DriverRow[], label: string) =>
  run(`drivers_${label}`, 'Drivers', DRIVER_COLUMNS, rows);
