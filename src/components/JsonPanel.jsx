import { useState, useCallback, useEffect, useRef } from 'react';
import { Stack, Textarea, Button, Group, Text } from '@mantine/core';

export function JsonPanel({ data, onImport }) {
  const [jsonText, setJsonText] = useState(() => JSON.stringify(data, null, 2));
  const [error, setError] = useState('');
  const isFocused = useRef(false);

  useEffect(() => {
    if (!isFocused.current) {
      setJsonText(JSON.stringify(data, null, 2));
    }
  }, [data]);

  const handleChange = useCallback((e) => {
    const val = e.currentTarget.value;
    setJsonText(val);
    try {
      JSON.parse(val);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const handleApply = useCallback(() => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!parsed.nodes || !parsed.edges || !parsed.tag_styles || !parsed.edge_styles) {
        throw new Error('Missing required top-level properties.');
      }
      onImport(parsed);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, [jsonText, onImport]);

  return (
    <Stack gap="md" style={{ height: '100%', overflow: 'hidden' }}>
      <Textarea
        value={jsonText}
        onChange={handleChange}
        onFocus={() => { isFocused.current = true; }}
        onBlur={() => { isFocused.current = false; }}
        style={{ flex: 1, minHeight: 0 }}
        styles={{
          root: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' },
          wrapper: { flex: 1, minHeight: 0 },
          input: { fontFamily: 'monospace', height: '100%', resize: 'none', overflowY: 'auto' },
        }}
      />
      <Group gap="md" style={{ flexShrink: 0 }}>
        <Button onClick={handleApply}>Apply</Button>
        {error && <Text c="red" size="sm">{error}</Text>}
      </Group>
    </Stack>
  );
}
