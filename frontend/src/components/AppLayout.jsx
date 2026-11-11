import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { getMenu } from '../api/menu.js';
import { useAuth } from '../context/AuthContext.jsx';
import ApiErrorMessage from './ApiErrorMessage.jsx';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menu, setMenu] = useState([]);
  const [menuError, setMenuError] = useState(null);
  const [menuLoading, setMenuLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({});

  useEffect(() => {
    let active = true;
    getMenu()
      .then((result) => {
        if (active) setMenu(Array.isArray(result) ? result : []);
      })
      .catch((error) => {
        if (active) setMenuError(error);
      })
      .finally(() => {
        if (active) setMenuLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function toggleMenu(id) {
    setExpandedMenus((current) => ({ ...current, [id]: !current[id] }));
  }

  function signOut() {
    logout();
    navigate('/login', { replace: true });
  }

  const contactsInMenu = menu.some((item) =>
    (item.programas || []).some((programa) =>
      ['/contactos', 'contactos'].includes(programa.ruta)
    )
  );
  const consultationsInMenu = menu.some((item) =>
    (item.programas || []).some((programa) =>
      ['/consultas', 'consultas'].includes(programa.ruta)
    )
  );
  const propertiesInMenu = menu.some((item) =>
    (item.programas || []).some((programa) =>
      ['/propiedades', 'propiedades'].includes(programa.ruta)
    )
  );
  const operationsInMenu = menu.some((item) =>
    (item.programas || []).some((programa) =>
      ['/operaciones', 'operaciones'].includes(programa.ruta)
    )
  );
  const contractsInMenu = menu.some((item) =>
    (item.programas || []).some((programa) =>
      ['/contratos', 'contratos'].includes(programa.ruta)
    )
  );
  const administrationInMenu = menu.some((item) =>
    (item.programas || []).some((programa) =>
      ['/administracion', 'administracion'].includes(programa.ruta)
    )
  );

  return (
    <div className="app-shell">
      <header className="topbar">
        <button
          className="menu-toggle"
          type="button"
          aria-label={drawerOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>
        <Link className="brand" to="/">CRM Inmobiliaria</Link>
        <div className="topbar-user">
          <span>{user?.nombreUsuario || 'Usuario'}</span>
          <button className="button button-quiet" type="button" onClick={signOut}>Salir</button>
        </div>
      </header>

      {drawerOpen && (
        <button
          className="drawer-backdrop"
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      <div className="app-grid">
        <aside className={`sidebar${drawerOpen ? ' sidebar-open' : ''}`}>
          <div className="sidebar-heading">Navegación</div>
          <nav aria-label="Menú principal">
            <NavLink
              to="/"
              end
              className={({ isActive }) => `nav-home${isActive ? ' active' : ''}`}
              onClick={() => setDrawerOpen(false)}
            >
              Inicio
            </NavLink>
            {!contactsInMenu && (
              <NavLink
                to="/contactos"
                className={({ isActive }) => `nav-home${isActive ? ' active' : ''}`}
                onClick={() => setDrawerOpen(false)}
              >
                Contactos
              </NavLink>
            )}
            {!consultationsInMenu && (
              <NavLink
                to="/consultas"
                className={({ isActive }) => `nav-home${isActive ? ' active' : ''}`}
                onClick={() => setDrawerOpen(false)}
              >
                Consultas
              </NavLink>
            )}
            {!propertiesInMenu && (
              <NavLink
                to="/propiedades"
                className={({ isActive }) => `nav-home${isActive ? ' active' : ''}`}
                onClick={() => setDrawerOpen(false)}
              >
                Propiedades
              </NavLink>
            )}
            {!operationsInMenu && (
              <NavLink
                to="/operaciones"
                className={({ isActive }) => `nav-home${isActive ? ' active' : ''}`}
                onClick={() => setDrawerOpen(false)}
              >
                Operaciones
              </NavLink>
            )}
            {!contractsInMenu && (
              <NavLink
                to="/contratos"
                className={({ isActive }) => `nav-home${isActive ? ' active' : ''}`}
                onClick={() => setDrawerOpen(false)}
              >
                Contratos
              </NavLink>
            )}
            {user?.perfiles?.includes('Administrador') && !administrationInMenu && (
              <NavLink
                to="/administracion"
                className={({ isActive }) => `nav-home${isActive ? ' active' : ''}`}
                onClick={() => setDrawerOpen(false)}
              >
                Administración
              </NavLink>
            )}
            {menuLoading && <p className="sidebar-message">Cargando menú…</p>}
            {menuError && <p className="sidebar-message">No se pudo cargar el menú.</p>}
            {menu.map((item) => (
              <section className="menu-group" key={item.id}>
                <button
                  type="button"
                  className="menu-group-toggle"
                  aria-expanded={Boolean(expandedMenus[item.id])}
                  onClick={() => toggleMenu(item.id)}
                >
                  <span>{item.nombre}</span>
                  <span aria-hidden="true">{expandedMenus[item.id] ? '−' : '+'}</span>
                </button>
                {expandedMenus[item.id] && (
                  <div className="submenu">
                    {(item.programas || []).map((programa) => (
                      <NavLink
                        key={programa.id}
                        to={programa.ruta || '/'}
                        className={({ isActive }) => `submenu-link${isActive ? ' active' : ''}`}
                        onClick={() => setDrawerOpen(false)}
                      >
                        {programa.nombre}
                      </NavLink>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </nav>
          <ApiErrorMessage error={menuError} />
        </aside>

        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
