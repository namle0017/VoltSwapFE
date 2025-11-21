import { useState } from "react";
import { useNavigate } from "react-router-dom";
import hero from "../assets/hero.png";
import AuthModal from "../components/AuthModal";
import PageTransition from "@/components/PageTransition";

const Hero = () => {
  const [authModal, setAuthModal] = useState({ isOpen: false, mode: "signup" });
  const navigate = useNavigate();

  const openAuthModal = (mode) => {
    setAuthModal({ isOpen: true, mode });
  };

  const closeAuthModal = () => {
    setAuthModal({ isOpen: false, mode: "signup" });
  };

  return (
    <PageTransition>
      <main>
        <section
          id="home"
          className="pt-20 bg-gradient-to-br from-blue-50 via-white to-green-50 overflow-hidden"
        >
          <div className="max-w-7xl mx-auto section-padding">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              {/* Left side */}
              <div className="animate-slide-up">
                <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                  EV Battery Swap <span className="text-primary">Station</span>
                  <br />
                  <span className="text-secondary">Management System</span>
                </h1>

                <p className="text-lg md:text-xl text-gray-600 mb-8 leading-relaxed">
                  Revolutionize your electric vehicle experience with our
                  cutting-edge battery swap station management platform. Fast,
                  efficient, and eco-friendly solutions for the future of
                  transportation.
                </p>

                {/* Buttons */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={() => openAuthModal("signup")}
                    className="btn-primary text-lg sm:w-auto w-full rounded-full hover:scale-105 hover:bg-blue-600 transition"
                  >
                    Get Started Today
                  </button>

                  <button
                    onClick={() => navigate("/about")}
                    className="btn-secondary text-lg sm:w-auto w-full rounded-full hover:scale-105 hover:bg-blue-600 transition"
                  >
                    Learn More
                  </button>
                </div>

                {/* Stats */}
                <div className="flex items-center mt-10 space-x-8">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">500+</div>
                    <div className="text-sm text-gray-600">Stations</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-secondary">
                      24/7
                    </div>
                    <div className="text-sm text-gray-600">Service</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-accent">100%</div>
                    <div className="text-sm text-gray-600">Eco-Friendly</div>
                  </div>
                </div>
              </div>

              {/* Right side image */}
              {/* Right side visual (UPGRADED) */}
              <div className="relative flex justify-center items-center">
                {/* soft gradient blob behind */}
                <div className="absolute -inset-24 rounded-[4rem] bg-gradient-to-tr from-blue-300/30 via-cyan-200/25 to-emerald-200/25 blur-[120px]" />

                {/* presentation frame */}
                <div className="group relative w-full max-w-[560px]">
                  {/* glowing ring */}
                  <div className="absolute -inset-1 rounded-[2rem] bg-gradient-to-r from-blue-500/30 via-cyan-400/30 to-emerald-400/30 blur opacity-70 group-hover:opacity-100 transition" />

                  {/* glass card */}
                  <div
                    className="relative rounded-[2rem] bg-white/80 backdrop-blur-md ring-1 ring-black/5 shadow-2xl overflow-hidden
                    transform-gpu transition duration-500 group-hover:-translate-y-1 group-hover:rotate-[0.5deg]"
                  >
                    {/* image with overlay */}
                    <div className="relative aspect-[16/10]">
                      <picture>
                        <img
                          src={hero}
                          alt="EV Battery Swap Station"
                          className="h-full w-full object-cover"
                          loading="eager"
                          decoding="async"
                        />
                      </picture>
                      {/* subtle gradient overlay để màu ảnh đồng bộ brand */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/10 via-transparent to-emerald-500/10" />
                    </div>

                    {/* caption / micro badges */}
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <i className="bi bi-shield-check text-primary" />
                        <span>ISO-ready operations</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <i className="bi bi-graph-up-arrow text-secondary" />
                        <span>99.9% uptime</span>
                      </div>
                    </div>
                  </div>

                  {/* floating trust badge */}
                  <div className="absolute -right-2 -top-2">
                    <div
                      className="rounded-full bg-white shadow-lg ring-1 ring-black/5 px-3 py-1 text-sm font-medium text-gray-700
                      animate-[float_6s_ease-in-out_infinite]"
                    >
                      <i className="bi bi-patch-check-fill text-primary me-1" />
                      Trusted by 500+ stations
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Auth Modal */}
        <AuthModal
          isOpen={authModal.isOpen}
          onClose={closeAuthModal}
          initialMode={authModal.mode}
        />
      </main>
    </PageTransition>
  );
};

export default Hero;