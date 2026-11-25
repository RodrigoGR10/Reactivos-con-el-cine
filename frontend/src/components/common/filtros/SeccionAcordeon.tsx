import { Accordion, Group, Badge } from "@mantine/core";
import type { ReactNode } from "react";

/**
 * Envuelve el contenido de un filtro en una sección desplegable de Mantine.
 * @param titulo Título accesible de la sección.
 * @param etiquetaActiva Resumen opcional de la selección actual.
 * @param disabled Si es `true`, no permite abrir la sección.
 * @param children Contenido que aparece al expandirla.
 * @returns Elemento de interfaz que representa el componente con las propiedades recibidas.
 */
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
                        <Badge
                            size="sm"
                            variant="outline"
                            color="var(--color-acento)"
                        >
                            {etiquetaActiva}
                        </Badge>
                    )}
                </Group>
            </Accordion.Control>
            <Accordion.Panel>{children}</Accordion.Panel>
        </Accordion.Item>
    );
}
