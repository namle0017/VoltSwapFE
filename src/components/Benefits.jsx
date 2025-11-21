import AnimatedSection from "./AnimatedSection";
import { useStaggeredAnimation } from "../hooks/useScrollAnimation";
import { useState } from "react";
import AuthModal from "./AuthModal";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";
import "bootstrap-icons/font/bootstrap-icons.css";
const Benefits = () => {
  const [authModal, setAuthModal] = useState({ isOpen: false, mode: "signup" });

  const openAuthModal = (mode) => {
    setAuthModal({ isOpen: true, mode });
  };

  const closeAuthModal = () => {
    setAuthModal({ isOpen: false, mode: "signup" });
  };

  const benefits = [
    {
      icon: <i className="bi bi-clock"></i>,
      title: "Save Time",
      description:
        "Reduce battery swap time to under 5 minutes with our automated system and smart queue management.",
    },
    {
      icon: <i className="bi bi-leaf"></i>,
      title: "Eco-Friendly",
      description:
        "Promote sustainable transportation with zero-emission battery swap solutions and renewable energy integration.",
    },
    {
      icon: <i className="bi bi-bar-chart"></i>,
      title: "Easy Management",
      description:
        "Streamlined dashboard for effortless station management, monitoring, and operational control.",
    },
    {
      icon: <i className="bi bi-cash"></i>,
      title: "Cost Effective",
      description:
        "Optimize operational costs with intelligent resource allocation and predictive maintenance systems.",
    },
  ];
  const [ref, visibleItems] = useStaggeredAnimation(benefits.length, 0.15);

  return (
    <section id="benefits" className="bg-white section-padding">
      <div className="max-w-7xl mx-auto">
        <AnimatedSection animation="fadeUp" className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Why Choose Our System?
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Experience the advantages of cutting-edge battery swap technology
            designed for efficiency, sustainability, and growth.
          </p>
        </AnimatedSection>

        <div ref={ref} className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              className="text-center group"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={
                visibleItems.has(index)
                  ? { opacity: 1, scale: 1 }
                  : { opacity: 0, scale: 0.8 }
              }
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <div className="card p-8 h-full">
                <motion.div
                  className="text-5xl mb-6"
                  whileHover={{ scale: 1.2, rotate: 10 }}
                  transition={{ duration: 0.3 }}
                >
                  {benefit.icon}
                </motion.div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  {benefit.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <AnimatedSection
          animation="zoomIn"
          delay={0.3}
          className="mt-16 bg-gradient-to-r from-primary to-secondary rounded-2xl p-8 md:p-12 text-center text-white"
        >
          <h3 className="text-3xl font-bold mb-4">
            Ready to Transform Your EV Infrastructure?
          </h3>
          <p className="text-xl mb-8 opacity-90">
            Join hundreds of stations already using our platform to deliver
            exceptional service.
          </p>
          <motion.button
            onClick={() => openAuthModal("signup")}
            className="bg-white text-primary px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-colors duration-300 shadow-lg"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            Start Your Free Trial
          </motion.button>
        </AnimatedSection>
      </div>

      <AuthModal
        isOpen={authModal.isOpen}
        onClose={closeAuthModal}
        initialMode={authModal.mode}
      />
    </section>
  );
};

export default Benefits;
