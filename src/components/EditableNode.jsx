import { useCallback, useEffect, useRef, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Paper, TextInput, Slider, Text } from '@mantine/core';

export function EditableNode({ data }) {
  const { id, label, score, onUpdate, onClose } = data;

  // Local state keeps the UI smooth; global state is only updated on commit
  const [localLabel, setLocalLabel] = useState(label);
  const [localScore, setLocalScore] = useState(score ?? 0);

  const nameRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => nameRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onUpdate(id, 'label', localLabel);
        onClose();
      }
    },
    [id, localLabel, onClose, onUpdate],
  );

  const handleLabelChange = useCallback((e) => {
    setLocalLabel(e.currentTarget.value);
  }, []);

  const handleLabelBlur = useCallback(() => {
    onUpdate(id, 'label', localLabel);
  }, [id, localLabel, onUpdate]);

  // Commit to global state only when the drag ends
  const handleScoreChangeEnd = useCallback(
    (val) => {
      onUpdate(id, 'score', val);
    },
    [id, onUpdate],
  );

  return (
    <Paper
      p={8}
      w={170}
      className="nodrag nopan"
      onKeyDown={handleKeyDown}
      style={{
        border: '2px solid var(--mantine-color-blue-5)',
        boxShadow: '0 0 0 3px rgba(91, 156, 246, 0.3), 0 0 18px 4px rgba(91, 156, 246, 0.2)',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
      bg="dark.7"
      radius="md"
    >
      <Handle type="target" position={Position.Top} className="handle" />

      <TextInput
        ref={nameRef}
        size="xs"
        placeholder="Name"
        value={localLabel}
        onChange={handleLabelChange}
        onBlur={handleLabelBlur}
        styles={{ input: { fontWeight: 600 } }}
      />

      <Text size="xs" c="dimmed" mb={2}>Score</Text>
      <Slider
        min={0}
        max={10}
        step={1}
        value={localScore}
        onChange={setLocalScore}
        onChangeEnd={handleScoreChangeEnd}
        onPointerDown={(e) => e.stopPropagation()}
        label={(val) => val}
        size="xs"
        mb={2}
      />

      <Handle type="source" position={Position.Bottom} className="handle" />
    </Paper>
  );
}

