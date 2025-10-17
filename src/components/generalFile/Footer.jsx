import "../cssFile/temp.css"

import logo from '../pic/logo.png'

function Footer() {
    return (
        <footer className="footer">
            <div className="footer-container">
                <div className="footer-section">
                    <div className="footer-logo">
                        <img src={logo} alt="expora logo" className="img-login-logo" />                                <span>Expora</span>
                    </div>
                    <p className="footer-text">Discover the world, one adventure at a time.</p>
                </div>
                <div className="footer-section">
                    <h4 className="footer-heading">Company</h4>
                    <a href="#" className="footer-link">About Us</a>
                    <a href="#" className="footer-link">Careers</a>
                    <a href="#" className="footer-link">Press</a>
                </div>
                <div className="footer-section">
                    <h4 className="footer-heading">Support</h4>
                    <a href="#" className="footer-link">Help Center</a>
                    <a href="#" className="footer-link">Contact Us</a>
                    <a href="#" className="footer-link">Privacy Policy</a>
                </div>
                <div className="footer-section">
                    <h4 className="footer-heading">Follow Us</h4>
                    <a href="#" className="footer-link">Facebook</a>
                    <a href="#" className="footer-link">Instagram</a>
                    <a href="#" className="footer-link">Twitter</a>
                </div>
            </div>
            <div className="footer-bottom">
                <p>&copy; 2025 Expora. All rights reserved.</p>
            </div>
        </footer>
    );
}
export default Footer;