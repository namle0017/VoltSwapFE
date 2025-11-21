import AnimatedSection from "./AnimatedSection";
import { useStaggeredAnimation } from "../hooks/useScrollAnimation";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";
import "bootstrap-icons/font/bootstrap-icons.css";

const Services = () => {
  const services = [
    {
      icon: <i className="bi bi-battery-charging"></i>,
      title: "Battery Swap Booking",
      description:
        "Easy online booking system for quick battery swaps with real-time availability updates.",
    },
    {
      icon: <i className="bi bi-bar-chart-fill"></i>,
      title: "Inventory Management",
      description:
        "Advanced inventory tracking for battery status, health monitoring, and maintenance scheduling.",
    },
    {
      icon: <i className="bi bi-graph-up"></i>,
      title: "Analytics & Reporting",
      description:
        "Comprehensive reporting tools with detailed analytics for operational insights and optimization.",
    },
    {
      icon: <i className="bi bi-lightning-charge-fill"></i>,
      title: "Smart Charging",
      description:
        "Intelligent charging algorithms that optimize battery life and reduce energy consumption.",
    },
    {
      icon: <i className="bi bi-credit-card-2-front-fill"></i>,
      title: "Pricing & Subscription Management",
      description:
        "Configure GU/G1/G2 plans, per-swap pricing, promotions, invoices, and receipts.",
    },
    {
      icon: <i className="bi bi-wrench"></i>,
      title: "Maintenance Tracking",
      description:
        "Automated maintenance scheduling and tracking system for optimal station performance.",
    },
  ];

  const [ref, visibleItems] = useStaggeredAnimation(services.length, 0.1);

  return (
    <section id="services" className="bg-gray-50 section-padding">
      <div className="max-w-7xl mx-auto">
        <AnimatedSection animation="fadeUp" className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Our Services
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Comprehensive solutions designed to streamline your EV battery swap
            operations and enhance customer experience.
          </p>
        </AnimatedSection>

        <div ref={ref} className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <motion.div
              key={index}
              className="card p-8 text-center"
              initial={{ opacity: 0, y: 50 }}
              animate={
                visibleItems.has(index)
                  ? { opacity: 1, y: 0 }
                  : { opacity: 0, y: 50 }
              }
              transition={{ duration: 0.6, ease: "easeOut" }}
              whileHover={{
                y: -10,
                scale: 1.02,
                boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
              }}
            >
              <motion.div
                className="text-5xl mb-4"
                whileHover={{ scale: 1.2, rotate: 5 }}
                transition={{ duration: 0.2 }}
              >
                {service.icon}
              </motion.div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                {service.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {service.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
