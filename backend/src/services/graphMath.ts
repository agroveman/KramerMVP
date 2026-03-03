export type NodeId = number;

export type WeightedEdge = {
  u: NodeId;
  v: NodeId;
  w: number;
};

export function percentileRank(value: number, sortedValues: number[]): number {
  if (sortedValues.length === 0) return 0;
  // Mid-rank percentile in [0..1]:
  // pct = (count(<value) + 0.5*count(==value)) / N
  let lo = 0;
  let hi = sortedValues.length;
  // lower bound: first index >= value
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (sortedValues[mid]! < value) lo = mid + 1;
    else hi = mid;
  }
  const lower = lo;

  lo = 0;
  hi = sortedValues.length;
  // upper bound: first index > value
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (sortedValues[mid]! <= value) lo = mid + 1;
    else hi = mid;
  }
  const upper = lo;

  const countLess = lower;
  const countEq = upper - lower;
  const pct = (countLess + 0.5 * countEq) / sortedValues.length;
  return Math.min(1, Math.max(0, pct));
}

export function scale01(x: number, min: number, max: number): number {
  if (max <= min) return 0;
  return Math.min(1, Math.max(0, (x - min) / (max - min)));
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

// Weighted betweenness centrality (Brandes, weighted) but implemented in a small, N~60-friendly way.
// Edge "cost" is inverse of weight: cost = 1 / w.
export function betweennessCentralityWeighted(
  nodeIds: NodeId[],
  edges: WeightedEdge[]
): Map<NodeId, number> {
  const adj = new Map<NodeId, Array<{ to: NodeId; cost: number }>>();
  for (const id of nodeIds) adj.set(id, []);
  for (const e of edges) {
    const cost = e.w > 0 ? 1 / e.w : 1;
    adj.get(e.u)?.push({ to: e.v, cost });
    adj.get(e.v)?.push({ to: e.u, cost });
  }

  const cb = new Map<NodeId, number>();
  for (const v of nodeIds) cb.set(v, 0);

  for (const s of nodeIds) {
    const S: NodeId[] = [];
    const P = new Map<NodeId, NodeId[]>();
    const sigma = new Map<NodeId, number>();
    const dist = new Map<NodeId, number>();
    for (const v of nodeIds) {
      P.set(v, []);
      sigma.set(v, 0);
      dist.set(v, Infinity);
    }
    sigma.set(s, 1);
    dist.set(s, 0);

    // Dijkstra (naive O(n^2) is fine for ~60 nodes)
    const visited = new Set<NodeId>();
    while (visited.size < nodeIds.length) {
      let vMin: NodeId | null = null;
      let dMin = Infinity;
      for (const v of nodeIds) {
        if (visited.has(v)) continue;
        const d = dist.get(v)!;
        if (d < dMin) {
          dMin = d;
          vMin = v;
        }
      }
      if (vMin === null || dMin === Infinity) break;
      const v = vMin;
      visited.add(v);
      S.push(v);

      const neighbors = adj.get(v) ?? [];
      for (const { to: w, cost } of neighbors) {
        const vwDist = dist.get(v)! + cost;
        if (vwDist < dist.get(w)!) {
          dist.set(w, vwDist);
          sigma.set(w, sigma.get(v)!);
          P.set(w, [v]);
        } else if (vwDist === dist.get(w)!) {
          sigma.set(w, sigma.get(w)! + sigma.get(v)!);
          P.get(w)!.push(v);
        }
      }
    }

    const delta = new Map<NodeId, number>();
    for (const v of nodeIds) delta.set(v, 0);

    // Back-propagation
    while (S.length > 0) {
      const w = S.pop()!;
      for (const v of P.get(w)!) {
        const coeff = (sigma.get(v)! / sigma.get(w)!) * (1 + delta.get(w)!);
        delta.set(v, delta.get(v)! + coeff);
      }
      if (w !== s) {
        cb.set(w, cb.get(w)! + delta.get(w)!);
      }
    }
  }

  // For undirected graphs, divide by 2
  for (const v of nodeIds) cb.set(v, cb.get(v)! / 2);
  return cb;
}

export function articulationPoints(nodeIds: NodeId[], edges: Array<{ u: NodeId; v: NodeId }>) {
  const adj = new Map<NodeId, NodeId[]>();
  for (const id of nodeIds) adj.set(id, []);
  for (const e of edges) {
    adj.get(e.u)?.push(e.v);
    adj.get(e.v)?.push(e.u);
  }

  const visited = new Set<NodeId>();
  const disc = new Map<NodeId, number>();
  const low = new Map<NodeId, number>();
  const parent = new Map<NodeId, NodeId | null>();
  const ap = new Set<NodeId>();
  let time = 0;

  function dfs(u: NodeId) {
    visited.add(u);
    time += 1;
    disc.set(u, time);
    low.set(u, time);
    let childCount = 0;

    for (const v of adj.get(u) ?? []) {
      if (!visited.has(v)) {
        childCount += 1;
        parent.set(v, u);
        dfs(v);
        low.set(u, Math.min(low.get(u)!, low.get(v)!));

        const uParent = parent.get(u) ?? null;
        if (uParent === null && childCount > 1) ap.add(u);
        if (uParent !== null && low.get(v)! >= disc.get(u)!) ap.add(u);
      } else if (v !== (parent.get(u) ?? null)) {
        low.set(u, Math.min(low.get(u)!, disc.get(v)!));
      }
    }
  }

  for (const id of nodeIds) {
    if (!visited.has(id)) {
      parent.set(id, null);
      dfs(id);
    }
  }

  return ap;
}

