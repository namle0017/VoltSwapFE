// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import AnimatedSection from "./AnimatedSection";

const Footer = () => {
  const location = useLocation();

  const socialLinks = [
    { name: "Facebook", icon: <i className="bi bi-facebook"></i>, url: "#" },
    { name: "Twitter", icon: <i className="bi bi-twitter-x"></i>, url: "#" },
    { name: "LinkedIn", icon: <i className="bi bi-linkedin"></i>, url: "#" },
  ];

  const quickLinks = [
    { name: "Home", href: "/" },
    { name: "About", href: "/about" },
    { name: "Services", href: "/services" },
    { name: "Benefits", href: "/benefits" },
    { name: "Contact", href: "/contact" },
  ];

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-16">
        <AnimatedSection animation="fadeUp">
          <div className="grid md:grid-cols-4 gap-8">
            {/* Company Info */}
            <motion.div
              className="space-y-4"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
            >
              <Link
                to="/"
                className="flex items-center space-x-2 hover:text-primary transition-colors duration-300"
              >
                <div className="text-3xl font-lobster font-bold bg-gradient-to-r from-green-400 via-blue-400 to-blue-600 bg-clip-text text-transparent drop-shadow-md">
                  VoltSwap
                </div>
              </Link>
              <p className="text-gray-400 leading-relaxed">
                Leading the future of electric vehicle infrastructure with
                innovative battery swap solutions.
              </p>
              <div className="flex space-x-4">
                {socialLinks.map((social, index) => (
                  <motion.a
                    key={index}
                    href={social.url}
                    className="text-2xl hover:text-primary transition-colors duration-300 transform hover:scale-110"
                    aria-label={social.name}
                    whileHover={{ scale: 1.2, rotate: 5 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {social.icon}
                  </motion.a>
                ))}
              </div>
            </motion.div>

            {/* Quick Links */}
            <motion.div
              className="space-y-4"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <h3 className="text-lg font-semibold">Quick Links</h3>
              <ul className="space-y-2">
                {quickLinks.map((link, index) => (
                  <li key={index}>
                    <motion.div whileHover={{ x: 5 }}>
                      <Link
                        to={link.href}
                        className={`transition-colors duration-300 ${location.pathname === link.href
                            ? "text-primary"
                            : "text-gray-400 hover:text-white"
                          }`}
                      >
                        {link.name}
                      </Link>
                    </motion.div>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Services */}
            <motion.div
              className="space-y-4"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
            >
              <h3 className="text-lg font-semibold">Services</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Battery Swap Booking</li>
                <li>Inventory Management</li>
                <li>Analytics & Reporting</li>
                <li>Smart Charging</li>
              </ul>
            </motion.div>

            {/* Contact Info */}
            <motion.div
              className="space-y-4"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              viewport={{ once: true }}
            >
              <h3 className="text-lg font-semibold">Contact Info</h3>
              <div className="space-y-3 text-gray-400">
                <div className="flex items-center space-x-2">
                  <span>
                    <i className="bi bi-geo-fill"></i>
                  </span>
                  <span>
                    123 EV Station Drive
                    <br />
                    Green City, GC 12345
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>
                    <i className="bi bi-telephone-fill"></i>
                  </span>
                  <span>+1 (555) 123-4567</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>
                    <i className="bi bi-envelope-at-fill"></i>
                  </span>
                  <span>info@evstationmanagement.com</span>
                </div>
              </div>
            </motion.div>
          </div>
        </AnimatedSection>

        {/* Bottom Bar */}
        <motion.div
          className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          viewport={{ once: true }}
        >
          <div className="text-gray-400 text-sm">
            © {new Date().getFullYear()} EV Station Management System. All
            rights reserved.
          </div>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <motion.a
              href="#"
              className="text-gray-400 hover:text-white text-sm transition-colors duration-300"
              whileHover={{ y: -2 }}
            >
              Privacy Policy
            </motion.a>
            <motion.a
              href="#"
              className="text-gray-400 hover:text-white text-sm transition-colors duration-300"
              whileHover={{ y: -2 }}
            >
              Terms of Service
            </motion.a>
            <motion.a
              href="#"
              className="text-gray-400 hover:text-white text-sm transition-colors duration-300"
              whileHover={{ y: -2 }}
            >
              Cookie Policy
            </motion.a>
          </div>
        </motion.div>
      </div>
    </footer>
  );
};

export default Footer;
