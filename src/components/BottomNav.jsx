import React from "react";
import { NavLink } from "react-router-dom";

function BottomNav({setLoading}) {
  return (
      <div className="bottom-nav">
        <NavLink
          to="/"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
        >
          <i className="fas fa-crown" />
          <span>Premium</span> 
        </NavLink>
        <NavLink
          to="/surveys"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
        >
          <i className="fas fa-poll" />
          <span>Surveys</span>
        </NavLink>
        <NavLink
          to="/history"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
        >
          <i className="fas fa-history" />
          <span>History</span>
        </NavLink>
        <NavLink
          to="/profile"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
        >
          <i className="fas fa-user" />
          <span>Profile</span>
        </NavLink>
      </div>
  );
}

export default BottomNav;
