import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarX2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CancelacionError,
  cancelarReserva,
  obtenerRecurso,
  reservaVigente,
  reservasDeUsuario,
  type Recurso,
  type Reserva,
  type Usuario,
} from "@/lib/supabase";


const hhmm = (t: string) => t.slice(0, 5);
const fecha = (f: string) => format(parseISO(f), "EEEE d 'de' MMMM yyyy", { locale: es });

const MENSAJES: Record<CancelacionError["motivo"], string> = {
  no_pertenece: "Esta reserva no está asociada al estudiante seleccionado. No se puede cancelar.",
  no_activa: "Esta reserva ya no está activa.",
  no_existe: "La reserva no existe.",
  sin_funcion:
    "La cancelación aún no está habilitada en la base de datos. Falta ejecutar el script de cancelación en Supabase.",
  otro: "No se pudo cancelar la reserva. Intenta de nuevo.",
};

export function MisReservas({
  usuario,
  version,
  onCancelada,
}: {
  usuario: Usuario;
  version: number;
  onCancelada: () => void;
}) {
  const [reservas, setReservas] = useState<Reserva[] | null>(null);
  const [recursos, setRecursos] = useState<Record<number, Recurso | null>>({});
  const [error, setError] = useState(false);
  const [aCancelar, setACancelar] = useState<Reserva | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  async function cargar() {
    setError(false);
    try {
      const rs = await reservasDeUsuario(usuario.id);
      setReservas(rs);
      const ids = [...new Set(rs.map((r) => r.recurso_id))];
      const pares = await Promise.all(
        ids.map(async (id) => [id, await obtenerRecurso(id).catch(() => null)] as const),
      );
      setRecursos(Object.fromEntries(pares));
    } catch {
      setError(true);
    }
  }

  useEffect(() => {
    setReservas(null);
    setAviso(null);
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario.id, version]);

  async function confirmarCancelacion() {
    if (!aCancelar) return;
    setCancelando(true);
    try {
      // La función en Supabase vuelve a verificar que la reserva sea de este estudiante.
      await cancelarReserva(aCancelar.id, usuario.id);
      setAviso({ tipo: "ok", texto: "Reserva cancelada. El horario quedó disponible nuevamente." });
      setACancelar(null);
      await cargar();
      onCancelada();
    } catch (e) {
      const motivo = e instanceof CancelacionError ? e.motivo : "otro";
      setAviso({ tipo: "error", texto: MENSAJES[motivo] });
      setACancelar(null);
      await cargar();
    } finally {
      setCancelando(false);
    }
  }

  const vigentes = (reservas ?? []).filter((r) => r.estado === "activa" && reservaVigente(r));
  const historial = (reservas ?? []).filter((r) => !vigentes.includes(r));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Mis reservas</CardTitle>
        <CardDescription>Reservas de {usuario.nombre}. Puedes cancelar tus citas activas.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {aviso && (
          <p
            role="status"
            className={
              aviso.tipo === "ok"
                ? "rounded-md bg-primary/10 p-3 text-sm text-primary"
                : "rounded-md bg-destructive/10 p-3 text-sm text-destructive"
            }
          >
            {aviso.texto}
          </p>
        )}
        {error && (
          <div className="flex items-center justify-between gap-2 text-sm text-destructive">
            No se pudieron cargar tus reservas.
            <Button size="sm" variant="outline" onClick={cargar}>
              Reintentar
            </Button>
          </div>
        )}
        {!reservas && !error && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Cargando reservas…
          </p>
        )}
        {reservas && reservas.length === 0 && (
          <p className="text-sm text-muted-foreground">Aún no tienes reservas.</p>
        )}

        {vigentes.map((r) => (
          <div
            key={r.id}
            className="flex flex-col gap-3 rounded-lg border border-primary/30 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="text-sm">
              <p className="font-medium capitalize">{fecha(r.fecha)}</p>
              <p className="text-muted-foreground">
                {hhmm(r.hora_inicio)} – {hhmm(r.hora_fin)} ·{" "}
                {recursos[r.recurso_id]?.nombre ?? `Recurso ${r.recurso_id}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge>activa</Badge>
              <Button size="sm" variant="destructive" onClick={() => setACancelar(r)}>
                <CalendarX2 className="size-4" /> Cancelar
              </Button>
            </div>
          </div>
        ))}

        {historial.length > 0 && (
          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground">
              Historial ({historial.length})
            </summary>
            <ul className="mt-2 space-y-1">
              {historial.map((r) => (
                <li key={r.id} className="flex justify-between gap-2 border-b py-1">
                  <span className="capitalize">
                    {fecha(r.fecha)} · {hhmm(r.hora_inicio)} ·{" "}
                    {recursos[r.recurso_id]?.nombre ?? `Recurso ${r.recurso_id}`}
                  </span>
                  <Badge variant="secondary">
                    {r.estado === "activa" ? "vencida" : r.estado}
                  </Badge>
                </li>
              ))}
            </ul>
          </details>
        )}
      </CardContent>

      <AlertDialog open={!!aCancelar} onOpenChange={(o) => !o && !cancelando && setACancelar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar esta reserva?</AlertDialogTitle>
            <AlertDialogDescription>
              {aCancelar && (
                <>
                  <span className="capitalize">{fecha(aCancelar.fecha)}</span>,{" "}
                  {hhmm(aCancelar.hora_inicio)} – {hhmm(aCancelar.hora_fin)} con{" "}
                  {recursos[aCancelar.recurso_id]?.nombre ?? `Recurso ${aCancelar.recurso_id}`}.
                  El horario quedará disponible para otros estudiantes.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelando}>Volver</AlertDialogCancel>
            <AlertDialogAction
              disabled={cancelando}
              onClick={(e) => {
                e.preventDefault();
                confirmarCancelacion();
              }}
            >
              {cancelando && <Loader2 className="size-4 animate-spin" />} Sí, cancelar reserva
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
