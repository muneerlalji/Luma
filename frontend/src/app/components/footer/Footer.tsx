import "./Footer.css"

export default function Footer() {
  return (
    <footer className="footer">
      <div className="copyright">
        &copy; {new Date().getFullYear()} Luma. All rights reserved.
      </div>
    </footer>
  );
} 