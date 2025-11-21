// pages/Stations.jsx
/* eslint-disable no-unused-vars */
import { useEffect, useMemo, useState, useCallback } from "react";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from "recharts";
import api from "@/api/api";

const MONTH_LABELS = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
];

const formatNumber = (n) =>
    typeof n === "number" ? n.toLocaleString("en-US") : "0";

// NEW: format percent with 2 decimal places
const formatPercent = (n) => {
    const num = Number(n);
    if (!Number.isFinite(num)) return "0.00";
    return num.toFixed(2);
};
/* ========= Helpers – normalize data like AdminOverview ========= */
const pick = (obj, paths, fallback = undefined) => {
    for (const p of paths) {
        try {
            const val = p.split(".").reduce((o, k) => (o ?? {})[k], obj);
            if (val !== undefined && val !== null) return val;
            // eslint-disable-next-line no-empty
        } catch (_) { }
    }
    return fallback;
};


function normalizeMonthlySwaps(raw) {
    // raw is payload from /Overview/admin-overview
    const bsm =
        pick(
            raw,
            [
                "batterySwapMonthly.batterySwapMonthlyLists",
                "batterySwapMonthly",
                "swaps.monthly",
                "monthlySwaps",
            ],
            []
        ) || [];
    const arr = Array.isArray(bsm)
        ? bsm
        : Array.isArray(bsm?.batterySwapMonthlyLists)
            ? bsm.batterySwapMonthlyLists
            : [];

    return arr.map((m) => {
        const mNum =
            Number(m?.month ?? m?.m ?? m?.idx) ||
            (typeof m?.month === "string"
                ? Math.max(1, MONTH_LABELS.findIndex((x) => x === m.month) + 1)
                : 0);
        const monthLabel =
            MONTH_LABELS[(Math.max(1, Math.min(12, mNum)) - 1) || 0] || "—";
        const swaps = Number(
            m?.batterySwapInMonth ?? m?.count ?? m?.swaps ?? m?.total ?? 0
        );
        return { month: monthLabel, swaps };
    });
}


/* ==================================================================== */

