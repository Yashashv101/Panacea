import { Link } from "react-router-dom";

const COPY = {
  success: "Payment received — it may take a moment to confirm.",
  cancel: "Payment cancelled.",
};

export default function PaymentReturn({ variant }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="mb-3 font-display text-2xl font-semibold text-ink">Panacea</h1>
        <p className="mb-8 text-sm text-slate">{COPY[variant]}</p>
        <Link to="/login" className="text-xs font-medium uppercase tracking-wide text-oxblood hover:opacity-80">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
