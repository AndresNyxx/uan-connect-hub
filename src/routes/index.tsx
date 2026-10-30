import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  MapPin,
  Search,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  TIPOS_ASESORIA,
  ReservaError,
  ahoraEnColombia,
  crearReserva,
  franjaEstaOcupada,
  listarFranjas,
  listarRecursosPorTipo,
  listarReservasActivas,
  listarUsuarios,
  obtenerRecurso,
  reservaActivaDeUsuario,
  type Franja,
  type Recurso,
  type Reserva,
  type Usuario,
} from "@/lib/supabase";

const MSG_FRANJA_OCUPADA =
  "Esta franja acaba de ser reservada por otra persona. Selecciona otra hora.";
const MSG_FRANJA_PASADA = "Esta franja ya pasó. Selecciona otra hora.";
const MSG_RESERVA_ACTIVA =
  "Ya tienes una reserva activa. Para realizar una nueva, debes cancelar o finalizar tu reserva actual.";
const MSG_ERROR_VERIFICACION =
  "No se pudo verificar el estado de las reservas. Por seguridad no es posible crear una reserva sin validar esta regla. Intenta de nuevo.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "UAN Advisor Connect · Programa tu asesoría" },
      {
        name: "description",
        content:
          "Programa paso a paso tu asesoría de orientación psicosocial o de lectura y redacción en la Universidad Antonio Nariño: elige día, hora y confirma.",
      },
      { property: "og:title", content: "UAN Advisor Connect" },
      {
        property: "og:description",
        content: "Elige día, hora y confirma tu asesoría en la Universidad Antonio Nariño.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const p2 = (n: number) => String(n).padStart(2, "0");
const claveFecha = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
const hoyISO = () => ahoraEnColombia().fecha;
const aDate = (fecha: string) => {
  const [y, m, d] = fecha.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
};
const formatoFecha = (fecha: string) =>
  aDate(fecha).toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" });
const hhmm = (h: string) => h.slice(0, 5);
// Una franja ya transcurrida (fecha y hora de inicio anteriores al momento actual,
// en hora de Colombia) no es elegible.
const esPasada = (f: Franja) => {
  const ahora = ahoraEnColombia();
  return f.fecha < ahora.fecha || (f.fecha === ahora.fecha && f.hora_inicio <= ahora.hora);
};

type Paso = 1 | 2 | 3;
const PASOS: { n: Paso; titulo: string }[] = [
  { n: 1, titulo: "2 · Día" },
  { n: 2, titulo: "3 · Hora" },
  { n: 3, titulo: "4 · Confirmar" },
];

function Index() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargandoUsuarios, setCargandoUsuarios] = useState(true);
  const [filtro, setFiltro] = useState("");
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [verificando, setVerificando] = useState(false);
  const [errorVerificacion, setErrorVerificacion] = useState(false);
  const [citaActiva, setCitaActiva] = useState<{ reserva: Reserva; recurso: Recurso | null } | null>(
    null,
  );

  useEffect(() => {
    listarUsuarios()
      .then(setUsuarios)
      .catch(() => setMensaje("No pudimos cargar la lista de estudiantes."))
      .finally(() => setCargandoUsuarios(false));
  }, []);

  const usuariosFiltrados = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return usuarios;
    return usuarios.filter(
      (u) =>
        u.nombre.toLowerCase().includes(q) ||
        u.codigo.toLowerCase().includes(q) ||
        (u.programa ?? "").toLowerCase().includes(q) ||
        (u.correo ?? "").toLowerCase().includes(q),
    );
  }, [usuarios, filtro]);

  async function seleccionarEstudiante(u: Usuario) {
    setUsuario(u);
    setCitaActiva(null);
    setMensaje(null);
    setErrorVerificacion(false);
    setVerificando(true);
    try {
      const activa = await reservaActivaDeUsuario(u.id);
      if (activa) {
        const recurso = await obtenerRecurso(activa.recurso_id).catch(() => null);
        setCitaActiva({ reserva: activa, recurso });
      }
    } catch {
      // HU-05: sin verificación no se permite continuar con la reserva.
      setErrorVerificacion(true);
      setMensaje(MSG_ERROR_VERIFICACION);
    } finally {
      setVerificando(false);
    }
  }

  const [tipo, setTipo] = useState<string | null>(null);
  const [cargandoFranjas, setCargandoFranjas] = useState(false);
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [franjas, setFranjas] = useState<Franja[]>([]);
  const [ocupadas, setOcupadas] = useState<Set<number>>(new Set());

  const [paso, setPaso] = useState<Paso>(1);
  const [dia, setDia] = useState<string | null>(null);
  const [seleccion, setSeleccion] = useState<Franja | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [reserva, setReserva] = useState<Reserva | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const disponibles = useMemo(
    () => franjas.filter((f) => !ocupadas.has(f.id) && !esPasada(f)),
    [franjas, ocupadas],
  );
  const diasConCupo = useMemo(
    () => new Set(disponibles.map((f) => f.fecha)),
    [disponibles],
  );
  // Todas las franjas vigentes del día (libres y ocupadas) para mostrar la disponibilidad completa.
  const franjasDelDia = useMemo(
    () =>
      franjas
        .filter((f) => f.fecha === dia && !esPasada(f))
        .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio)),
    [franjas, dia],
  );
  const recursoDe = (id: number) => recursos.find((r) => r.id === id);

  async function refrescarOcupadas() {
    try {
      const activas = await listarReservasActivas(franjas.map((f) => f.id));
      setOcupadas(new Set(activas.map((r) => r.franja_id)));
    } catch {
      /* se mantiene el estado actual */
    }
  }

  async function elegirTipo(nuevoTipo: string) {
    setTipo(nuevoTipo);
    setPaso(1);
    setDia(null);
    setSeleccion(null);
    setReserva(null);
    setMensaje(null);
    setCargandoFranjas(true);
    try {
      const recursosTipo = await listarRecursosPorTipo(nuevoTipo);
      setRecursos(recursosTipo);
      const franjasTipo = await listarFranjas(recursosTipo.map((r) => r.id), hoyISO());
      setFranjas(franjasTipo);
      const activas = await listarReservasActivas(franjasTipo.map((f) => f.id));
      setOcupadas(new Set(activas.map((r) => r.franja_id)));
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
    const volverAHoras = () => {
      setOcupadas((prev) => new Set(prev).add(seleccion.id));
      setSeleccion(null);
      setPaso(2);
      setMensaje(MSG_FRANJA_OCUPADA);
      void refrescarOcupadas();
    };
    try {
      // Comprobaciones previas (la garantía real la da PostgreSQL al insertar).
      if (await franjaEstaOcupada(seleccion.id)) return volverAHoras();
      if (await reservaActivaDeUsuario(usuario.id)) {
        await seleccionarEstudiante(usuario);
        return;
      }
      const nueva = await crearReserva({ franja: seleccion, usuarioId: usuario.id });
      setReserva(nueva);
      setOcupadas((prev) => new Set(prev).add(seleccion.id));
      void refrescarOcupadas();
    } catch (e) {
      if (e instanceof ReservaError && e.motivo === "franja_ocupada") return volverAHoras();
      if (e instanceof ReservaError && e.motivo === "franja_pasada") {
        setSeleccion(null);
        setPaso(2);
        setMensaje(MSG_FRANJA_PASADA);
        void refrescarOcupadas();
        return;
      }
      if (e instanceof ReservaError && e.motivo === "estudiante_con_reserva") {
        await seleccionarEstudiante(usuario);
        setMensaje(MSG_RESERVA_ACTIVA);
        return;
      }
      setMensaje("La reserva no pudo completarse. Intenta nuevamente.");
    } finally {
      setConfirmando(false);
    }
  }

  function reiniciar() {
    setUsuario(null);
    setCitaActiva(null);
    setErrorVerificacion(false);
    setTipo(null);
    setRecursos([]);
    setFranjas([]);
    setOcupadas(new Set());
    setPaso(1);
    setDia(null);
    setSeleccion(null);
    setReserva(null);
    setMensaje(null);
  }

  function nuevaCita() {
    reiniciar();
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b-4 border-gold bg-navy text-navy-foreground shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-5 py-6 sm:px-6">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-navy-foreground/15 text-lg font-bold tracking-tight">
            UAN
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight sm:text-xl">UAN Advisor Connect</h1>
            <p className="text-xs opacity-80 sm:text-sm">
              Universidad Antonio Nariño · Programación de asesorías
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-5 px-4 py-8 sm:px-6 sm:py-10">
        {mensaje && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {mensaje}
          </div>
        )}

        {/* Paso 1: estudiante */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base">1 · Seleccionar estudiante</CardTitle>
            <CardDescription>
              Busca por nombre, código, programa o correo y haz clic sobre el estudiante.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!usuario ? (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={filtro}
                    onChange={(e) => setFiltro(e.target.value)}
                    placeholder="Buscar estudiante…"
                    className="pl-9"
                    aria-label="Buscar estudiante"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {cargandoUsuarios
                    ? "Cargando estudiantes…"
                    : `${usuariosFiltrados.length} de ${usuarios.length} estudiantes`}
                </p>
                <ul className="max-h-96 divide-y overflow-y-auto rounded-xl border bg-card">
                  {usuariosFiltrados.map((u) => (
                    <li key={u.id}>
                      <button
                        type="button"
                        onClick={() => seleccionarEstudiante(u)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-primary/5"
                      >
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <User className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{u.nombre}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            Código {u.codigo}
                            {u.programa ? ` · ${u.programa}` : ""}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                  {!cargandoUsuarios && usuariosFiltrados.length === 0 && (
                    <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                      Ningún estudiante coincide con la búsqueda.
                    </li>
                  )}
                </ul>
              </>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <User className="size-5" />
                  </div>
                  <div>
                    <p className="font-medium leading-tight">{usuario.nombre}</p>
                    <p className="text-sm text-muted-foreground">
                      Código {usuario.codigo}
                      {usuario.correo ? ` · ${usuario.correo}` : ""}
                    </p>
                    {usuario.programa && (
                      <p className="text-sm text-muted-foreground">{usuario.programa}</p>
                    )}
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={reiniciar}>
                  Cambiar estudiante
                </Button>
              </div>
            )}
            {verificando && (
              <p className="text-sm text-muted-foreground">Verificando reservas del estudiante…</p>
            )}
            {errorVerificacion && !verificando && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3">
                <p className="text-sm text-destructive">{MSG_ERROR_VERIFICACION}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => usuario && seleccionarEstudiante(usuario)}
                >
                  Reintentar
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cita activa existente */}
        {usuario && citaActiva && !reserva && (
          <Card className="border-destructive/40">
            <CardHeader>
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="size-5" />
                <CardTitle className="text-base">Este estudiante ya tiene una cita activa</CardTitle>
              </div>
              <CardDescription>{MSG_RESERVA_ACTIVA}</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-3 sm:grid-cols-2">
                <Dato icono={<CalendarDays className="size-4" />} titulo="Fecha">
                  <span className="capitalize">{formatoFecha(citaActiva.reserva.fecha)}</span>
                </Dato>
                <Dato icono={<Clock className="size-4" />} titulo="Hora">
                  {hhmm(citaActiva.reserva.hora_inicio)} – {hhmm(citaActiva.reserva.hora_fin)}
                </Dato>
                <Dato icono={<User className="size-4" />} titulo="Asesor / recurso">
                  {citaActiva.recurso?.nombre ?? `Recurso ${citaActiva.reserva.recurso_id}`}
                </Dato>
                <Dato icono={<CheckCircle2 className="size-4" />} titulo="Estado">
                  <Badge variant="secondary">{citaActiva.reserva.estado}</Badge>
                </Dato>
              </dl>
            </CardContent>
          </Card>
        )}

        {/* Tipo de asesoría */}
        {usuario && !verificando && !errorVerificacion && !reserva && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tipo de asesoría</CardTitle>
              <CardDescription>Elige el acompañamiento que necesitas.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {TIPOS_ASESORIA.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => elegirTipo(t)}
                  className={`rounded-xl border-2 px-4 py-4 text-left text-sm font-medium transition ${
                    tipo === t
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-transparent bg-muted/50 hover:border-primary/40"
                  }`}
                >
                  {t}
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Flujo por pasos */}
        {usuario && !verificando && !errorVerificacion && tipo && !reserva && (
          <Card>
            <CardHeader className="gap-4">
              <Pasos paso={paso} />
            </CardHeader>
            <Separator />
            <CardContent className="pt-6">
              {cargandoFranjas && (
                <p className="text-sm text-muted-foreground">Cargando disponibilidad…</p>
              )}

              {/* Paso 1: día */}
              {!cargandoFranjas && paso === 1 && (
                <div className="flex flex-col items-start gap-6 md:flex-row">
                  <div className="mx-auto rounded-xl border bg-card p-2 md:mx-0">
                    <Calendar
                      mode="single"
                      locale={undefined}
                      selected={dia ? aDate(dia) : undefined}
                      onSelect={(d) => {
                        if (!d) return;
                        setDia(claveFecha(d));
                        setSeleccion(null);
                        setPaso(2);
                        setMensaje(null);
                      }}
                      disabled={(d) =>
                        claveFecha(d) < hoyISO() || !diasConCupo.has(claveFecha(d))
                      }
                      className="pointer-events-auto p-3"
                    />
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">Selecciona un día</p>
                    <p>
                      Solo puedes elegir los días que tienen horarios libres para{" "}
                      <span className="font-medium text-foreground">{tipo}</span>.
                    </p>
                    <p>
                      {diasConCupo.size > 0
                        ? `${diasConCupo.size} día(s) con disponibilidad.`
                        : "Por ahora no hay días con disponibilidad."}
                    </p>
                  </div>
                </div>
              )}

              {/* Paso 2: hora */}
              {!cargandoFranjas && paso === 2 && dia && (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm">
                      <CalendarDays className="size-4 text-primary" />
                      <span className="font-medium capitalize">{formatoFecha(dia)}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setPaso(1)}>
                      <ArrowLeft className="size-4" /> Cambiar día
                    </Button>
                  </div>

                  {franjasDelDia.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-6 text-center">
                      <p className="text-sm text-muted-foreground">
                        No hay horarios disponibles este día.
                      </p>
                      <Button className="mt-4" variant="outline" onClick={() => setPaso(1)}>
                        Elegir otro día
                      </Button>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {franjasDelDia.map((f) => {
                        const recurso = recursoDe(f.recurso_id);
                        const ocupada = ocupadas.has(f.id);
                        const activa = seleccion?.id === f.id;
                        if (ocupada) {
                          return (
                            <div
                              key={f.id}
                              aria-disabled="true"
                              className="cursor-not-allowed rounded-xl border-2 border-dashed bg-muted/60 p-4 text-left opacity-70"
                            >
                              <span className="flex items-center justify-between gap-2 text-sm font-semibold text-muted-foreground">
                                <span className="flex items-center gap-2 line-through">
                                  <Clock className="size-4" />
                                  {hhmm(f.hora_inicio)} – {hhmm(f.hora_fin)}
                                </span>
                                <Badge variant="secondary">Ocupada</Badge>
                              </span>
                              {recurso && (
                                <span className="mt-2 block text-xs text-muted-foreground">
                                  {recurso.nombre}
                                  {recurso.ubicacion ? ` · ${recurso.ubicacion}` : ""}
                                </span>
                              )}
                            </div>
                          );
                        }
                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => {
                              setSeleccion(f);
                              setPaso(3);
                            }}
                            className={`rounded-xl border-2 p-4 text-left transition ${
                              activa
                                ? "border-primary bg-primary/5"
                                : "border-border bg-card hover:border-primary/50 hover:shadow-sm"
                            }`}
                          >
                            <span className="flex items-center justify-between gap-2 text-sm font-semibold">
                              <span className="flex items-center gap-2">
                                <Clock className="size-4 text-primary" />
                                {hhmm(f.hora_inicio)} – {hhmm(f.hora_fin)}
                              </span>
                              <Badge>Libre</Badge>
                            </span>
                            {recurso && (
                              <span className="mt-2 block text-xs text-muted-foreground">
                                {recurso.nombre}
                                {recurso.ubicacion ? ` · ${recurso.ubicacion}` : ""}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Paso 3: confirmación */}
              {!cargandoFranjas && paso === 3 && seleccion && (
                <div className="space-y-5">
                  <div className="rounded-xl border bg-card p-5">
                    <p className="text-sm font-semibold">Revisa tu cita antes de confirmar</p>
                    <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                      <Dato icono={<User className="size-4" />} titulo="Estudiante">
                        {usuario.nombre}
                      </Dato>
                      <Dato icono={<User className="size-4" />} titulo="Asesor">
                        {recursoDe(seleccion.recurso_id)?.nombre ?? "—"}
                      </Dato>
                      <Dato icono={<CalendarDays className="size-4" />} titulo="Fecha">
                        <span className="capitalize">{formatoFecha(seleccion.fecha)}</span>
                      </Dato>
                      <Dato icono={<Clock className="size-4" />} titulo="Horario">
                        {hhmm(seleccion.hora_inicio)} – {hhmm(seleccion.hora_fin)}
                      </Dato>
                      <Dato icono={<MapPin className="size-4" />} titulo="Lugar">
                        {recursoDe(seleccion.recurso_id)?.ubicacion ?? "Por definir"}
                      </Dato>
                      <Dato icono={<CheckCircle2 className="size-4" />} titulo="Estado">
                        <Badge variant="secondary">activa</Badge>
                      </Dato>
                    </dl>
                  </div>
                  {citaActiva && (
                    <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                      {MSG_RESERVA_ACTIVA}
                    </div>
                  )}
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button
                      onClick={confirmar}
                      disabled={confirmando || !!citaActiva}
                      className="sm:min-w-48"
                    >
                      {confirmando ? "Confirmando…" : "Confirmar cita"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSeleccion(null);
                        setPaso(2);
                      }}
                      disabled={confirmando}
                    >
                      <ArrowLeft className="size-4" /> Volver / Cambiar horario
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Resultado */}
        {reserva && usuario && (
          <Card className="border-primary/40">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-5 text-primary" />
                <Badge>Cita confirmada</Badge>
                <span className="text-sm text-muted-foreground">N.º {reserva.id}</span>
              </div>
              <CardTitle className="pt-2">¡Listo, {usuario.nombre.split(" ")[0]}!</CardTitle>
              <CardDescription className="capitalize">
                {formatoFecha(reserva.fecha)} · {hhmm(reserva.hora_inicio)} –{" "}
                {hhmm(reserva.hora_fin)}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button onClick={nuevaCita}>Programar otra cita</Button>
              <Button variant="outline" onClick={reiniciar}>
                Salir
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

function Pasos({ paso }: { paso: Paso }) {
  return (
    <div className="flex items-center gap-2 sm:gap-4">
      {PASOS.map((p, i) => {
        const completo = paso > p.n;
        const actual = paso === p.n;
        return (
          <div key={p.n} className="flex flex-1 items-center gap-2">
            <div
              className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition ${
                actual
                  ? "bg-primary text-primary-foreground"
                  : completo
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {completo ? <CheckCircle2 className="size-4" /> : p.n}
            </div>
            <span
              className={`text-xs font-medium sm:text-sm ${
                actual ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {p.titulo}
            </span>
            {i < PASOS.length - 1 && (
              <div
                className={`hidden h-px flex-1 sm:block ${completo ? "bg-primary/40" : "bg-border"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Dato({
  icono,
  titulo,
  children,
}: {
  icono: React.ReactNode;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-primary">{icono}</span>
      <div>
        <dt className="text-xs uppercase tracking-wide text-muted-foreground">{titulo}</dt>
        <dd className="text-sm font-medium">{children}</dd>
      </div>
    </div>
  );
}
