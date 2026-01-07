import TripEaseNavbar from "@/components/ui/navbar";
import Footer from "@/components/ui/footer";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <TripEaseNavbar />
      <main>{children}</main>
      <Footer />
    </>
  );
}
