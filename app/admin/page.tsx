import { sendTestEmail } from "./actions";

export default function AdminPage() {
  return (
    <div style={{ padding: 40 }}>
      <h1>Admin panel – Članarine</h1>

      <form action={sendTestEmail}>
        <button type="submit">Pošalji test mejl</button>
      </form>
    </div>
  );
}