export default function Stations() {
    // ===== Chart (Overview) =====
    const [loadingChart, setLoadingChart] = useState(true);
    const [chartErr, setChartErr] = useState("");
    const [monthlySwapsData, setMonthlySwapsData] = useState([]);

    useEffect(() => {
        const load = async () => {
            setLoadingChart(true);
            setChartErr("");
            try {
                const token = localStorage.getItem("token");
                const res = await api.get("Overview/admin-overview", {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
                const raw = res?.data?.data ?? res?.data ?? null;
                const normalized = normalizeMonthlySwaps(raw);
                setMonthlySwapsData(Array.isArray(normalized) ? normalized : []);
            } catch (e) {
                console.error("Stations chart fetch error:", e?.response?.data || e);
                setChartErr("Failed to load chart data.");
            } finally {
                setLoadingChart(false);
            }
        };
        load();
    }, []);

    const barEmpty = monthlySwapsData.length === 0;

    const avg = useMemo(() => {
        if (!monthlySwapsData.length) return 0;
        const sum = monthlySwapsData.reduce((s, i) => s + (i.swaps || 0), 0);
        return Math.round(sum / monthlySwapsData.length);
    }, [monthlySwapsData]);

    const CustomBarTooltip = ({ active, payload, label }) =>
        active && payload?.length ? (
            <div className="bg-white p-3 rounded-lg shadow-lg border">
                <p className="font-semibold">{label}</p>
                <p className="text-sm text-gray-600">
                    {formatNumber(payload[0].value)} swaps
                </p>
            </div>
        ) : null;

    // ===== Stations list (BE) =====
    const [stations, setStations] = useState([]);
    const [loadingStations, setLoadingStations] = useState(true);
    const [stationsErr, setStationsErr] = useState("");

    const stationOptions = useMemo(
        () =>
            stations.map((s) => ({
                stationId: s.stationId,
                stationName: s.stationName,
                stationAddress: s.stationAddress,
                totalBattery: s.totalBattery,
                availablePercent: s.availablePercent,
                batteryAvailable: s.batteryAvailable,
            })),
        [stations]
    );

    const loadStations = useCallback(async () => {
        setLoadingStations(true);
        setStationsErr("");
        try {
            const token = localStorage.getItem("token");
            const res = await api.get("Station/station-list", {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            const data = Array.isArray(res?.data?.data) ? res.data.data : [];
            setStations(data);
        } catch (e) {
            console.error("station-list error:", e?.response?.data || e);
            setStationsErr("Failed to load station list.");
            setStations([]); // fallback empty
        } finally {
            setLoadingStations(false);
        }
    }, []);

    useEffect(() => {
        loadStations();
    }, [loadStations]);

    // ===== Inventory for transfer (BE) =====
    const [inventory, setInventory] = useState([]); // flattened battery list
    const [inventoryStations, setInventoryStations] = useState([]); // stations that have batteries (Source options)
    const [loadingInv, setLoadingInv] = useState(true);
    const [invErr, setInvErr] = useState("");

    const loadInv = useCallback(async () => {
        setLoadingInv(true);
        setInvErr("");
        try {
            const token = localStorage.getItem("token");
            const res = await api.get("Station/station-active", {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });

            // Parse shape
            const root = res?.data?.data || {};
            const stationsArr = Array.isArray(root.activeStationsLeft)
                ? root.activeStationsLeft
                : [];

            // list of stations with batteries (dropdown Source)
            const srcStations = stationsArr.map((s) => ({
                stationId: s.stationId,
                stationName: s.stationName,
            }));
            setInventoryStations(srcStations);

            // flatten batteryList & attach stationName
            const flat = [];
            stationsArr.forEach((s) => {
                (s.batteryList || []).forEach((b) => {
                    flat.push({
                        ...b,
                        stationName: s.stationName,
                    });
                });
            });
            setInventory(flat);
        } catch (e) {
            console.error("inventory-for-transfer error:", e?.response?.data || e);
            setInvErr("Failed to load batteries for allocation.");
            setInventory([]);
            setInventoryStations([]);
        } finally {
            setLoadingInv(false);
        }
    }, []);

    useEffect(() => {
        loadInv();
    }, [loadInv]);

    // ===== Allocation state =====
    const [fromStation, setFromStation] = useState(""); // Source filter (required to show list)
    const [toStation, setToStation] = useState(""); // must choose destination
    const [reason, setReason] = useState(""); // Reason optional
    const [transferring, setTransferring] = useState(false);

    const [selectedBatteryIds, setSelectedBatteryIds] = useState(new Set());

    // ===== Search & Pagination for inventory =====
    const [searchText, setSearchText] = useState(""); // search battery/status/station
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // ================== Create Station (Modal + Form) ==================
    const [showCreate, setShowCreate] = useState(false);
    const [creating, setCreating] = useState(false);
    const [createErr, setCreateErr] = useState("");

    const [form, setForm] = useState({
        stationName: "",
        address: "",
        numberOfPillar: 1,
        openTime: "08:00", // HH:mm
        closeTime: "22:00", // HH:mm
        pillarCapicity: 1, // keep BE key exactly
    });

    const onChangeForm = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    const validateForm = () => {
        const name = form.stationName.trim();
        const addr = form.address.trim();
        const open = form.openTime.trim();
        const close = form.closeTime.trim();
        const pillars = Number(form.numberOfPillar);
        const cap = Number(form.pillarCapicity);

        if (!name) return "Please enter Station Name.";
        if (!addr) return "Please enter Address.";
        if (!/^\d{2}:\d{2}$/.test(open))
            return "Open Time must be in HH:mm format (e.g., 08:00).";
        if (!/^\d{2}:\d{2}$/.test(close))
            return "Close Time must be in HH:mm format (e.g., 22:00).";
        if (!Number.isInteger(pillars) || pillars < 1)
            return "Number of Pillar must be an integer ≥ 1.";
        if (!Number.isInteger(cap) || cap < 1)
            return "Pillar Capacity must be an integer ≥ 1.";
        return "";
    };

    const handleCreateStation = async () => {
        const err = validateForm();
        if (err) {
            setCreateErr(err);
            return;
        }
        setCreateErr("");

        const payload = {
            stationName: form.stationName.trim(),
            address: form.address.trim(),
            numberOfPillar: Number(form.numberOfPillar),
            openTime: form.openTime.trim(),
            closeTime: form.closeTime.trim(),
            pillarCapicity: Number(form.pillarCapicity),
        };

        try {
            setCreating(true);
            const token = localStorage.getItem("token");
            await api.post("Station/create-new-station", payload, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });

            alert("Create station successfully!");
            setShowCreate(false);
            // light form reset
            setForm({
                stationName: "",
                address: "",
                numberOfPillar: 1,
                openTime: "08:00",
                closeTime: "22:00",
                pillarCapicity: 1,
            });
            // refresh station list
            await loadStations();
        } catch (e) {
            console.error("create-new-station error:", e?.response?.data || e);

            const data = e?.response?.data;
            let msg = "";

            // ✅ Prefer ASP.NET validation errors
            if (data?.errors && typeof data.errors === "object") {
                const parts = [];

                Object.entries(data.errors).forEach(([field, messages]) => {
                    if (Array.isArray(messages)) {
                        messages.forEach((m) => parts.push(m));
                    } else if (messages) {
                        parts.push(String(messages));
                    }
                });

                msg = parts.join("\n"); // or " • " if you want inline
            }

            // Fallback if no errors[] available
            if (!msg) {
                msg =
                    data?.message ||
                    data?.title ||
                    e?.message ||
                    "Create station failed.";
            }

            setCreateErr(msg);
        } finally {
            setCreating(false);
        }
    };
    // ======================================================================

    // reset page when filter/search changes
    useEffect(() => {
        setPage(1);
    }, [fromStation, searchText]);

    const inventoryFiltered = useMemo(() => {
        // MUST select source station, otherwise hide batteries
        if (!fromStation) return [];

        // filter by source station
        let list = inventory.filter(
            (b) => String(b.stationId) === String(fromStation)
        );

        // search by batteryId | status | stationId | stationName
        const q = searchText.trim().toLowerCase();
        if (q) {
            list = list.filter((b) => {
                const id = String(b.batteryId || "").toLowerCase();
                const st = String(b.status || "").toLowerCase();
                const sid = String(b.stationId || "").toLowerCase();
                const sname = String(b.stationName || "").toLowerCase();
                return (
                    id.includes(q) ||
                    st.includes(q) ||
                    sid.includes(q) ||
                    sname.includes(q)
                );
            });
        }
        return list;
    }, [inventory, fromStation, searchText]);

    const totalPages = useMemo(
        () => Math.max(1, Math.ceil(inventoryFiltered.length / pageSize)),
        [inventoryFiltered.length, pageSize]
    );

    const pagedInventory = useMemo(() => {
        const start = (page - 1) * pageSize;
        return inventoryFiltered.slice(start, start + pageSize);
    }, [inventoryFiltered, page, pageSize]);

    const toggleSelect = (batteryId) => {
        setSelectedBatteryIds((prev) => {
            const next = new Set(prev);
            if (next.has(batteryId)) next.delete(batteryId);
            else next.add(batteryId);
            return next;
        });
    };

    const selectAllInFilter = () => {
        const next = new Set(selectedBatteryIds);
        inventoryFiltered.forEach((b) => next.add(b.batteryId));
        setSelectedBatteryIds(next);
    };
    const selectAllInPage = () => {
        const next = new Set(selectedBatteryIds);
        pagedInventory.forEach((b) => next.add(b.batteryId));
        setSelectedBatteryIds(next);
    };
    const clearAllSelection = () => setSelectedBatteryIds(new Set());

    // Helper: get station name by id (fallback to id if not found)
    const getStationNameById = (id) => {
        if (!id) return "";
        const match =
            stationOptions.find((s) => String(s.stationId) === String(id)) ||
            inventoryStations.find((s) => String(s.stationId) === String(id));
        return match?.stationName || String(id);
    };

    const handleTransfer = async () => {
        if (!toStation) {
            alert("Please choose destination station.");
            return;
        }
        if (selectedBatteryIds.size === 0) {
            alert("Please choose at least one battery to allocate.");
            return;
        }

        // Determine stationFrom:
        let src = fromStation;
        if (!src) {
            // infer from selected batteries
            const stationSet = new Set(
                inventory
                    .filter((b) => selectedBatteryIds.has(b.batteryId))
                    .map((b) => String(b.stationId))
            );
            if (stationSet.size === 0) {
                alert("Source station not identified. Please select Source (filter).");
                return;
            }
            if (stationSet.size > 1) {
                alert(
                    "You are selecting batteries from multiple stations. Please filter to 1 source station."
                );
                return;
            }
            src = Array.from(stationSet)[0];
        }

        if (src === toStation) {
            alert("Source and destination stations cannot be the same.");
            return;
        }

        const payload = {
            stationFrom: src,
            stationTo: toStation,
            batId: Array.from(selectedBatteryIds),
            reason: reason?.trim() || "Station rebalancing",
            createBy: localStorage.getItem("userId") || "admin",
        };

        // NEW: resolve station names for alert
        const fromName = getStationNameById(src);
        const toName = getStationNameById(toStation);

        try {
            setTransferring(true);
            const token = localStorage.getItem("token");
            await api.post("BatterySwap/transfer-battery", payload, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });

            alert(
                `Scheduled allocation of ${payload.batId.length} batteries from ${fromName} → ${toName}.`
            );

            // refresh inventory & clear selections
            setSelectedBatteryIds(new Set());
            setReason("");
            await loadInv();
            await loadStations();
        } catch (e) {
            console.error("transfer-battery error:", e?.response?.data || e);
            const msg =
                e?.response?.data?.message ||
                e?.response?.data ||
                e?.message ||
                "Battery allocation failed.";
            alert("❌ " + msg);
        } finally {
            setTransferring(false);
        }
    };


    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                    <p className="text-gray-600">Battery Swap Station Management</p>
                </div>
                <div className="flex gap-2">
                    <button
                        className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 flex items-center"
                        onClick={() => {
                            setCreateErr("");
                            setShowCreate(true);
                        }}
                    >
                        <i className="bi bi-plus-lg"></i>
                        <span className="ml-2">Add New Station</span>
                    </button>
                </div>
            </div>

            {/* Bar Chart */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                    Swap Activity by Month
                </h2>

                {loadingChart ? (
                    <div className="text-gray-500 text-center py-12">
                        <div className="h-8 w-8 mx-auto mb-2 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
                        Loading chart...
                    </div>
                ) : chartErr ? (
                    <div className="text-red-600 text-center py-8">{chartErr}</div>
                ) : (
                    <>
                        <div className="h-80">
                            {barEmpty ? (
                                <div className="h-full flex items-center justify-center text-sm text-gray-500">
                                    No monthly swap data.
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={monthlySwapsData}
                                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                        <XAxis
                                            dataKey="month"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 12, fill: "#6b7280" }}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 12, fill: "#6b7280" }}
                                        />
                                        <Tooltip content={<CustomBarTooltip />} />
                                        <Bar
                                            dataKey="swaps"
                                            fill="#3B82F6"
                                            radius={[4, 4, 0, 0]}
                                            className="hover:opacity-80 transition-opacity duration-200"
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                            <span>Average: {formatNumber(avg)} swaps/month</span>
                            <span className="text-green-600 font-medium">↗ up-to-date</span>
                        </div>
                    </>
                )}
            </div>

            {/* Battery Allocation (BE data, checkbox) */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                    Battery Allocation Between Stations
                </h2>

                {/* Controls */}
                <div className="grid md:grid-cols-3 gap-4 mb-4">
                    <div>
                        <label className="block text-sm text-gray-700 mb-1">
                            Source (filter)
                        </label>
                        <select
                            className="w-full border rounded-lg px-3 py-2"
                            value={fromStation}
                            onChange={(e) => {
                                setFromStation(e.target.value);
                                setSelectedBatteryIds(new Set());
                            }}
                        >
                            <option value="">All stations</option>
                            {(inventoryStations.length ? inventoryStations : stationOptions).map(
                                (st) => (
                                    <option key={st.stationId} value={st.stationId}>
                                        {st.stationName} ({st.stationId})
                                    </option>
                                )
                            )}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm text-gray-700 mb-1">
                            Destination
                        </label>
                        <select
                            className="w-full border rounded-lg px-3 py-2"
                            value={toStation}
                            onChange={(e) => setToStation(e.target.value)}
                        >
                            <option value="">Select destination</option>
                            {stationOptions.map((st) => (
                                <option key={st.stationId} value={st.stationId}>
                                    {st.stationName} ({st.stationId})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm text-gray-700 mb-1">
                            Reason (optional)
                        </label>
                        <input
                            className="w-full border rounded-lg px-3 py-2"
                            placeholder="E.g. Rebalance stock"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </div>
                </div>

                {/* Search + page size (hidden until Source selected) */}
                {!fromStation ? (
                    <div className="mb-3 text-sm text-gray-500">
                        Please select <b>Source (filter)</b> above to view the batteries list.
                    </div>
                ) : (
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                        <div className="relative">
                            <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                className="pl-10 pr-3 py-2 border rounded-lg"
                                placeholder="Search by BatteryId / Status / Station…"
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Show</span>
                            <select
                                className="border rounded-lg px-2 py-1"
                                value={pageSize}
                                onChange={(e) => setPageSize(Number(e.target.value))}
                            >
                                <option value={5}>5</option>
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                            </select>
                            <span className="text-sm text-gray-600">per page</span>
                        </div>

                        <div className="ml-auto flex items-center gap-2">
                            <button
                                className="px-3 py-2 border rounded-lg hover:bg-gray-50"
                                onClick={selectAllInPage}
                                disabled={loadingInv || pagedInventory.length === 0}
                            >
                                Select all (page)
                            </button>
                            <button
                                className="px-3 py-2 border rounded-lg hover:bg-gray-50"
                                onClick={selectAllInFilter}
                                disabled={loadingInv || inventoryFiltered.length === 0}
                            >
                                Select all (filter)
                            </button>
                            <button
                                className="px-3 py-2 border rounded-lg hover:bg-gray-50"
                                onClick={clearAllSelection}
                                disabled={selectedBatteryIds.size === 0}
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                )}

                {/* Inventory table (PAGED) */}
                {loadingInv ? (
                    <div className="text-gray-500 text-center py-8">
                        <div className="h-8 w-8 mx-auto mb-2 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
                        Loading batteries...
                    </div>
                ) : invErr ? (
                    <div className="text-red-600">{invErr}</div>
                ) : !fromStation ? (
                    <div className="text-gray-500">
                        Please select <b>Source (filter)</b> to display batteries at that
                        station.
                    </div>
                ) : inventoryFiltered.length === 0 ? (
                    <div className="text-gray-500">
                        No batteries match the current filter.
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto border rounded-lg">
                            <table className="min-w-full text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="p-2 text-left">Select</th>
                                        <th className="p-2 text-left">BatteryId</th>
                                        <th className="p-2 text-left">Status</th>
                                        <th className="p-2 text-left">SoC</th>
                                        <th className="p-2 text-left">SoH</th>
                                        <th className="p-2 text-left">Capacity</th>
                                        <th className="p-2 text-left">Station</th>
                                        <th className="p-2 text-left">Station Name</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pagedInventory.map((b) => {
                                        const checked = selectedBatteryIds.has(b.batteryId);
                                        return (
                                            <tr key={b.batteryId} className="border-t">
                                                <td className="p-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={() => toggleSelect(b.batteryId)}
                                                    />
                                                </td>
                                                <td className="p-2 font-medium">{b.batteryId}</td>
                                                <td className="p-2">{b.status}</td>
                                                <td className="p-2">{b.soc}%</td>
                                                <td className="p-2">{b.soh}</td>
                                                <td className="p-2">{b.capacity}</td>
                                                <td className="p-2">{b.stationId}</td>
                                                <td className="p-2">{b.stationName}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination controls */}
                        <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
                            <div className="text-sm text-gray-600">
                                Total: <b>{inventoryFiltered.length}</b> batteries • Page{" "}
                                <b>{page}</b>/<b>{totalPages}</b>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    className="px-3 py-2 border rounded-lg hover:bg-gray-50"
                                    onClick={() => setPage(1)}
                                    disabled={page === 1}
                                >
                                    « First
                                </button>
                                <button
                                    className="px-3 py-2 border rounded-lg hover:bg-gray-50"
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                >
                                    ‹ Prev
                                </button>
                                <span className="px-2 text-sm text-gray-700">
                                    Page {page}
                                </span>
                                <button
                                    className="px-3 py-2 border rounded-lg hover:bg-gray-50"
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                >
                                    Next ›
                                </button>
                                <button
                                    className="px-3 py-2 border rounded-lg hover:bg-gray-50"
                                    onClick={() => setPage(totalPages)}
                                    disabled={page === totalPages}
                                >
                                    Last »
                                </button>
                            </div>
                        </div>
                    </>
                )}

                <div className="mt-4 flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                        Selected: <b>{selectedBatteryIds.size}</b> batteries
                    </div>
                    <button
                        className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-60"
                        onClick={handleTransfer}
                        disabled={
                            transferring ||
                            loadingInv ||
                            selectedBatteryIds.size === 0 ||
                            !toStation
                        }
                    >
                        {transferring ? "Scheduling..." : "Schedule Battery Transfer"}
                    </button>
                </div>
            </div>

            {/* Stations List (from /Station/station-list) */}
            <div className="grid lg:grid-cols-2 gap-6">
                {loadingStations ? (
                    <div className="col-span-2 text-center text-gray-500 py-8">
                        <div className="h-8 w-8 mx-auto mb-2 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
                        Loading stations...
                    </div>
                ) : stationsErr ? (
                    <div className="col-span-2 text-center text-red-600">
                        {stationsErr}
                    </div>
                ) : stations.length === 0 ? (
                    <div className="col-span-2 text-center text-gray-500">
                        No stations found.
                    </div>
                ) : (
                    stationOptions.map((st) => (
                        <div key={st.stationId} className="bg-white rounded-lg shadow p-6">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        {st.stationName}
                                    </h3>
                                    <p className="text-sm text-gray-600">{st.stationAddress}</p>
                                </div>
                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                    Online
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-center">
                                <div className="bg-blue-50 p-4 rounded-lg">
                                    <i className="bi bi-battery-full text-2xl text-blue-700"></i>
                                    <p className="mt-2 text-xl font-bold">
                                        {st.batteryAvailable}/{st.totalBattery}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        Available batteries
                                    </p>
                                </div>
                                <div className="bg-green-50 p-4 rounded-lg">
                                    <i className="bi bi-activity text-2xl text-green-700"></i>
                                    <p className="mt-2 text-xl font-bold">
                                        {formatPercent(st.availablePercent)}%
                                    </p>

                                    <p className="text-sm text-gray-600">Availability</p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* =============== CREATE STATION MODAL =============== */}
            {showCreate && (
                <div
                    className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                    onClick={() => !creating && setShowCreate(false)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-5 border-b flex items-center justify-between">
                            <h3 className="text-xl font-semibold">Create New Station</h3>
                            <button
                                className="p-2 rounded-lg hover:bg-gray-100"
                                onClick={() => !creating && setShowCreate(false)}
                            >
                                <i className="bi bi-x-lg" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {createErr && (
                                <div className="p-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">
                                    {createErr}
                                </div>
                            )}

                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-700 mb-1">
                                        Station Name
                                    </label>
                                    <input
                                        className="w-full border rounded-lg px-3 py-2"
                                        value={form.stationName}
                                        onChange={(e) =>
                                            onChangeForm("stationName", e.target.value)
                                        }
                                        placeholder="E.g. EVSwap - District 1"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-700 mb-1">
                                        Address
                                    </label>
                                    <input
                                        className="w-full border rounded-lg px-3 py-2"
                                        value={form.address}
                                        onChange={(e) =>
                                            onChangeForm("address", e.target.value)
                                        }
                                        placeholder="123 Le Loi, District 1, HCMC"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-700 mb-1">
                                        Number of Pillar
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        className="w-full border rounded-lg px-3 py-2"
                                        value={form.numberOfPillar}
                                        onChange={(e) =>
                                            onChangeForm("numberOfPillar", e.target.value)
                                        }
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-700 mb-1">
                                        Pillar Capacity (per pillar)
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        className="w-full border rounded-lg px-3 py-2"
                                        value={form.pillarCapicity}
                                        onChange={(e) =>
                                            onChangeForm("pillarCapicity", e.target.value)
                                        }
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-700 mb-1">
                                        Open Time
                                    </label>
                                    <input
                                        type="time"
                                        className="w-full border rounded-lg px-3 py-2"
                                        value={form.openTime}
                                        onChange={(e) =>
                                            onChangeForm("openTime", e.target.value)
                                        }
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-700 mb-1">
                                        Close Time
                                    </label>
                                    <input
                                        type="time"
                                        className="w-full border rounded-lg px-3 py-2"
                                        value={form.closeTime}
                                        onChange={(e) =>
                                            onChangeForm("closeTime", e.target.value)
                                        }
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-5 border-t flex justify-end gap-2">
                            <button
                                className="px-4 py-2 rounded-lg border"
                                onClick={() => setShowCreate(false)}
                                disabled={creating}
                            >
                                Cancel
                            </button>
                            <button
                                className="px-4 py-2 rounded-lg bg-gray-900 text-white disabled:opacity-50"
                                onClick={handleCreateStation}
                                disabled={creating}
                            >
                                {creating ? "Creating..." : "Create"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* ==================================================== */}
        </div>
    );
}
