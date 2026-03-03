import { NavLink } from "react-router-dom";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `navLink ${isActive ? "navLinkActive" : ""}`;

export function TopNav() {
  return (
    <div className="topNav">
      <div className="topNavInner">
        <div className="brand">
          <div className="brandMark" />
          <div>
            <div>ContinuityIQ</div>
            <div className="tiny">Enterprise continuity digital twin</div>
          </div>
        </div>

        <div className="navLinks">
          <NavLink to="/" className={linkClass} end>
            Dashboard
          </NavLink>
          <NavLink to="/twin" className={linkClass}>
            Org Twin
          </NavLink>
          <NavLink to="/simulate" className={linkClass}>
            Simulation
          </NavLink>
          <NavLink to="/integrations" className={linkClass}>
            Integrations
          </NavLink>
        </div>
      </div>
    </div>
  );
}

