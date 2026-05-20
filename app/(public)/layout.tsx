import CSCTravelsNavbar from "@/components/ui/navbar";
import Footer from "@/components/ui/footer";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <CSCTravelsNavbar />
      <main>{children}</main>
      <Footer />
    </>
  );
}
