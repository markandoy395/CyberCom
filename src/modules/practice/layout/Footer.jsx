import "./Footer.css";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-container">
        <p className="footer-text">© {currentYear} CTF Platform. All rights reserved.</p>
        <div className="footer-links">
          <a href="#" className="footer-link">
            About
          </a>
          <a href="#" className="footer-link">
            Help
          </a>
          <a href="#" className="footer-link">
            Privacy
          </a>
          <a href="#" className="footer-link">
            Terms
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
