import axios from "axios";

const base = import.meta.env.VITE_API_BASE_URL; // https://xxxx.ngrok-free.app

const api = axios.create({
  baseURL: `${base}/api`,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  config.headers["ngrok-skip-browser-warning"] = "true";
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;

// import axios from "axios";
// import MockAdapter from "axios-mock-adapter";
// // ⚙️ Tạo axios instance
// const api = axios.create({
//   baseURL: "https://mock.voltswap/api",
//   headers: { "Content-Type": "application/json" },
// });

// // 🧪 Mock Adapter
// const mock = new MockAdapter(api, { delayResponse: 600 });

// // ==============================
// // 🧍 AUTH ENDPOINTS
// // ==============================
// const users = [
//   {
//     email: "admin@evstation.com",
//     password: "admin123",
//     name: "Admin",
//     role: "Admin",
//   },
//   {
//     email: "driver@volt.com",
//     password: "123456",
//     name: "Driver",
//     role: "Driver",
//   },
// ];

// mock.onPost("/login").reply((config) => {
//   const { Email, Password } = JSON.parse(config.data);
//   const user = users.find((u) => u.email === Email && u.password === Password);
//   if (user) {
//     return [
//       200,
//       {
//         message: "Login successful",
//         token: "fake-jwt-token-" + user.role,
//         user,
//       },
//     ];
//   } else {
//     return [401, { message: "Invalid email or password" }];
//   }
// });

// mock
//   .onPost("/register")
//   .reply(200, { message: "Account created successfully" });
// mock.onPost("/forgot-password").reply(200, {
//   message: "Reset link sent successfully",
// });

// // ==============================
// // 🔋 SUBSCRIPTION ENDPOINTS
// // ==============================

// const subscriptions = [
//   {
//     planId: "PLAN-00001",
//     planName: "G1",
//     durationDays: 30,
//     milleageBaseUsed: 400,
//     swapLimit: 0,
//     price: 300000,
//     status: "inactive",
//     batteries: 1,
//     expireDate: "2025-12-31",
//   },
//   {
//     planId: "PLAN-00002",
//     planName: "G2",
//     durationDays: 30,
//     milleageBaseUsed: 800,
//     swapLimit: 0,
//     price: 450000,
//     status: "inactive",
//     batteries: 2,
//     expireDate: "2025-12-31",
//   },
//   {
//     planId: "PLAN-00003",
//     planName: "G3",
//     durationDays: 30,
//     milleageBaseUsed: 1200,
//     swapLimit: 0,
//     price: 850000,
//     status: "inactive",
//     batteries: 3,
//     expireDate: "2025-12-31",
//   },
//   {
//     planId: "PLAN-00004",
//     planName: "GU",
//     durationDays: 30,
//     milleageBaseUsed: null,
//     swapLimit: 0,
//     price: 3000000,
//     status: "active",
//     batteries: 3,
//     expireDate: "2025-12-31",
//   },
//   {
//     planId: "PLAN-00005",
//     planName: "TP1",
//     durationDays: 30,
//     milleageBaseUsed: 300,
//     swapLimit: 0,
//     price: 250000,
//     status: "inactive",
//     batteries: 1,
//     expireDate: "2025-12-31",
//   },
//   {
//     planId: "PLAN-00006",
//     planName: "TP2",
//     durationDays: 30,
//     milleageBaseUsed: 800,
//     swapLimit: 0,
//     price: 400000,
//     status: "inactive",
//     batteries: 2,
//     expireDate: "2025-12-31",
//   },
//   {
//     planId: "PLAN-00007",
//     planName: "TP3",
//     durationDays: 30,
//     milleageBaseUsed: 900,
//     swapLimit: 0,
//     price: 800000,
//     status: "inactive",
//     batteries: 3,
//     expireDate: "2025-12-31",
//   },
//   {
//     planId: "PLAN-00008",
//     planName: "TP4U",
//     durationDays: 30,
//     milleageBaseUsed: null,
//     swapLimit: 0,
//     price: 2500000,
//     status: "inactive",
//     batteries: 3,
//     expireDate: "2025-12-31",
//   },
// ];

// // 📦 GetAll
// mock.onGet("/Subscription/GetAll").reply(200, subscriptions);

// // 📦 Get/:id
// mock.onGet(/\/Subscription\/Get\/\w+/).reply((config) => {
//   const id = config.url.split("/").pop();
//   const sub = subscriptions.find((s) => s.id === id);
//   return sub ? [200, sub] : [404, { message: "Not found" }];
// });

// // ➕ Register
// mock.onPost("/Subscription/Register").reply((config) => {
//   const { planId, planName, price } = JSON.parse(config.data);

//   // Kiểm tra nếu gói đã có → active lại
//   const existingIndex = subscriptions.findIndex((s) => s.planId === planId);
//   if (existingIndex !== -1) {
//     subscriptions.forEach((s) => (s.status = "inactive"));
//     subscriptions[existingIndex].status = "active";
//   }

//   // 💸 Tạo giao dịch
//   const newTx = {
//     id: "T" + Date.now(),
//     title: `Register ${planName}`,
//     amount: price,
//     date: new Date().toISOString().split("T")[0],
//     status: price > 0 ? "Unpaid" : "Paid",
//   };
//   transactions.push(newTx);

//   return [200, { message: "Registered successfully" }];
// });

// // 🔁 Change Plan
// mock.onPut(/\/Subscription\/ChangePlan\/\w+/).reply((config) => {
//   const { newPlanId } = JSON.parse(config.data);
//   subscriptions.forEach((s) => {
//     s.status = s.planId === newPlanId ? "active" : "inactive";
//   });

//   const plan = subscriptions.find((s) => s.planId === newPlanId);
//   const newTx = {
//     id: "T" + Date.now(),
//     title: `Change to ${plan.planName}`,
//     amount: plan.price,
//     date: new Date().toISOString().split("T")[0],
//     status: plan.price > 0 ? "Unpaid" : "Paid",
//   };
//   transactions.push(newTx);

//   return [200, { message: "Plan changed successfully" }];
// });

// // ❌ Delete
// mock.onDelete(/\/Subscription\/Delete\/\w+/).reply((config) => {
//   const id = config.url.split("/").pop();
//   const index = subscriptions.findIndex((s) => s.id === id);
//   if (index !== -1) subscriptions.splice(index, 1);
//   return [200, { message: "Deleted successfully" }];
// });

// // ==============================
// // 🚙 VEHICLE ENDPOINTS
// // ==============================
// const vehicles = [
//   { id: "V1", name: "EV Scooter 01", model: "VoltX", battery: "BATT-01" },
//   { id: "V2", name: "EV Scooter 02", model: "VoltS", battery: "BATT-02" },
// ];
// mock.onGet("/Vehicle/GetAll").reply(200, vehicles);
// // ➕ Add
// mock.onPost("/Vehicle/Add").reply((config) => {
//   const data = JSON.parse(config.data);
//   const newVehicle = {
//     id: "V" + (vehicles.length + 1),
//     ...data,
//   };
//   vehicles.push(newVehicle);
//   return [200, newVehicle];
// });

// // ❌ Delete
// mock.onDelete(/\/Vehicle\/Delete\/\w+/).reply((config) => {
//   const id = config.url.split("/").pop();
//   const index = vehicles.findIndex((v) => v.id === id);
//   if (index !== -1) vehicles.splice(index, 1);
//   return [200, { message: "Vehicle deleted successfully" }];
// });

// // ==============================
// // 💸 TRANSACTION ENDPOINTS (NEW STRUCTURE)
// // ==============================
// const transactions = [
//   {
//     transactionId: "T1",
//     amount: 80000,
//     paymentDate: "2025-10-10",
//     paymentStatus: "Paid",
//     transactionNote: "Station A",
//   },
//   {
//     transactionId: "T2",
//     amount: 65000,
//     paymentDate: "2025-09-28",
//     paymentStatus: "Paid",
//     transactionNote: "Station B",
//   },
// ];

// // 📄 GetAll
// mock.onGet("/Transaction/GetAll").reply(200, transactions);

// // 📄 Get/{id}
// mock.onGet(/\/Transaction\/Get\/\w+/).reply((config) => {
//   const id = config.url.split("/").pop();
//   const tx = transactions.find((t) => t.transactionId === id);
//   return tx ? [200, tx] : [404, { message: "Transaction not found" }];
// });

// // ➕ Create Transaction
// mock.onPost("/Transaction/Create").reply((config) => {
//   const { driverId, planId, amount, fee, transactionType } = JSON.parse(
//     config.data
//   );

//   // 🧾 Tạo transaction mới
//   const newTx = {
//     transactionId: "T" + Date.now(),
//     amount: amount || 0,
//     paymentDate: new Date().toISOString().split("T")[0],
//     paymentStatus: amount > 0 ? "Unpaid" : "Paid",
//     transactionNote: `${transactionType} ${planId}`,
//   };

//   transactions.push(newTx);
//   return [200, { message: "Transaction created successfully", data: newTx }];
// });

// // 💳 Pay Transaction
// mock.onPut(/\/Transaction\/Pay\/\w+/).reply((config) => {
//   const id = config.url.split("/").pop();
//   const tx = transactions.find((t) => t.transactionId === id);

//   if (!tx) {
//     return [404, { message: "Transaction not found" }];
//   }

//   tx.paymentStatus = "Paid";
//   tx.paymentDate = new Date().toISOString().split("T")[0];

//   return [200, { message: "Payment successful", data: tx }];
// });
// // ==============================
// // 📍 STATION ENDPOINTS
// // ==============================
// const stations = [
//   { id: "ST01", name: "VoltSwap Hà Nội", slots: 12, available: 8 },
//   { id: "ST02", name: "VoltSwap Đà Nẵng", slots: 10, available: 4 },
//   { id: "ST03", name: "VoltSwap HCM", slots: 14, available: 12 },
// ];
// mock.onGet("/Station/GetAll").reply(200, stations);

// // ==============================
// // 🧾 SUPPORT ENDPOINTS
// // ==============================
// const supportTickets = [
//   {
//     id: "S1",
//     subject: "Unable to login to VoltSwap app",
//     status: "Resolved",
//   },
//   {
//     id: "S2",
//     subject: "Battery swap station unavailable",
//     status: "Pending",
//   },
// ];

// // 📄 GetAll
// mock.onGet("/Support/GetAll").reply(200, supportTickets);

// // 📨 Create
// mock.onPost("/Support/Create").reply((config) => {
//   const newTicket = JSON.parse(config.data);
//   const created = {
//     id: "S" + (supportTickets.length + 1),
//     subject: newTicket.subject || "No subject",
//     status: newTicket.status || "Pending",
//   };
//   supportTickets.push(created);
//   return [200, created];
// });
// export default api;
