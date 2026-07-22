import { Types } from 'mongoose';
import CompanyAdmin from '@/models/CompanyAdmin';
import Customer from '@/models/Customer';

/**
 * Tenant + customer resolution for trips created outside the console.
 *
 * Trip.companyId is required, but a driver's phone has no idea which company
 * row it belongs to. Resolution order: the PUBLIC_COMPANY_ID env var if set,
 * otherwise the single CompanyAdmin in the database. If there are several and
 * no env var, we refuse rather than guess and file trips under the wrong tenant.
 */

let cachedCompanyId: string | null = null;

export async function resolveCompanyId(): Promise<Types.ObjectId> {
  if (cachedCompanyId) return new Types.ObjectId(cachedCompanyId);

  const fromEnv = process.env.PUBLIC_COMPANY_ID;
  if (fromEnv && Types.ObjectId.isValid(fromEnv)) {
    cachedCompanyId = fromEnv;
    return new Types.ObjectId(fromEnv);
  }

  const companies = await CompanyAdmin.find().select('_id').limit(2).lean();

  if (companies.length === 1) {
    cachedCompanyId = String(companies[0]._id);
    return new Types.ObjectId(cachedCompanyId);
  }

  throw new Error(
    companies.length === 0
      ? 'No company is configured. Create one in the console before booking trips.'
      : 'Multiple companies exist — set PUBLIC_COMPANY_ID so trips are filed against the right one.',
  );
}

/**
 * Finds a customer by phone, creating a minimal row if this is someone the
 * business has not seen before.
 *
 * Deliberately does NOT touch passwordHash: an offline rider who later signs up
 * on the app claims this same row by phone (see customer/auth/register), so
 * their history carries over instead of splitting across two records.
 */
export async function findOrCreateCustomer(input: {
  name: string;
  phone: string;
  companyId: Types.ObjectId;
}) {
  const phone = input.phone.replace(/\s+/g, '');

  const existing = await Customer.findOne({ phone });
  if (existing) {
    // Fill a blank name if staff created a stub row earlier.
    if (!existing.name && input.name) {
      existing.name = input.name;
      await existing.save();
    }
    return existing;
  }

  return Customer.create({
    name: input.name || 'Offline customer',
    phone,
    companyId: input.companyId,
  });
}
