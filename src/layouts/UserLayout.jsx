import React from "react";
import { Outlet } from "react-router-dom";
import NavbarTop from "../components/NavbarTop";
import SubNavbar from "../components/SubNavbar";

export default function UserLayout() {
    return (
        <>
            <NavbarTop />
            <SubNavbar />
            <div className="container-fluid p-4">
                <Outlet /> {/* nơi hiển thị từng trang con */}
            </div>
        </>
    );
}
