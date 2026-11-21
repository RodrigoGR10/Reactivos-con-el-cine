import { Accordion, Group, Badge } from "@mantine/core";
import type { ReactNode } from "react";

export function SeccionAcordeon({
  titulo,
  etiquetaActiva,
  disabled = false,
  children,
}: {
  titulo: string;
  etiquetaActiva?: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <Accordion.Item value={titulo}>
      <Accordion.Control disabled={disabled}>
        <Group justify="space-between" gap="xs" wrap="nowrap" pr="xs">
          <span>{titulo}</span>
          {etiquetaActiva && (
            <Badge size="sm" variant="outline" color="var(--color-acento)">
              {etiquetaActiva}
            </Badge>
          )}
        </Group>
      </Accordion.Control>
      <Accordion.Panel>{children}</Accordion.Panel>
    </Accordion.Item>
  );
}
