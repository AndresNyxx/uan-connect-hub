import { useState } from "react";
import { CalendarDays, CheckCircle2, Clock, Loader2, RefreshCw, User, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cancelarReserva, type Recurso, type Reserva, type Usuario } from "@/lib/supabase";

type Props = {
  usuario: Usuario;
  cita: { reserva: Reserva; recurso: Recurso | null } | null;
  cargando: boolean;
  errorVerificacion: boolean;
  bloqueado: boolean;
  onActualizar: () => Promise<void>;
  onCancelada: (reserva: Reserva) => Promise<void>;
  onProgramar: () => void;
  onOcupado: (ocupado: boolean) => void;
};

function fechaLegible(fecha: string) {
  return new Date(`${fecha}T12:00:00`).toLocaleDateString("es-CO", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

export function MisReservas({ usuario, cita, cargando, errorVerificacion, bloqueado,
  onActualizar, onCancelada, onProgramar, onOcupado }: Props) {
  const [dialogo, setDialogo] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  async function confirmarCancelacion() {
    if (!cita || cancelando) return;
    setCancelando(true);
    onOcupado(true);
    setError(null);
    setExito(false);
    try {
      const cancelada = await cancelarReserva(cita.reserva.id, usuario.id);
      await onCancelada(cancelada);
      setExito(true);
      setDialogo(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos cancelar tu reserva. Intenta nuevamente.");
    } finally {
      setCancelando(false);
      onOcupado(false);
    }
  }

  return (
    <section id="mis-reservas" aria-labelledby="mis-reservas-titulo" className="scroll-mt-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="mis-reservas-titulo" className="flex items-center gap-2 text-lg font-semibold">
          <CalendarDays className="size-5 text-primary" /> Mis reservas
        </h2>
        <Button variant="ghost" size="sm" disabled={cargando || cancelando || bloqueado}
          onClick={() => { setExito(false); void onActualizar(); }}>
          <RefreshCw className="size-4" /> Actualizar
        </Button>
      </div>
      {exito && <p role="status" className="flex items-start gap-2 rounded-md border border-primary/30 bg-primary/5 p-4 text-sm text-primary">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
        Reserva cancelada correctamente. El horario vuelve a estar disponible y puedes solicitar una nueva cita.
      </p>}
      {cargando ? <p role="status" className="text-sm text-muted-foreground">Consultando tu reserva…</p>
        : errorVerificacion ? <p className="text-sm text-destructive">No pudimos consultar tu reserva. Actualiza para reintentar.</p>
        : cita ? <Card className="border-primary/30">
          <CardHeader className="gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">{cita.recurso?.tipo ?? "Asesoría"}</CardTitle>
              <Badge>Activa</Badge>
            </div>
            <p className="text-sm text-muted-foreground">Reserva N.º {cita.reserva.id}</p>
          </CardHeader>
          <CardContent className="space-y-5">
            <dl className="grid gap-4 sm:grid-cols-2">
              <Detalle icono={<User className="size-4" />} titulo="Estudiante">{usuario.nombre}</Detalle>
              <Detalle icono={<User className="size-4" />} titulo="Asesor / recurso">{cita.recurso?.nombre ?? `Recurso ${cita.reserva.recurso_id}`}</Detalle>
              <Detalle icono={<CalendarDays className="size-4" />} titulo="Fecha"><span className="capitalize">{fechaLegible(cita.reserva.fecha)}</span></Detalle>
              <Detalle icono={<Clock className="size-4" />} titulo="Hora">{cita.reserva.hora_inicio.slice(0, 5)} – {cita.reserva.hora_fin.slice(0, 5)}</Detalle>
            </dl>
            <p className="text-sm text-muted-foreground">Ya tienes una reserva activa. Para realizar una nueva, debes cancelar o finalizar tu reserva actual.</p>
            <Button variant="outline" disabled={cancelando || bloqueado || cargando}
              onClick={() => { setError(null); setDialogo(true); }}>
              <XCircle className="size-4" /> Cancelar reserva
            </Button>
          </CardContent>
        </Card> : <div className="space-y-3 border-y py-5">
          <p className="text-sm text-muted-foreground">No tienes ninguna reserva activa.</p>
          <Button disabled={bloqueado || cancelando} onClick={onProgramar}>
            <CalendarDays className="size-4" /> Programar cita
          </Button>
        </div>}

      <AlertDialog open={dialogo} onOpenChange={(open) => { if (!cancelando) setDialogo(open); }}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] rounded-lg sm:max-w-lg"
          onEscapeKeyDown={(e) => { if (cancelando) e.preventDefault(); }}>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar esta reserva?</AlertDialogTitle>
            <AlertDialogDescription>
              La cita de {usuario.nombre}{cita ? ` del ${fechaLegible(cita.reserva.fecha)}, de ${cita.reserva.hora_inicio.slice(0, 5)} a ${cita.reserva.hora_fin.slice(0, 5)}` : ""} quedará cancelada. El horario podrá ser reservado por otro estudiante.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          <AlertDialogFooter className="gap-2">
            <Button variant="outline" disabled={cancelando} onClick={() => setDialogo(false)}>Mantener reserva</Button>
            <Button disabled={cancelando} onClick={() => void confirmarCancelacion()}>
              {cancelando ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />}
              {cancelando ? "Cancelando…" : "Confirmar cancelación"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function Detalle({ titulo, icono, children }: { titulo: string; icono: React.ReactNode; children: React.ReactNode }) {
  return <div className="flex items-start gap-3">
    <span className="mt-0.5 text-primary">{icono}</span>
    <div className="min-w-0"><dt className="text-xs text-muted-foreground">{titulo}</dt><dd className="break-words text-sm font-medium">{children}</dd></div>
  </div>;
}