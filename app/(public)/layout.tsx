import CSCNavbar from "@/components/ui/navbar";
import Footer from "@/components/ui/footer";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <CSCNavbar />
      <main>{children}</main>
      <Footer />
    </>
  );
}
