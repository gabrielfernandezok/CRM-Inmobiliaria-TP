export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('es-AR').format(date);
}

export function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

export function formatAmount(value, currency = 'ARS') {
  if (value === null || value === undefined || value === '') return '—';
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '—';
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatEnum(value) {
  if (typeof value !== 'string' || value.length === 0) return '';
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function formatContactOption(contact) {
  const name = contact?.nombre ||
    (contact?.personaFisica
      ? `${contact.personaFisica.apellido} ${contact.personaFisica.nombres}`.trim()
      : contact?.personaJuridica?.razonSocial) ||
    (contact?.id ? `Contacto #${contact.id}` : 'Contacto');

  const today = new Date().toISOString().slice(0, 10);
  const currentRepresentatives = (contact?.personaFisica?.representantes || []).filter(
    ({ fechaDesde, fechaHasta }) => {
      const start = fechaDesde ? new Date(fechaDesde).toISOString().slice(0, 10) : null;
      const end = fechaHasta ? new Date(fechaHasta).toISOString().slice(0, 10) : null;
      return (!start || start <= today) && (!end || end >= today);
    }
  );
  const representedCompanies = contact?.empresasRepresentadas ||
    currentRepresentatives
      .map(({ personaJuridica }) => personaJuridica?.razonSocial)
      .filter(Boolean);
  if (contact?.tipoPersona === 'FISICA' && representedCompanies?.length) {
    return `${name} (${representedCompanies.join(', ')})`;
  }
  if (contact?.tipoPersona === 'JURIDICA' && contact.representantes?.length) {
    return `${name} (Representante: ${contact.representantes.join(', ')})`;
  }
  return name;
}
