/* eslint-disable no-unused-vars */
// src/pages/ContactPage.jsx
import { useEffect, useMemo, useState } from "react";
import Contact from "../components/Contact";
import PageTransition from "@/components/PageTransition";
import { motion } from "framer-motion";
import api from "@/api/api";

const VIEW_QUESTION_EP = "/Report/view-question";
const SHOW_COUNT = 3; // ← số lượng câu hỏi ngẫu nhiên muốn hiển thị

const formatDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function ContactPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [randKey, setRandKey] = useState(0); // đổi để random lại

  const fetchQuestions = async () => {
    try {
      setErr("");
      setRefreshing(true);
      const res = await api.get(VIEW_QUESTION_EP);
      const data = res?.data?.data ?? [];
      setItems(Array.isArray(data) ? data : []);
      setRandKey(Math.random()); // mỗi lần fetch sẽ random lại
    } catch (e) {
      console.error(e);
      setErr(
        e?.response?.data?.message ||
        e?.message ||
        "Failed to load the questions list."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const randomFew = useMemo(() => {
    if (!Array.isArray(items) || items.length === 0) return [];
    // shuffle nhẹ + pick SHOW_COUNT
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, SHOW_COUNT);
    // randKey đảm bảo re-random khi refresh
  }, [items, randKey]);

  return (
    <PageTransition>
      <main className="pt-16">
        <Contact />

        <section className="bg-gray-50 section-padding">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-gray-900">
                Frequently Asked Questions
              </h2>
              <button
                onClick={fetchQuestions}
                className="btn-outline flex items-center gap-2 disabled:opacity-60"
                disabled={refreshing}
              >
                {refreshing ? "Loading..." : "Refresh"}
              </button>
            </div>

            {loading && (
              <div className="card p-6 text-gray-600">Loading questions...</div>
            )}
            {err && (
              <div className="card p-6 border border-red-200 bg-red-50 text-red-700">
                {err}
              </div>
            )}
            {!loading && !err && randomFew.length === 0 && (
              <div className="card p-6 text-gray-600">
                No questions have been submitted yet.
              </div>
            )}

            <div className="space-y-4">
              {randomFew.map((q, idx) => (
                <motion.div
                  key={`${q?.createAt}-${idx}`}
                  className="card p-6"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <h3 className="text-lg font-semibold text-gray-900">
                    {q?.note || "(No content)"}
                  </h3>
                  {/* ĐÃ BỎ type & id theo yêu cầu */}
                  <div className="mt-2 text-sm text-gray-500">
                    Created at: {formatDate(q?.createAt)}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </PageTransition>
  );
}
