import DashboardPreviewSection from "@/components/ui/dashboard";

import HeroSection from "@/components/ui/HeroSection";
import PricingSection from "@/components/ui/Pricing";
import StatsSection from "@/components/ui/stats";
import Image from "next/image";

export default function Home() {
  return (
    <div>
      <HeroSection />
      <PricingSection/>
      <DashboardPreviewSection/>
      <StatsSection/>
      
    </div>
  );
}
