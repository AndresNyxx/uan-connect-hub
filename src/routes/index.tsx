import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TIPOS_ASESORIA,
  buscarUsuarioPorCodigo,
  crearReserva,
  franjaEstaOcupada,
  listarFranjas,
  listarRecursosPorTipo,
  listarReservasActivas,
  type Franja,
  type Recurso,
  type Reserva,
  type Usuario,
} from "@/lib/supabase";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "UAN Advisor Connect · Reserva de asesorías" },
      {
        name: "description",
        content:
          "Reserva asesorías de orientación psicosocial y de lectura y redacción académica en la Universidad Antonio Nariño usando tu código estudiantil.",
      },
      { property: "og:title", content: "UAN Advisor Connect" },
      {
        property: "og:description",
        content:
          "Identifícate con tu código estudiantil y reserva tu asesoría en la Universidad Antonio Nariño.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function hoyISO() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function formatoFecha(fecha: string) {
  const [y, m, d] = fecha.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1).toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

const hhmm = (h: string) => h.slice(0, 5);

function Index() {
  const [codigo, setCodigo] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  const [tipo, setTipo] = useState<string | null>(null);
  const [cargandoFranjas, setCargandoFranjas] = useState(false);
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [franjas, setFranjas] = useState<Franja[]>([]);
  const [ocupadas, setOcupadas] = useState<Set<number>>(new Set());

  const [seleccion, setSeleccion] = useState<Franja | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [reserva, setReserva] = useState<Reserva | null>(null);

  const [mensaje, setMensaje] = useState<string | null>(null);

  async function identificar(e: React.FormEvent) {
    e.preventDefault();
    if (!codigo.trim()) return;
    setBuscando(true);
    setMensaje(null);
    try {
      const encontrado = await buscarUsuarioPorCodigo(codigo);
      if (!encontrado) {
        setMensaje("No encontramos un estudiante con ese código. Revísalo e intenta de nuevo.");
        setUsuario(null);
      } else {
        setUsuario(encontrado);
      }
    } catch {
      setMensaje("No pudimos consultar tus datos en este momento. Intenta de nuevo.");
    } finally {
      setBuscando(false);
    }
  }

  async function elegirTipo(nuevoTipo: string) {
    setTipo(nuevoTipo);
    setSeleccion(null);
    setReserva(null);
    setMensaje(null);
    setCargandoFranjas(true);
    try {
      const recursosTipo = await listarRecursosPorTipo(nuevoTipo);
      setRecursos(recursosTipo);
      const franjasTipo = await listarFranjas(
        recursosTipo.map((r) => r.id),
        hoyISO(),
      );
      setFranjas(franjasTipo);
      const reservasActivas = await listarReservasActivas(franjasTipo.map((f) => f.id));
      setOcupadas(new Set(reservasActivas.map((r) => r.franja_id)));
    } catch {
      setMensaje("No pudimos cargar las franjas disponibles. Intenta de nuevo.");
      setRecursos([]);
      setFranjas([]);
    } finally {
      setCargandoFranjas(false);
    }
  }

  async function confirmar() {
    if (!usuario || !seleccion) return;
    setConfirmando(true);
    setMensaje(null);
    try {
      if (await franjaEstaOcupada(seleccion.id)) {
        setOcupadas((prev) => new Set(prev).add(seleccion.id));
        setSeleccion(null);
        setMensaje("Esa franja acaba de ser reservada por otro estudiante. Elige otra.");
        return;
      }
      const nueva = await crearReserva({ franja: seleccion, usuarioId: usuario.id });
      setReserva(nueva);
      setOcupadas((prev) => new Set(prev).add(seleccion.id));
      setSeleccion(null);
    } catch {
      setMensaje("No se pudo realizar la reserva. Intenta nuevamente.");
    } finally {
      setConfirmando(false);
    }
  }

  function reiniciar() {
    setCodigo("");
    setUsuario(null);
    setTipo(null);
    setRecursos([]);
    setFranjas([]);
    setSeleccion(null);
    setReserva(null);
    setMensaje(null);
  }

  const recursoDe = (id: number) => recursos.find((r) => r.id === id);
  const disponibles = franjas.filter((f) => !ocupadas.has(f.id));
  const porFecha = disponibles.reduce<Record<string, Franja[]>>((acc, f) => {
    (acc[f.fecha] ??= []).push(f);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-6">
          <div className="flex size-11 items-center justify-center rounded-lg bg-primary-foreground/15 text-lg font-bold tracking-tight">
            UAN
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">UAN Advisor Connect</h1>
            <p className="text-sm opacity-80">Universidad Antonio Nariño · Reserva de asesorías</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-6 py-10">
        {mensaje && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {mensaje}
          </div>
        )}

        {/* Paso 1: identificación */}
        <Card>
          <CardHeader>
            <CardTitle>1. Identifícate</CardTitle>
            <CardDescription>
              Ingresa tu código estudiantil. No necesitas usuario ni contraseña.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!usuario ? (
              <form onSubmit={identificar} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="codigo">Código estudiantil</Label>
                  <Input
                    id="codigo"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                    placeholder="Ej: 12242557898"
                    inputMode="numeric"
                    autoComplete="off"
                  />
                </div>
                <Button type="submit" disabled={buscando || !codigo.trim()}>
                  {buscando ? "Buscando…" : "Continuar"}
                </Button>
              </form>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 px-4 py-3">
                <div>
                  <p className="font-medium">{usuario.nombre}</p>
                  <p className="text-sm text-muted-foreground">{usuario.correo}</p>
                  {usuario.programa && (
                    <p className="text-sm text-muted-foreground">{usuario.programa}</p>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={reiniciar}>
                  Cambiar estudiante
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Paso 2: tipo de asesoría */}
        {usuario && (
          <Card>
            <CardHeader>
              <CardTitle>2. Tipo de asesoría</CardTitle>
              <CardDescription>Elige el acompañamiento que necesitas.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {TIPOS_ASESORIA.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => elegirTipo(t)}
                  className={`rounded-lg border px-4 py-4 text-left transition hover:border-primary ${
                    tipo === t ? "border-primary bg-primary/5" : "bg-card"
                  }`}
                >
                  <span className="font-medium">{t}</span>
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Paso 3: franjas */}
        {usuario && tipo && (
          <Card>
            <CardHeader>
              <CardTitle>3. Elige fecha y hora</CardTitle>
              <CardDescription>Solo se muestran las franjas libres.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {cargandoFranjas && (
                <p className="text-sm text-muted-foreground">Cargando franjas disponibles…</p>
              )}
              {!cargandoFranjas && disponibles.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No hay franjas disponibles para esta asesoría por ahora.
                </p>
              )}
              {!cargandoFranjas &&
                Object.entries(porFecha).map(([fecha, lista]) => (
                  <div key={fecha} className="space-y-2">
                    <p className="text-sm font-medium capitalize">{formatoFecha(fecha)}</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {lista.map((f) => {
                        const recurso = recursoDe(f.recurso_id);
                        const activa = seleccion?.id === f.id;
                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => setSeleccion(f)}
                            className={`rounded-lg border px-3 py-3 text-left text-sm transition hover:border-primary ${
                              activa ? "border-primary bg-primary/5" : "bg-card"
                            }`}
                          >
                            <span className="font-medium">
                              {hhmm(f.hora_inicio)} – {hhmm(f.hora_fin)}
                            </span>
                            {recurso && (
                              <span className="mt-1 block text-muted-foreground">
                                {recurso.nombre}
                                {recurso.ubicacion ? ` · ${recurso.ubicacion}` : ""}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        )}

        {/* Paso 4: confirmación */}
        {usuario && seleccion && (
          <Card>
            <CardHeader>
              <CardTitle>4. Confirma tu reserva</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground">Estudiante: </span>
                  {usuario.nombre}
                </p>
                <p>
                  <span className="text-muted-foreground">Asesoría: </span>
                  {tipo}
                </p>
                <p>
                  <span className="text-muted-foreground">Profesional: </span>
                  {recursoDe(seleccion.recurso_id)?.nombre ?? "—"}
                </p>
                <p className="capitalize">
                  <span className="text-muted-foreground">Fecha: </span>
                  {formatoFecha(seleccion.fecha)} · {hhmm(seleccion.hora_inicio)} –{" "}
                  {hhmm(seleccion.hora_fin)}
                </p>
              </div>
              <Button onClick={confirmar} disabled={confirmando}>
                {confirmando ? "Reservando…" : "Confirmar reserva"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Resultado */}
        {reserva && (
          <Card className="border-primary">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge>Reserva confirmada</Badge>
                <span className="text-sm text-muted-foreground">N.º {reserva.id}</span>
              </div>
              <CardTitle className="pt-2">¡Listo, {usuario?.nombre.split(" ")[0]}!</CardTitle>
              <CardDescription className="capitalize">
                {formatoFecha(reserva.fecha)} · {hhmm(reserva.hora_inicio)} –{" "}
                {hhmm(reserva.hora_fin)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={reiniciar}>
                Hacer otra reserva
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
