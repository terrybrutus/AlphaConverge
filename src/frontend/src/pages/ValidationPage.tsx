import { useLiveStore } from "@/lib/liveStore";
import { maturedDays, recordReturn } from "@/lib/research";

export function ValidationPage() {
  const records = useLiveStore((s) => s.validationRecords);
  const matured = records.filter((record) => maturedDays(record) >= 28);
  const buckets = [0, 1, 2, 3, 4].map((families) => {
    const matching = matured.filter(
      (record) => record.categoriesAligned === families,
    );
    const returns = matching.map(recordReturn);
    return {
      families,
      count: matching.length,
      avg:
        returns.length > 0
          ? returns.reduce((sum, value) => sum + value, 0) / returns.length
          : 0,
      winRate:
        returns.length > 0
          ? returns.filter((value) => value > 0).length / returns.length
          : 0,
    };
  });

  return (
    <div className="min-h-screen bg-background px-4 py-10 md:px-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="font-display text-3xl font-bold text-foreground">
          Forward validation
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          This is the honest full-model test: capture setups before their
          outcomes are known, refresh their tickers later, and compare returns
          by evidence-family count. Historical backtests remain price-only until
          point-in-time non-price data is available.
        </p>
        <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-5">
          <h2 className="font-display text-lg font-semibold text-foreground">
            28-day evidence comparison
          </h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Only records refreshed at least 28 days after capture count here.
            More evidence should produce better outcomes if the convergence
            thesis is real.
          </p>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
            {buckets.map((bucket) => (
              <div
                key={bucket.families}
                className="rounded-lg border border-border bg-card/70 p-3"
              >
                <p className="font-mono text-sm font-semibold">
                  {bucket.families}/4
                </p>
                <p className="text-xs text-muted-foreground">
                  n={bucket.count} · avg {(bucket.avg * 100).toFixed(1)}% · wins{" "}
                  {(bucket.winRate * 100).toFixed(0)}%
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs text-muted-foreground">
              <tr>
                <th className="p-3">Ticker</th>
                <th className="p-3">Captured</th>
                <th className="p-3">Evidence</th>
                <th className="p-3">Coverage</th>
                <th className="p-3">Manual facts</th>
                <th className="p-3">Age</th>
                <th className="p-3">Return</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr
                  key={record.id}
                  className="border-b border-border last:border-0"
                >
                  <td className="p-3 font-mono font-semibold">
                    {record.symbol}
                  </td>
                  <td className="p-3">
                    {new Date(record.capturedAt).toLocaleDateString()}
                  </td>
                  <td className="p-3">{record.categoriesAligned}/4</td>
                  <td className="p-3">{record.dataCoverage}%</td>
                  <td className="p-3">{record.manualSignalCount}</td>
                  <td className="p-3">{maturedDays(record)} days</td>
                  <td className="p-3 font-mono">
                    {(recordReturn(record) * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="p-6 text-center text-muted-foreground"
                  >
                    No tracked setups yet. Open a live ticker and click Track
                    this setup before the outcome is known.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
