import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  PlayCircle,
  ShieldCheck,
  Users,
  Video,
  Calendar,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { cn } from "../lib/utils";
import { motion } from "motion/react";

export default function SeriesView() {
  const { id } = useParams<{ id: string }>();
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [seriesName, setSeriesName] = useState("");

  useEffect(() => {
    async function fetchSeriesCases() {
      if (!id) return;
      try {
        const q = query(
          collection(db, "cases"),
          where("isPartOfSeries", "==", true),
          where("seriesId", "==", id),
          where("status", "in", ["published", "scheduled"]),
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Sort chronologically by creation or schedule
        data.sort(
          (a: any, b: any) =>
            new Date(a.createdAt || 0).getTime() -
            new Date(b.createdAt || 0).getTime(),
        );

        if (data.length > 0) {
          setSeriesName(data[0].seriesName || "Medical Case Series");
        }

        setCases(data);
      } catch (err: any) {
        console.error("Series fetch error", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSeriesCases();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="font-bold tracking-widest text-sm uppercase">
            Loading Series
          </p>
        </div>
      </div>
    );
  }

  if (cases.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center space-y-6">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center">
          <Video className="w-10 h-10 text-gray-300" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 tracking-tighter">
          Series Not Found
        </h2>
        <p className="text-gray-500 max-w-md">
          The series you are looking for does not exist or has no published
          cases currently.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft size={18} />
          Return to Library
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <div className="space-y-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-black transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Library
        </Link>
        <div className="border-b border-gray-200 pb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest">
              Case Series
            </span>
            <span className="text-sm font-bold text-gray-400">
              {cases.length} Episodes
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter leading-tight">
            {seriesName}
          </h1>
          <div className="flex items-center gap-6 mt-6">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-600">
              <Users size={18} className="text-gray-400" />
              {cases
                .reduce((acc, c) => acc + (c.views || 0), 0)
                .toLocaleString()}{" "}
              Series Views
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-gray-600">
              <ShieldCheck size={18} className="text-emerald-500" />
              {cases
                .reduce(
                  (acc, c) =>
                    acc +
                    parseFloat(
                      c.accreditation?.points || c.accreditationPoints || 0,
                    ),
                  0,
                )
                .toFixed(1)}{" "}
              Total CME Credits
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[31px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
        {cases.map((caseItem, index) => (
          <motion.div
            key={caseItem.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
          >
            <div className="flex items-center justify-center w-16 h-16 rounded-full border-4 border-white bg-indigo-50 text-indigo-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
              <span className="font-black text-xl">{index + 1}</span>
            </div>

            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4">
              <Link
                to={`/case/${caseItem.id}`}
                className="block bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-indigo-100 transition-all group-hover:ring-2 ring-indigo-600/20"
              >
                <div className="aspect-video bg-gray-100 rounded-2xl mb-4 overflow-hidden relative">
                  {caseItem.thumbnailUrl ? (
                    <img
                      src={caseItem.thumbnailUrl}
                      alt={caseItem.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <Video size={32} />
                    </div>
                  )}
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest text-indigo-600">
                    {caseItem.specialty}
                  </div>
                </div>

                <h3 className="text-lg font-black text-gray-900 leading-tight mb-2 line-clamp-2">
                  {caseItem.title}
                </h3>

                <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs font-bold text-gray-500 mt-4">
                  <div className="flex items-center gap-1">
                    <span className="w-5 h-5 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center border border-gray-200">
                      {caseItem.presenterPhotoURL ? (
                        <img
                          src={caseItem.presenterPhotoURL}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Users size={10} />
                      )}
                    </span>
                    {caseItem.presenterName}
                  </div>
                  {caseItem.scheduledAt && (
                    <div className="flex items-center gap-1.5 text-gray-400">
                      <Calendar size={14} />
                      {new Date(caseItem.scheduledAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </Link>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
