import { useMemo } from 'react';
import { Paper, Text, Group, Stack, Progress } from '@mantine/core';
import { scoreColor } from '../utils/score';

const STAT_VALUE_STYLE = { fontVariantNumeric: 'tabular-nums' };

function computeGraphDepth(nodes, edges) {
  if (nodes.length === 0) return 0;
  const nodeIds = new Set(nodes.map((n) => n.id));
  const children = new Map();
  const inDegree = new Map();
  for (const id of nodeIds) {
    children.set(id, []);
    inDegree.set(id, 0);
  }
  for (const e of edges) {
    if (!nodeIds.has(e.from) || !nodeIds.has(e.to)) continue;
    children.get(e.from).push(e.to);
    inDegree.set(e.to, inDegree.get(e.to) + 1);
  }
  // Longest path via topological BFS (Kahn's algorithm)
  const dist = new Map();
  const queue = [];
  for (const id of nodeIds) {
    dist.set(id, 0);
    if (inDegree.get(id) === 0) queue.push(id);
  }
  let maxDepth = 0;
  while (queue.length > 0) {
    const u = queue.shift();
    for (const v of children.get(u)) {
      const d = dist.get(u) + 1;
      if (d > dist.get(v)) dist.set(v, d);
      inDegree.set(v, inDegree.get(v) - 1);
      if (inDegree.get(v) === 0) queue.push(v);
    }
    if (dist.get(u) > maxDepth) maxDepth = dist.get(u);
  }
  return maxDepth;
}

function computeConnectedComponents(nodes, edges) {
  if (nodes.length === 0) return 0;
  const nodeIds = new Set(nodes.map((n) => n.id));
  const adj = new Map();
  for (const id of nodeIds) adj.set(id, []);
  for (const e of edges) {
    if (!nodeIds.has(e.from) || !nodeIds.has(e.to)) continue;
    adj.get(e.from).push(e.to);
    adj.get(e.to).push(e.from);
  }
  const visited = new Set();
  let components = 0;
  for (const id of nodeIds) {
    if (visited.has(id)) continue;
    components++;
    const stack = [id];
    while (stack.length > 0) {
      const u = stack.pop();
      if (visited.has(u)) continue;
      visited.add(u);
      for (const v of adj.get(u)) if (!visited.has(v)) stack.push(v);
    }
  }
  return components;
}

function findMostConnected(nodes, edges) {
  if (nodes.length === 0) return null;
  const degree = new Map(nodes.map((n) => [n.id, 0]));
  for (const e of edges) {
    if (degree.has(e.from)) degree.set(e.from, degree.get(e.from) + 1);
    if (degree.has(e.to)) degree.set(e.to, degree.get(e.to) + 1);
  }
  let maxId = null;
  let maxDeg = 0;
  for (const [id, deg] of degree) {
    if (deg > maxDeg) { maxDeg = deg; maxId = id; }
  }
  if (maxDeg === 0) return null;
  const node = nodes.find((n) => n.id === maxId);
  return { label: node?.label ?? maxId, degree: maxDeg, id: maxId };
}

function StatRow({ label, value, color }) {
  return (
    <Group justify="space-between" gap="xl" wrap="nowrap">
      <Text size="xs" c="dimmed">{label}</Text>
      <Text size="xs" fw={600} c={color} style={STAT_VALUE_STYLE}>{value}</Text>
    </Group>
  );
}

function ScoreBar({ scores }) {
  const buckets = [0, 0, 0, 0, 0]; // 0, 1-3, 4-6, 7-9, 10
  for (const s of scores) {
    if (s === 0) buckets[0]++;
    else if (s <= 3) buckets[1]++;
    else if (s <= 6) buckets[2]++;
    else if (s <= 9) buckets[3]++;
    else buckets[4]++;
  }
  const total = scores.length || 1;
  const sections = [
    { value: (buckets[0] / total) * 100, color: scoreColor(0) },
    { value: (buckets[1] / total) * 100, color: scoreColor(2) },
    { value: (buckets[2] / total) * 100, color: scoreColor(5) },
    { value: (buckets[3] / total) * 100, color: scoreColor(8) },
    { value: (buckets[4] / total) * 100, color: scoreColor(10) },
  ];
  return <Progress.Root size="sm" radius="xl">{sections.map((s, i) => (
    <Progress.Section key={i} value={s.value} color={s.color} />
  ))}</Progress.Root>;
}

