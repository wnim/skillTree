import { useState, useEffect, useMemo } from 'react';
import { Modal, Stack, Group, Badge, TextInput, Button, Text } from '@mantine/core';
import { X } from 'lucide-react';

export function BulkTagModal({ opened, onClose, onSave, selectedNodes, allNodes }) {
  const [toRemove, setToRemove] = useState(() => new Set());
  const [toAdd, setToAdd] = useState([]);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (opened) {
      setToRemove(new Set());
      setToAdd([]);
      setInputValue('');
    }
  }, [opened]);

  const { unionTags, commonTags } = useMemo(() => {
    if (!selectedNodes || selectedNodes.length === 0) {
      return { unionTags: [], commonTags: new Set() };
    }
    const union = [];
    const seen = new Set();
    selectedNodes.forEach((n) => {
      n.tags?.forEach((t) => {
        if (!seen.has(t)) { union.push(t); seen.add(t); }
      });
    });
    const common = new Set(union.filter((t) => selectedNodes.every((n) => n.tags?.includes(t))));
    return { unionTags: union, commonTags: common };
  }, [selectedNodes]);

  const visibleExistingTags = unionTags.filter((t) => !toRemove.has(t));

  const popularTags = useMemo(() => {
    if (!allNodes || allNodes.length === 0) return [];
    const counts = new Map();
    allNodes.forEach((n) => n.tags?.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)));
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag);
  }, [allNodes]);

  const commitInput = (value = inputValue) => {
    const parts = value.split(',').map((s) => s.trim()).filter(Boolean);
    const newTags = parts.filter((t) => !toAdd.includes(t) && !visibleExistingTags.includes(t));
    if (newTags.length > 0) setToAdd((prev) => [...prev, ...newTags]);
    setInputValue('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commitInput();
    }
  };

  const handleSave = () => {
    // Commit any pending input before saving (avoids stale-state timing issues)
    const pendingParts = inputValue.split(',').map((s) => s.trim()).filter(Boolean);
    const currentVisible = unionTags.filter((t) => !toRemove.has(t));
    const pendingNew = pendingParts.filter((t) => !toAdd.includes(t) && !currentVisible.includes(t));
    onSave(toRemove, [...toAdd, ...pendingNew]);
    onClose();
  };

  const hasAnyChips = visibleExistingTags.length > 0 || toAdd.length > 0;

  return (
    <Modal opened={opened} onClose={onClose} title="Edit Tags" centered size="md">
      <Stack gap="md">
        <div>
          <Group justify="space-between" mb="xs">
            <Text size="xs" c="dimmed" tt="uppercase" fw={600} style={{ letterSpacing: '0.05em' }}>
              Tags on {selectedNodes?.length ?? 0} selected nodes
            </Text>
            <Text size="xs" c="dimmed">
              Filled = all nodes · Outlined = some nodes · Teal = new
            </Text>
          </Group>

          {hasAnyChips ? (
            <Group gap="xs" wrap="wrap">
              {visibleExistingTags.map((tag) => (
                <Badge
                  key={tag}
                  variant={commonTags.has(tag) ? 'filled' : 'outline'}
                  style={{ cursor: 'default', paddingRight: 4 }}
                  rightSection={
                    <X
                      size={11}
                      style={{ cursor: 'pointer', display: 'block' }}
                      onClick={() => setToRemove((prev) => new Set([...prev, tag]))}
                    />
                  }
                >
                  {tag}
                </Badge>
              ))}
              {toAdd.map((tag) => (
                <Badge
                  key={`new-${tag}`}
                  variant="filled"
                  color="teal"
                  style={{ cursor: 'default', paddingRight: 4 }}
                  rightSection={
                    <X
                      size={11}
                      style={{ cursor: 'pointer', display: 'block' }}
                      onClick={() => setToAdd((prev) => prev.filter((t) => t !== tag))}
                    />
                  }
                >
                  {tag}
                </Badge>
              ))}
            </Group>
          ) : (
            <Text size="sm" c="dimmed">No tags yet.</Text>
          )}
        </div>

        <TextInput
          label="Add tags"
          description="Press Enter or , to confirm each tag"
          placeholder="e.g. fundamental, combo"
          value={inputValue}
          onChange={(e) => setInputValue(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          data-autofocus
        />

        {popularTags.length > 0 && (() => {
          const addableSuggestions = popularTags.filter(
            (t) => !visibleExistingTags.includes(t) && !toAdd.includes(t),
          );
          if (addableSuggestions.length === 0) return null;
          return (
            <div>
              <Text size="xs" c="dimmed" mb={6}>Popular tags — click to add</Text>
              <Group gap="xs" wrap="wrap">
                {addableSuggestions.map((tag) => (
                  <Badge
                    key={tag}
                    variant="dot"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setToAdd((prev) => [...prev, tag])}
                  >
                    {tag}
                  </Badge>
                ))}
              </Group>
            </div>
          );
        })()}

        <Group justify="flex-end" mt="xs">
          <Button variant="default" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </Group>
      </Stack>
    </Modal>
  );
}
