export default function ApiErrorMessage({ error }) {
  if (!error) return null;
  const details = error.details
    ?.map((item) => item.message)
    .filter(Boolean);

  return (
    <div className="notice notice-error" role="alert">
      <strong>{error.message}</strong>
      {details?.length > 0 && (
        <ul>
          {details.map((message, index) => <li key={`${message}-${index}`}>{message}</li>)}
        </ul>
      )}
    </div>
  );
}
