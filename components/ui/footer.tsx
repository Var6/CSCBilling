import React from 'react';
import Link from 'next/link';
import { Mail, Phone, MapPin } from 'lucide-react';

/**
 * Footer for the public pages of the operations console.
 *
 * The previous version was a SaaS template: product and career link lists that
 * led nowhere, a newsletter with no backend, a US support number nobody
 * answers, and an "ISO 27001 Certified" badge with no certification behind it.
 * A certification claim on a page is a legal representation — it does not
 * belong here unless it is real.
 *
 * What remains is only what is true: who this is, how to reach them, and the
 * two places a visitor can actually go.
 */
const Footer = () => {
  return (
    <footer className="bg-white border-t border-[#E5E7EB] pt-14 pb-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
          {/* Who */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo2.png" alt="CSC Travels" className="w-10 h-10 rounded-lg object-contain" />
              <span className="text-xl font-bold text-[#1A2332] tracking-tight">CSC Travels</span>
            </div>
            <p className="text-[#5A6C7D] text-sm leading-relaxed max-w-sm">
              Patna&apos;s own cab and rental service. This portal is the operations
              console where our staff manage the fleet, drivers and daily billing.
            </p>
          </div>

          {/* Where to go */}
          <div>
            <h4 className="text-sm font-semibold text-[#1A2332] mb-4">Quick links</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a href="https://www.csctravels.com" className="text-[#5A6C7D] hover:text-[#2563EB] transition-colors">
                  csctravels.com — book a ride
                </a>
              </li>
              <li>
                <a href="https://www.csctravels.com/booking" className="text-[#5A6C7D] hover:text-[#2563EB] transition-colors">
                  Fare estimate &amp; booking
                </a>
              </li>
              <li>
                <Link href="/Auth/login" className="text-[#5A6C7D] hover:text-[#2563EB] transition-colors">
                  Staff sign in
                </Link>
              </li>
            </ul>
          </div>

          {/* How to reach us — real details only */}
          <div>
            <h4 className="text-sm font-semibold text-[#1A2332] mb-4">Contact</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="tel:+919873101537" className="flex items-center gap-2 text-[#5A6C7D] hover:text-[#2563EB] transition-colors">
                  <Phone size={16} className="text-[#2563EB]" /> +91 98731 01537
                </a>
              </li>
              <li>
                <a href="mailto:booking@csctravels.com" className="flex items-center gap-2 text-[#5A6C7D] hover:text-[#2563EB] transition-colors">
                  <Mail size={16} className="text-[#2563EB]" /> booking@csctravels.com
                </a>
              </li>
              <li className="flex items-center gap-2 text-[#5A6C7D]">
                <MapPin size={16} className="text-[#2563EB]" /> Patna, Bihar, India
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-[#F1F5F9] text-center text-sm text-[#9AA5B1]">
          &copy; {new Date().getFullYear()} CSC Travels, Patna. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
