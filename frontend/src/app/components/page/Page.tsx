import "./Page.css"
import Header from "../header/Header";
import Footer from "../footer/Footer";

interface PageProps {
  children: React.ReactNode;
  isLandingPage?: boolean;
}

export default function Page({ children, isLandingPage = false }: PageProps) {
  return (
    <div className={`page-root ${isLandingPage ? 'landing-page' : ''}`}>
      <Header />
      <div className="header-spacer" />
      <div className="page-content">{children}</div>
      <Footer />
    </div>
  );
} 