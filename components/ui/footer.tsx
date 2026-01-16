import React from 'react';
import { 
  Car, 
  Mail, 
  Phone, 
  MapPin, 
  Facebook, 
  Twitter, 
  Linkedin, 
  Instagram, 
  ChevronRight, 
  Globe,
  ShieldCheck
} from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-white border-t border-[#E5E7EB] pt-20 pb-10 font-['Inter']">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Top Section: Branding & Newsletter */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-16">
          <div className="lg:col-span-4">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-[#2563EB] to-[#1E40AF] rounded-lg flex items-center justify-center shadow-lg shadow-blue-200">
                <Car className="text-white w-6 h-6" />
              </div>
              <span className="text-[26px] font-bold text-[#1A2332] tracking-tight">TripEase</span>
            </div>
            <p className="text-[#5A6C7D] text-lg leading-relaxed mb-8 max-w-sm">
              The complete operating system for modern transport businesses. Streamlining dispatch, billing, and fleet management.
            </p>
            <div className="flex gap-4">
              {[Facebook, Twitter, Linkedin, Instagram].map((Icon, idx) => (
                <a key={idx} href="#" className="w-10 h-10 rounded-full bg-[#F8F9FA] flex items-center justify-center text-[#5A6C7D] hover:bg-[#2563EB] hover:text-white transition-all duration-300">
                  <Icon size={18} />
                </a>
              ))}
            </div>
          </div>

          <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-3 gap-8">
            <div>
              <h4 className="font-semibold text-[#1A2332] uppercase tracking-wider text-sm mb-6">Product</h4>
              <ul className="space-y-4">
                {['Fleet Management', 'Driver Dispatch', 'Corporate Billing', 'Live Tracking', 'Mobile Apps'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-[#5A6C7D] hover:text-[#2563EB] flex items-center group transition-colors">
                      <ChevronRight size={14} className="opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-[#1A2332] uppercase tracking-wider text-sm mb-6">Company</h4>
              <ul className="space-y-4">
                {['About Us', 'Success Stories', 'Pricing Plans', 'Partners', 'Careers'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-[#5A6C7D] hover:text-[#2563EB] transition-colors">{item}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div className="col-span-2 md:col-span-1">
              <h4 className="font-semibold text-[#1A2332] uppercase tracking-wider text-sm mb-6">Get Updates</h4>
              <p className="text-[#5A6C7D] text-sm mb-4">Subscribe for the latest product updates and industry news.</p>
              <div className="relative">
                <input 
                  type="email" 
                  placeholder="Enter email" 
                  className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all bg-[#F8F9FA]"
                />
                <button className="absolute right-2 top-2 bg-[#2563EB] text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-[#1E40AF] transition-colors">
                  Join
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Middle Section: Trust Badges & Contact Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-10 border-y border-[#E5E7EB] mb-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#DBEAFE] rounded-full flex items-center justify-center text-[#2563EB]">
              <Phone size={20} />
            </div>
            <div>
              <p className="text-xs text-[#9CA3AF] uppercase font-bold tracking-tighter">Support Line</p>
              <p className="text-[#1A2332] font-semibold">+1 (800) 123-4567</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#DBEAFE] rounded-full flex items-center justify-center text-[#2563EB]">
              <Mail size={20} />
            </div>
            <div>
              <p className="text-xs text-[#9CA3AF] uppercase font-bold tracking-tighter">Email Support</p>
              <p className="text-[#1A2332] font-semibold">ops@tripease.com</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#DBEAFE] rounded-full flex items-center justify-center text-[#2563EB]">
              <ShieldCheck size={20} />
            </div>
            <div>
              <p className="text-xs text-[#9CA3AF] uppercase font-bold tracking-tighter">Data Security</p>
              <p className="text-[#1A2332] font-semibold">ISO 27001 Certified</p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-[#9CA3AF] text-sm">
            &copy; 2026 TripEase Technologies. All rights reserved. Built for the future of logistics.
          </p>
          <div className="flex items-center gap-8 text-sm font-medium text-[#5A6C7D]">
            <a href="#" className="hover:text-[#2563EB]">Privacy Policy</a>
            <a href="#" className="hover:text-[#2563EB]">Terms of Use</a>
            <a href="#" className="hover:text-[#2563EB]">SLA</a>
            <div className="flex items-center gap-2 px-3 py-1 bg-[#F8F9FA] rounded border border-[#E5E7EB] cursor-pointer">
              <Globe size={14} />
              <span>English (India)</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;