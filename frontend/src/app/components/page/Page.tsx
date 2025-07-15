import "./Page.css"
import Header from "../header/Header";
import Footer from "../footer/Footer";

export default function Page({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-root">
      <Header />
      <div className="page-content">{children}</div>
      <Footer />
    </div>
  );
} 