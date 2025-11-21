import About from "../components/About";
import PageTransition from "@/components/PageTransition";
import "bootstrap-icons/font/bootstrap-icons.css";

const AboutPage = () => {
  return (
    <PageTransition>
      <main className="pt-16">
        <About />

        {/* Additional About Content */}
        <section className="bg-gray-50 section-padding">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h3 className="text-3xl font-bold text-gray-900 mb-6">
                  Our Mission
                </h3>
                <p className="text-gray-600 leading-relaxed mb-4">
                  To revolutionize electric vehicle infrastructure by providing
                  the most efficient, reliable, and user-friendly battery swap
                  management system in the industry.
                </p>
                <p className="text-gray-600 leading-relaxed">
                  We believe in a sustainable future where electric vehicles are
                  accessible to everyone, and our technology makes that vision a
                  reality through innovative battery swap solutions.
                </p>
              </div>
              <div className="relative">
                <img
                  src="https://selex.vn/wp-content/uploads/2023/06/316324888_5456103024498975_4553314338926426875_n-768x512.jpg"
                  alt="Our Mission"
                  className="w-full h-auto rounded-2xl shadow-lg"
                  loading="lazy" decoding="async"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white section-padding">
          <div className="max-w-7xl mx-auto">
            <h3 className="text-3xl font-bold text-gray-900 mb-12 text-center">
              Our Values
            </h3>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-5xl mb-4">
                  <i className="bi bi-leaf-fill"></i>
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-3">
                  Sustainability
                </h4>
                <p className="text-gray-600">
                  Committed to reducing carbon footprint through innovative
                  green technology solutions.
                </p>
              </div>
              <div className="text-center">
                <div className="text-5xl mb-4">
                  <i className="bi bi-airplane-engines-fill"></i>
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-3">
                  Innovation
                </h4>
                <p className="text-gray-600">
                  Continuously pushing boundaries with cutting-edge technology
                  and creative solutions.
                </p>
              </div>
              <div className="text-center">
                <div className="text-5xl mb-4">
                  <i className="bi bi-people-fill"></i>
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-3">
                  Reliability
                </h4>
                <p className="text-gray-600">
                  Building trust through consistent performance and dependable
                  service delivery.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </PageTransition>
  );
};

export default AboutPage;
