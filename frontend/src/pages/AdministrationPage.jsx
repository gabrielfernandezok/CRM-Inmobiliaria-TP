import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  getAdminProfiles,
  getAdminUsers,
  getProfilePrograms,
  updateProfilePrograms,
  updateUserProfiles,
} from '../api/administracion.js';
import ApiErrorMessage from '../components/ApiErrorMessage.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { formatDate } from '../utils/format.js';

const PERMISSION_FIELDS = [
  ['puedeVer', 'Ver'],
  ['puedeCrear', 'Crear'],
  ['puedeEditar', 'Editar'],
  ['puedeEliminar', 'Eliminar'],
];

function sortedIds(ids) {
  return [...ids].sort((a, b) => a - b);
}

function sameIds(first, second) {
  return JSON.stringify(sortedIds(first)) === JSON.stringify(sortedIds(second));
}

function permissionValues(program) {
  return {
    idPrograma: program.idPrograma,
    puedeVer: program.puedeVer,
    puedeCrear: program.puedeCrear,
    puedeEditar: program.puedeEditar,
    puedeEliminar: program.puedeEliminar,
  };
}

function samePermissions(first, second) {
  return JSON.stringify(first.map(permissionValues)) === JSON.stringify(second.map(permissionValues));
}

export default function AdministrationPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [userProfileSelections, setUserProfileSelections] = useState({});
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [permissionDraft, setPermissionDraft] = useState([]);
  const [permissionOriginal, setPermissionOriginal] = useState([]);
  const [loading, setLoading] = useState(true);
  const [permissionLoading, setPermissionLoading] = useState(false);
  const [savingUserId, setSavingUserId] = useState(null);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([getAdminUsers(), getAdminProfiles()])
      .then(([userResult, profileResult]) => {
        if (!active) return;
        const availableProfiles = Array.isArray(profileResult) ? profileResult : [];
        const userRows = Array.isArray(userResult) ? userResult : [];
        const profileIdsByName = new Map(availableProfiles.map((profile) => [profile.nombre, profile.id]));
        setUsers(userRows);
        setProfiles(availableProfiles);
        setUserProfileSelections(
          Object.fromEntries(
            userRows.map((row) => [
              row.id,
              (row.perfiles || [])
                .map((profileName) => profileIdsByName.get(profileName))
                .filter((id) => id !== undefined),
            ])
          )
        );
        if (availableProfiles.length) setSelectedProfileId(String(availableProfiles[0].id));
      })
      .catch((requestError) => {
        if (active) setError(requestError);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedProfileId) {
      setPermissionDraft([]);
      setPermissionOriginal([]);
      return undefined;
    }

    let active = true;
    setPermissionLoading(true);
    setError(null);
    getProfilePrograms(selectedProfileId)
      .then((profile) => {
        if (!active) return;
        const programs = Array.isArray(profile.programas) ? profile.programas : [];
        setPermissionDraft(programs);
        setPermissionOriginal(programs);
      })
      .catch((requestError) => {
        if (active) {
          setPermissionDraft([]);
          setPermissionOriginal([]);
          setError(requestError);
        }
      })
      .finally(() => {
        if (active) setPermissionLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedProfileId]);

  const groupedPrograms = useMemo(() => {
    const groups = new Map();
    for (const program of permissionDraft) {
      const key = program.menu?.id ?? program.idMenu;
      if (!groups.has(key)) {
        groups.set(key, {
          id: key,
          name: program.menu?.nombre || 'Programas',
          programs: [],
        });
      }
      groups.get(key).programs.push(program);
    }
    return [...groups.values()];
  }, [permissionDraft]);

  const permissionsChanged = !samePermissions(permissionDraft, permissionOriginal);

  if (!user?.perfiles?.includes('Administrador')) {
    return <Navigate to="/" replace />;
  }

  function setUserProfile(userId, profileId, checked) {
    setUserProfileSelections((current) => {
      const selected = current[userId] || [];
      return {
        ...current,
        [userId]: checked
          ? [...selected, profileId]
          : selected.filter((id) => id !== profileId),
      };
    });
    setError(null);
    setSuccess('');
  }

  async function saveUserProfiles(row) {
    setSavingUserId(row.id);
    setError(null);
    setSuccess('');
    try {
      const updated = await updateUserProfiles(row.id, userProfileSelections[row.id] || []);
      setUsers((current) => current.map((item) => (item.id === row.id ? updated : item)));
      setSuccess(`Se actualizaron los perfiles de ${row.nombreUsuario}.`);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSavingUserId(null);
    }
  }

  function handleProfileChange(event) {
    if (
      permissionsChanged &&
      !window.confirm('Hay cambios de permisos sin guardar. ¿Querés descartarlos?')
    ) {
      return;
    }
    setSelectedProfileId(event.target.value);
    setError(null);
    setSuccess('');
  }

  function changePermission(programId, field, checked) {
    setPermissionDraft((current) =>
      current.map((program) =>
        program.idPrograma === programId ? { ...program, [field]: checked } : program
      )
    );
    setError(null);
    setSuccess('');
  }

  async function savePermissions(event) {
    event.preventDefault();
    setSavingPermissions(true);
    setError(null);
    setSuccess('');
    try {
      await updateProfilePrograms(
        selectedProfileId,
        permissionDraft.map(permissionValues)
      );
      const profile = await getProfilePrograms(selectedProfileId);
      const programs = Array.isArray(profile.programas) ? profile.programas : [];
      setPermissionDraft(programs);
      setPermissionOriginal(programs);
      setSuccess(`Se actualizaron los permisos de ${profile.nombre}.`);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSavingPermissions(false);
    }
  }

  return (
    <section className="page-section">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Configuración</p>
          <h1>Administración</h1>
          <p className="muted">Gestioná usuarios, perfiles y permisos de acceso.</p>
        </div>
      </div>

      <div className="admin-tabs" role="tablist" aria-label="Secciones de administración">
        <button
          className={`button ${activeTab === 'users' ? 'button-primary' : 'button-secondary'}`}
          id="admin-users-tab"
          type="button"
          role="tab"
          aria-selected={activeTab === 'users'}
          aria-controls="admin-users-panel"
          onClick={() => setActiveTab('users')}
        >
          Usuarios y perfiles
        </button>
        <button
          className={`button ${activeTab === 'permissions' ? 'button-primary' : 'button-secondary'}`}
          id="admin-permissions-tab"
          type="button"
          role="tab"
          aria-selected={activeTab === 'permissions'}
          aria-controls="admin-permissions-panel"
          onClick={() => setActiveTab('permissions')}
        >
          Permisos por perfil
        </button>
      </div>

      {error && <ApiErrorMessage error={error} />}
      {success && <div className="notice notice-success" role="status">{success}</div>}

      {activeTab === 'users' ? (
        <section
          className="contact-card"
          id="admin-users-panel"
          role="tabpanel"
          aria-labelledby="admin-users-tab"
        >
          <div className="contact-card-heading">
            <div>
              <h2>Usuarios</h2>
              <p className="muted">Asigná uno o más perfiles a cada usuario.</p>
            </div>
          </div>
          {loading ? (
            <p className="muted" role="status">Cargando usuarios…</p>
          ) : users.length ? (
            <div className="admin-user-list">
              {users.map((row) => {
                const selectedIds = userProfileSelections[row.id] || [];
                const originalIds = row.perfiles
                  .map((profileName) => profiles.find((profile) => profile.nombre === profileName)?.id)
                  .filter((id) => id !== undefined);
                const isSelf = row.id === user.id;
                const changed = !sameIds(selectedIds, originalIds);
                return (
                  <article className="admin-user-card" key={row.id}>
                    <div className="admin-user-heading">
                      <div>
                        <h3>{row.nombreUsuario}</h3>
                        <p className="muted">{row.mail}</p>
                      </div>
                      <span className={`status-badge ${row.estado === 'ACTIVO' ? 'status-cerrada' : 'admin-user-inactive'}`}>
                        {row.estado}
                      </span>
                    </div>
                    <p className="admin-last-access">
                      Último acceso: {row.ultimoAcceso ? formatDate(row.ultimoAcceso) : 'Sin registros'}
                    </p>
                    <fieldset className="role-picker">
                      <legend>Perfiles asignados</legend>
                      <div className="role-options">
                        {profiles.map((profile) => (
                          <label className="role-option" key={profile.id}>
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(profile.id)}
                              disabled={isSelf || savingUserId === row.id}
                              onChange={(event) =>
                                setUserProfile(row.id, profile.id, event.target.checked)
                              }
                            />
                            <span>{profile.nombre}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    {isSelf && (
                      <p className="field-hint">No podés modificar los perfiles de tu propio usuario.</p>
                    )}
                    <div className="contact-form-actions">
                      <button
                        className="button button-primary"
                        type="button"
                        disabled={isSelf || !changed || savingUserId === row.id || selectedIds.length === 0}
                        onClick={() => saveUserProfiles(row)}
                      >
                        {savingUserId === row.id ? 'Guardando…' : 'Guardar perfiles'}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="empty-state">No hay usuarios para mostrar.</p>
          )}
        </section>
      ) : (
        <section
          className="contact-card"
          id="admin-permissions-panel"
          role="tabpanel"
          aria-labelledby="admin-permissions-tab"
        >
          <div className="contact-card-heading">
            <div>
              <h2>Permisos por perfil</h2>
              <p className="muted">Definí qué acciones puede realizar cada perfil en cada programa.</p>
            </div>
          </div>
          <label className="field admin-profile-select">
            Perfil
            <select
              value={selectedProfileId}
              onChange={handleProfileChange}
              disabled={loading || permissionLoading || profiles.length === 0}
            >
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>{profile.nombre}</option>
              ))}
            </select>
          </label>
          {permissionLoading ? (
            <p className="muted" role="status">Cargando permisos…</p>
          ) : permissionDraft.length ? (
            <form onSubmit={savePermissions}>
              {groupedPrograms.map((group) => (
                <section className="admin-permission-group" key={group.id}>
                  <h3>{group.name}</h3>
                  <div className="table-scroll">
                    <table className="admin-permission-table">
                      <thead>
                        <tr>
                          <th scope="col">Programa</th>
                          <th scope="col">Ruta</th>
                          {PERMISSION_FIELDS.map(([, label]) => (
                            <th scope="col" key={label}>{label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {group.programs.map((program) => (
                          <tr key={program.idPrograma}>
                            <th scope="row">{program.nombre}</th>
                            <td><code>{program.ruta}</code></td>
                            {PERMISSION_FIELDS.map(([field, label]) => (
                              <td key={field}>
                                <input
                                  type="checkbox"
                                  aria-label={`${program.nombre}: ${label}`}
                                  checked={program[field]}
                                  disabled={permissionLoading || savingPermissions}
                                  onChange={(event) =>
                                    changePermission(program.idPrograma, field, event.target.checked)
                                  }
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ))}
              <div className="contact-form-actions admin-save-actions">
                <button
                  className="button button-primary"
                  type="submit"
                  disabled={!permissionsChanged || savingPermissions || permissionLoading}
                >
                  {savingPermissions ? 'Guardando…' : 'Guardar permisos'}
                </button>
              </div>
            </form>
          ) : !error ? (
            <p className="empty-state">No hay programas disponibles para configurar.</p>
          ) : null}
        </section>
      )}
    </section>
  );
}
