import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-20">
      <div className="max-w-2xl">
        <div className="font-mono text-xs text-seal-light tracking-widest uppercase mb-4">
          Fair-lending, provable
        </div>
        <h1 className="font-serif text-5xl leading-tight text-paper mb-6">
          A loan decision the bank can prove — without showing its model.
        </h1>
        <p className="text-paper-muted text-lg leading-relaxed mb-10">
          ZKredit wraps a bank's credit model in a zero-knowledge circuit. The bank keeps its
          weights private. The applicant gets a decision. A regulator gets a mathematical
          certificate that the same model, unmodified, made the call — for every applicant,
          every time.
        </p>
        <div className="flex gap-4">
          <Link
            to="/apply"
            className="px-5 py-3 bg-seal text-ink font-medium rounded hover:bg-seal-light transition-colors"
          >
            Submit an application
          </Link>
          <Link
            to="/bank"
            className="px-5 py-3 border border-ink-border text-paper rounded hover:border-paper-dim transition-colors"
          >
            View bank ledger
          </Link>
        </div>
      </div>

      <div className="mt-24 grid grid-cols-3 gap-8 border-t border-ink-border pt-10">
        <div>
          <div className="font-mono text-xs text-paper-dim mb-2">01</div>
          <h3 className="font-serif text-lg text-paper mb-2">Applicant submits</h3>
          <p className="text-sm text-paper-muted leading-relaxed">
            Income, credit history, and loan details go to the model — never to a public ledger.
          </p>
        </div>
        <div>
          <div className="font-mono text-xs text-paper-dim mb-2">02</div>
          <h3 className="font-serif text-lg text-paper mb-2">Circuit proves</h3>
          <p className="text-sm text-paper-muted leading-relaxed">
            A zero-knowledge proof attests the decision came from the bank's registered model.
          </p>
        </div>
        <div>
          <div className="font-mono text-xs text-paper-dim mb-2">03</div>
          <h3 className="font-serif text-lg text-paper mb-2">Chain verifies</h3>
          <p className="text-sm text-paper-muted leading-relaxed">
            Anyone can check the proof on-chain. No one can see the model or the applicant's data.
          </p>
        </div>
      </div>
    </div>
  );
}
