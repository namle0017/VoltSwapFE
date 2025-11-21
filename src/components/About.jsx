import battery_tech from "../assets/battery_tech.png";
import AnimatedSection from "./AnimatedSection";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";

const About = () => {
  return (
    <section id="about" className="bg-white section-padding">
      <div className="max-w-7xl mx-auto">
        <AnimatedSection animation="fadeUp" className="text-center mb-16">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              About Our System
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Leading the charge in sustainable transportation infrastructure
              with innovative battery swap technology.
            </p>
          </div>
        </AnimatedSection>

        <div className="grid md:grid-cols-2 gap-12 items-center">
          <AnimatedSection
            animation="slideLeft"
            delay={0.2}
            className="space-y-6"
          >
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">
              Empowering the Future of Electric Mobility
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Our EV Battery Swap Station Management System represents a
              paradigm shift in electric vehicle infrastructure. We've designed
              a comprehensive platform that streamlines battery swap operations,
              reduces waiting times, and maximizes station efficiency.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Built with cutting-edge technology and sustainable practices at
              its core, our system enables seamless battery exchanges in under 5
              minutes, making electric vehicle ownership more convenient than
              ever before.
            </p>
            <motion.div
              className="grid grid-cols-2 gap-4 mt-8"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              viewport={{ once: true }}
            >
              <motion.div
                className="text-center p-4 bg-blue-50 rounded-lg"
                whileHover={{ scale: 1.05, y: -5 }}
                transition={{ duration: 0.2 }}
              >
                <div className="text-3xl font-bold text-primary">5 Min</div>
                <div className="text-sm text-gray-600">Swap Time</div>
              </motion.div>
              <motion.div
                className="text-center p-4 bg-green-50 rounded-lg"
                whileHover={{ scale: 1.05, y: -5 }}
                transition={{ duration: 0.2 }}
              >
                <div className="text-3xl font-bold text-secondary">99.9%</div>
                <div className="text-sm text-gray-600">Uptime</div>
              </motion.div>
            </motion.div>
          </AnimatedSection>

          <AnimatedSection
            animation="slideRight"
            delay={0.4}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl transform rotate-6"></div>
            <motion.img
              src={battery_tech}
              alt="EV Battery Technology"
              className="relative w-full h-auto rounded-2xl shadow-lg"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
              loading="lazy"
            />
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
};

export default About;
