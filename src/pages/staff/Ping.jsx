// src/pages/Ping.jsx
import React from "react";
export default function Ping() {
    return (
        <div style={{
            padding: 24, border: "1px dashed #9ca3af", borderRadius: 12,
            background: "#ffffff", fontFamily: "system-ui"
        }}>
            <h2 style={{ margin: 0 }}>✅ Router OK</h2>
            <p style={{ marginTop: 8 }}>Nếu bạn thấy khung này thì layout/route đang chạy bình thường.</p>
        </div>
    );
}
