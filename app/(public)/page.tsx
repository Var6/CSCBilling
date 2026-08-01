import Link from 'next/link';
import { Car, Phone, Mail, MapPin, LogIn, ArrowRight, ShieldCheck, Fuel, BookOpen } from 'lucide-react';

/**
 * app.csctravels.com — the operations console's front door.
 *
 * This page previously rendered a SaaS product template: pricing plans for
 * software that is not for sale, "500+ Cab Companies Trust Us", "50+ Countries
 * Worldwide", a US support number and an ISO 27001 badge. None of it was true.
 *
 * What this address actually is: the internal console where CSC Travels staff
 * run the daily book, fleet, fuel and billing — plus the API behind the
 * customer site and mobile apps. So the page says exactly that: staff sign in
 * here, riders go to csctravels.com.
 */
export default function Home() {
  return (
    <div className="min-h-[80vh] bg-[#F8F9FA]">
      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6"
          style={{ backgroundColor: '#DBEAFE', color: '#1E40AF' }}
        >
          <Car className="w-4 h-4" />
          CSC Travels · Patna
        </div>

        <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4" style={{ color: '#1A2332' }}>
          Operations console
        </h1>
        <p className="text-lg max-w-2xl mx-auto mb-10" style={{ color: '#5A6C7D' }}>
          The system CSC Travels runs on — daily takings, fleet and fuel records,
          driver management and billing, all in one place.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/Auth/login"
            className="flex items-center gap-2 px-8 py-4 rounded-lg text-white font-semibold shadow-lg hover:shadow-xl transition-all"
            style={{ background: 'linear-gradient(135deg, #2563EB, #1E40AF)' }}
          >
            <LogIn className="w-5 h-5" />
            Staff sign in
          </Link>
          <a
            href="https://www.csctravels.com/booking"
            className="flex items-center gap-2 px-8 py-4 rounded-lg font-semibold border-2 transition-all hover:bg-blue-50"
            style={{ borderColor: '#2563EB', color: '#2563EB' }}
          >
            Book a ride on csctravels.com
            <ArrowRight className="w-5 h-5" />
          </a>
        </div>
      </section>

      {/* What lives here — staff orientation, not marketing */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: BookOpen,
              title: 'Daily book & cash book',
              desc: 'Every duty, settlement and company cash movement — imported from the registers and kept current here.',
            },
            {
              icon: Fuel,
              title: 'Fleet, fuel & repairs',
              desc: 'Fills with odometer-tracked mileage, workshop jobs, and document expiry alerts a week before they lapse.',
            },
            {
              icon: ShieldCheck,
              title: 'Drivers & documents',
              desc: 'Profiles, licences and ID scans, vehicle assignment, and a proper offboarding trail.',
            },
          ].map((f) => (
            <div key={f.title} className="bg-white rounded-xl p-6" style={{ border: '1px solid #E5E7EB' }}>
              <span className="inline-flex p-2.5 rounded-lg mb-4" style={{ backgroundColor: '#DBEAFE' }}>
                <f.icon className="w-5 h-5" style={{ color: '#2563EB' }} />
              </span>
              <h3 className="font-semibold mb-1" style={{ color: '#1A2332' }}>{f.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: '#5A6C7D' }}>{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Real contact — the numbers that were here before belonged to nobody */}
        <div className="mt-10 bg-white rounded-xl p-6 flex flex-wrap gap-x-10 gap-y-4 justify-center"
          style={{ border: '1px solid #E5E7EB' }}>
          <a href="tel:+919873101537" className="flex items-center gap-2 text-sm hover:underline" style={{ color: '#1A2332' }}>
            <Phone className="w-4 h-4" style={{ color: '#2563EB' }} /> +91 98731 01537
          </a>
          <a href="mailto:booking@csctravels.com" className="flex items-center gap-2 text-sm hover:underline" style={{ color: '#1A2332' }}>
            <Mail className="w-4 h-4" style={{ color: '#2563EB' }} /> booking@csctravels.com
          </a>
          <span className="flex items-center gap-2 text-sm" style={{ color: '#1A2332' }}>
            <MapPin className="w-4 h-4" style={{ color: '#2563EB' }} /> Patna, Bihar
          </span>
        </div>
      </section>
    </div>
  );
}