export function StatisticsPanel({ data, visible, onFocusNode }) {
  const stats = useMemo(() => {
    const { nodes, edges } = data;
    const scoredNodes = nodes.filter((n) => n.score != null);
    const scores = scoredNodes.map((n) => n.score);
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
    const mastered = nodes.filter((n) => n.score === 10).length;
    const notAttempted = nodes.filter((n) => n.score == null).length;
    const inProgress = nodes.length - mastered - notAttempted;
    const completion = nodes.length > 0 ? (mastered / nodes.length) * 100 : 0;
    const depth = computeGraphDepth(nodes, edges);
    const components = computeConnectedComponents(nodes, edges);
    const hub = findMostConnected(nodes, edges);
    const tagCounts = {};
    for (const n of nodes) for (const t of (n.tags ?? [])) tagCounts[t] = (tagCounts[t] || 0) + 1;
    const tagsUsed = Object.keys(tagCounts).length;

    return { nodes: nodes.length, edges: edges.length, avgScore, mastered, notAttempted, inProgress, completion, depth, components, hub, tagsUsed, scores };
  }, [data]);

  return (
    <div style={{
      maxWidth: visible ? 300 : 0,
      opacity: visible ? 1 : 0,
      overflow: 'hidden',
      transition: 'max-width 0.25s ease, opacity 0.2s ease',
      pointerEvents: visible ? 'auto' : 'none',
    }}>
      <Paper shadow="md" p="sm" radius="md" withBorder style={{ minWidth: 200 }}>
      <Stack gap={6}>
        <Text size="xs" fw={600} c="dimmed">Statistics</Text>

        <StatRow label="Nodes" value={stats.nodes} />
        <StatRow label="Edges" value={stats.edges} />
        <StatRow label="Graph depth" value={stats.depth} />
        <StatRow label="Sub-graphs" value={stats.components} />

        <div style={{ height: 1, background: 'var(--mantine-color-dark-5)', margin: '2px 0' }} />

        <StatRow label="Mastered" value={stats.mastered} color="teal" />
        <StatRow label="In progress" value={stats.inProgress} color="blue" />
        <StatRow label="Not attempted" value={stats.notAttempted} color="dimmed" />
        <StatRow
          label="Avg score"
          value={stats.avgScore != null ? stats.avgScore.toFixed(1) : '—'}
        />
        <StatRow
          label="Completion"
          value={`${stats.completion.toFixed(0)}%`}
          color={stats.completion === 100 ? 'teal' : undefined}
        />

        {stats.scores.length > 0 && (
          <>
            <Text size="xs" c="dimmed" mt={2}>Score distribution</Text>
            <ScoreBar scores={stats.scores} />
            <Group justify="space-between" gap={0}>
              <Text size={9} c="dimmed">0</Text>
              <Text size={9} c="dimmed">10</Text>
            </Group>
          </>
        )}

        <div style={{ height: 1, background: 'var(--mantine-color-dark-5)', margin: '2px 0' }} />

        <StatRow label="Tags used" value={stats.tagsUsed} />
        {stats.hub && (
          <Group justify="space-between" gap="xl" wrap="nowrap">
            <Text size="xs" c="dimmed">Most connected</Text>
            <Text
              size="xs"
              fw={600}
              style={{ ...STAT_VALUE_STYLE, cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}
              c="blue"
              onClick={() => onFocusNode?.(stats.hub.id)}
              title="Center on this node"
            >
              {stats.hub.label} ({stats.hub.degree})
            </Text>
          </Group>
        )}
      </Stack>
    </Paper>
    </div>
  );
}
