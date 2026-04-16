import { Alert, Group, Text, Button } from '@mantine/core';

export function GuestModeBanner({ onConnect }) {
  return (
    <Alert color="yellow" radius="md" withCloseButton={false} style={{ marginBottom: 12 }}>
      <Group justify="space-between">
        <div>
          <Text fw={500} mb={2}>Guest mode: your skill tree is only saved in your browser.</Text>
          <Text size="sm" c="dimmed">If you clear your browser data or switch devices, your progress will be lost. Connect to GitHub to save your tree permanently.</Text>
        </div>
        <Button size="xs" variant="light" color="blue" onClick={onConnect}>
          Connect to GitHub
        </Button>
      </Group>
    </Alert>
  );
}
