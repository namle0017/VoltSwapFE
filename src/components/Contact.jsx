// Contact.jsx
import { useState } from "react";
import AnimatedSection from "./AnimatedSection";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";
import api from "@/api/api"; // ✅ dùng instance gọi BE

const CREATE_QUESTION_EP = "/Report/create-question";

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleChange = (e) => {
    setErrorMsg("");
    setSuccessMsg("");
    setFormData((s) => ({ ...s, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const desc = (formData.message || "").trim();
    if (!desc) {
      setErrorMsg("Vui lòng nhập nội dung câu hỏi.");
      return;
    }

    try {
      setSubmitting(true);
      // ✅ Gọi BE, chỉ gửi đúng field "description"
      // eslint-disable-next-line no-unused-vars
      const res = await api.post(CREATE_QUESTION_EP, { description: desc });
      // tuỳ BE, có thể check res.status hoặc res.data
      setSuccessMsg("Send Successfully!!!");
      // giữ lại name/email cho tiện người dùng, chỉ clear message
      setFormData((s) => ({ ...s, message: "" }));
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Send Failed, please send again!!!";
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="contact" className="bg-gray-50 section-padding">
      <div className="max-w-7xl mx-auto">
        <AnimatedSection animation="fadeUp" className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Get In Touch</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Have questions about our EV battery swap management system? We'd love to hear from you.
          </p>
        </AnimatedSection>

        <div className="grid md:grid-cols-2 gap-12 items-start">
          <AnimatedSection animation="slideLeft" delay={0.2} className="space-y-8">
            <div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-6">Contact Information</h3>
              <div className="space-y-4">
                <motion.div className="flex items-center space-x-3" whileHover={{ x: 10 }} transition={{ duration: 0.2 }}>
                  <i className="bi bi-geo-fill text-2xl text-primary"></i>
                  <div>
                    <div className="font-semibold text-gray-900">Address</div>
                    <div className="text-gray-600">123 EV Station Drive, Green City, GC 12345</div>
                  </div>
                </motion.div>
                <motion.div className="flex items-center space-x-3" whileHover={{ x: 10 }} transition={{ duration: 0.2 }}>
                  <i className="bi bi-telephone-fill text-2xl text-primary"></i>
                  <div>
                    <div className="font-semibold text-gray-900">Phone</div>
                    <div className="text-gray-600">+1 (555) 123-4567</div>
                  </div>
                </motion.div>
                <motion.div className="flex items-center space-x-3" whileHover={{ x: 10 }} transition={{ duration: 0.2 }}>
                  <i className="bi bi-envelope-at-fill text-2xl text-primary"></i>
                  <div>
                    <div className="font-semibold text-gray-900">Email</div>
                    <div className="text-gray-600">info@evstationmanagement.com</div>
                  </div>
                </motion.div>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Business Hours</h4>
              <div className="space-y-2 text-gray-600">
                <div className="flex justify-between">
                  <span>Monday - Friday:</span>
                  <span>9:00 AM - 6:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span>Saturday:</span>
                  <span>10:00 AM - 4:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span>Sunday:</span>
                  <span>Closed</span>
                </div>
              </div>
            </div>
          </AnimatedSection>

          <AnimatedSection animation="slideRight" delay={0.4} className="card p-8">
            <form onSubmit={handleSubmit} className="space-y-6" aria-label="Contact form">
              {/* name/email vẫn giữ để user nhập, nhưng BE chỉ nhận description */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <motion.input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-300"
                  placeholder="Your full name"
                  whileFocus={{ scale: 1.02 }}
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <motion.input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-300"
                  placeholder="your.email@example.com"
                  whileFocus={{ scale: 1.02 }}
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                  Message <span className="text-red-500">*</span>
                </label>
                <motion.textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-300 resize-vertical"
                  placeholder="Have questions about our EV battery swap management system? We'd love to hear from you...."
                  whileFocus={{ scale: 1.02 }}
                />
              </div>

              {/* trạng thái submit */}
              {(errorMsg || successMsg) && (
                <div
                  className={`text-sm rounded-lg px-4 py-3 ${errorMsg ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"
                    }`}
                >
                  {errorMsg || successMsg}
                </div>
              )}

              <motion.button
                type="submit"
                className="w-full btn-primary text-center disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={submitting}
                whileHover={!submitting ? { scale: 1.02, y: -2 } : {}}
                whileTap={!submitting ? { scale: 0.98 } : {}}
              >
                {submitting ? "Đang gửi..." : "Send Message"}
              </motion.button>
            </form>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
};

export default Contact;
