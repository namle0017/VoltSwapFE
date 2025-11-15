/* eslint-disable no-unused-vars */
import { useEffect, useMemo, useState } from "react";
import Benefits from "../components/Benefits";
import PageTransition from "@/components/PageTransition";
import api from "@/api/api";

/* helpers */
function fmtDate(d) {
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "";
  return dt.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
function shufflePick(arr = [], n = 4) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

/* sao vàng */
const StarRow = ({ score = 5 }) => (
  <div className="flex items-center gap-0.5" aria-label={`${score} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((n) => (
      <span
        key={n}
        className={n <= (Number(score) || 0) ? "text-yellow-400 text-lg" : "text-gray-300 text-lg"}
      >
        ★
      </span>
    ))}
  </div>
);

const BenefitsPage = () => {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const fetchRatings = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await api.get("/Rating/view-rating");
      const list = res?.data?.data?.ratingList ?? [];

      // Lấy các review 5 sao có comment, map theo schema mới (driverName, stationName)
      const fiveStar = list
        .filter(
          (r) =>
            Number(r.ratingScore) === 5 &&
            String(r.comment || "").trim().length > 0
        )
        .map((r, idx) => ({
          id: r.ratingId ?? idx, // fallback idx nếu không có id
          driverName: r.driverName || "Khách hàng",
          stationName: r.stationName || "—",
          comment: r.comment,
          createdAt: r.createdAt,
          score: Number(r.ratingScore) || 5,
        }));

      // Ưu tiên mới nhất
      fiveStar.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setRatings(fiveStar);
    } catch (e) {
      console.error("view-rating error:", e?.response?.data || e);
      setErr(e?.response?.data?.message || "Không tải được đánh giá từ BE.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRatings();
  }, []);

  const showcase = useMemo(() => shufflePick(ratings, 4), [ratings]);
  const showFallback = !loading && (!!err || showcase.length === 0);

  return (
    <PageTransition>
      <main className="pt-16">
        <Benefits />

        {/* Success Stories - dynamic từ BE */}
        <section className="bg-gray-50 section-padding">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Success Stories</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                See real 5-star experiences from drivers at our partner stations.
              </p>
            </div>

            {/* Loading skeleton */}
            {loading && (
              <div className="grid md:grid-cols-2 gap-12">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="card p-8 animate-pulse">
                    <div className="flex items-center mb-6">
                      <div className="w-16 h-16 rounded-full bg-gray-200 mr-4" />
                      <div className="space-y-2">
                        <div className="h-4 w-40 bg-gray-200 rounded" />
                        <div className="h-3 w-56 bg-gray-200 rounded" />
                      </div>
                    </div>
                    <div className="h-4 bg-gray-200 rounded w-full mb-2" />
                    <div className="h-4 bg-gray-200 rounded w-4/5 mb-2" />
                    <div className="h-4 bg-gray-200 rounded w-3/5 mb-6" />
                    <div className="h-4 bg-gray-200 rounded w-24" />
                  </div>
                ))}
              </div>
            )}

            {/* Grid từ BE (random 4) */}
            {!loading && !showFallback && (
              <div className="grid md:grid-cols-2 gap-12">
                {showcase.map((r) => (
                  <div key={r.id} className="card p-8">
                    <div className="flex items-center mb-6">
                      {/* avatar initials dựa theo driverName */}
                      <img
                        src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                          r.driverName || "Driver"
                        )}`}
                        alt={r.driverName || "Client"}
                        className="w-16 h-16 rounded-full mr-4 bg-gray-100"
                        loading="lazy"
                        decoding="async"
                      />
                      <div>
                        <h4 className="font-semibold text-gray-900">{r.driverName}</h4>
                        <p className="text-gray-600 text-sm">
                          {r.stationName}
                          {r.createdAt ? ` • ${fmtDate(r.createdAt)}` : ""}
                        </p>
                      </div>
                    </div>

                    <p className="text-gray-700 leading-relaxed mb-4">“{r.comment}”</p>

                    <StarRow score={r.score} />
                  </div>
                ))}
              </div>
            )}

            {/* Fallback khi lỗi/rỗng: hiển thị 2 card tĩnh */}
            {!loading && showFallback && (
              <div className="grid md:grid-cols-2 gap-12">
                <div className="card p-8">
                  <div className="flex items-center mb-6">
                    <img
                      src="https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150"
                      alt="Client"
                      className="w-16 h-16 rounded-full mr-4"
                      loading="lazy"
                      decoding="async"
                    />
                    <div>
                      <h4 className="font-semibold text-gray-900">Sarah Johnson</h4>
                      <p className="text-gray-600">Station Manager, GreenCharge</p>
                    </div>
                  </div>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    “Since implementing this system, our station efficiency increased
                    dramatically. The automated booking and inventory management saved us
                    countless hours.”
                  </p>
                  <StarRow score={5} />
                </div>

                <div className="card p-8">
                  <div className="flex items-center mb-6">
                    <img
                      src="https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150"
                      alt="Client"
                      className="w-16 h-16 rounded-full mr-4"
                      loading="lazy"
                      decoding="async"
                    />
                    <div>
                      <h4 className="font-semibold text-gray-900">Michael Chen</h4>
                      <p className="text-gray-600">CEO, EcoFleet Solutions</p>
                    </div>
                  </div>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    “The analytics and reporting features gave us insights we never had
                    before. We optimized operations and reduced costs significantly.”
                  </p>
                  <StarRow score={5} />
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="bg-white section-padding">
          <div className="max-w-7xl mx-auto text-center">
            <h2 className="text-4xl font-bold text-gray-900 mb-8">
              Ready to Experience the Benefits?
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Join thousands of satisfied customers who have transformed their
              EV infrastructure with our system.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="btn-primary">Start Free Trial</button>
              <button className="btn-secondary">Schedule Demo</button>
            </div>
          </div>
        </section>
      </main>
    </PageTransition>
  );
};

export default BenefitsPage;
