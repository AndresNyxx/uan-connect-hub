// Conexión directa al proyecto Supabase de la universidad (solo clave publicable).
const SUPABASE_URL = "https://vymgqbozudohwpsdzfjd.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_GecI-T7rSyzbn1yGh4GSrQ_JfHXnrYG";
const REST = `${SUPABASE_URL}/rest/v1`;

// La clave publicable (formato sb_publishable_*) no es un JWT: se envía solo en
// la cabecera `apikey`, nunca como `Authorization: Bearer`.
const baseHeaders = {
  apikey: SUPABASE_PUBLISHABLE_KEY,
  "Content-Type": "application/json",
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${REST}${path}`, {
    ...init,
    headers: { ...baseHeaders, ...(init?.headers ?? {}) },
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message =
      body && typeof body === "object" && "message" in body
        ? String((body as { message: unknown }).message)
        : `Error ${res.status}`;
    throw new Error(message);
  }
  return body as T;
}

export type Usuario = {
  id: number;
  nombre: string;
  codigo: string;
  programa: string | null;
  correo: string | null;
};

export type Recurso = {
  id: number;
  nombre: string;
  tipo: string;
  ubicacion: string | null;
  capacidad: number | null;
  atributos: string | null;
  activo: number | null;
};

export type Franja = {
  id: number;
  recurso_id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
};

export type Reserva = {
  id: number;
  franja_id: number;
  recurso_id: number;
  usuario_id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado: string;
  creada_en: string;
};

export const TIPOS_ASESORIA = ["Orientación psicosocial", "Lectura y redacción"] as const;

export class ReservaError extends Error {
  constructor(
    public motivo: "franja_ocupada" | "estudiante_con_reserva" | "otro",
    message: string,
  ) {
    super(message);
  }
}

export function buscarUsuarioPorCodigo(codigo: string) {
  return request<Usuario[]>(
    `/usuarios?select=id,nombre,codigo,programa,correo&codigo=eq.${encodeURIComponent(codigo.trim())}&limit=1`,
  ).then((rows) => rows[0] ?? null);
}

export function listarUsuarios() {
  return request<Usuario[]>(`/usuarios?select=id,nombre,codigo,programa,correo&order=nombre.asc`);
}

export function reservaActivaDeUsuario(usuarioId: number) {
  return request<Reserva[]>(
    `/reservas?select=*&estado=eq.activa&usuario_id=eq.${usuarioId}&order=fecha.asc&limit=1`,
  ).then((rows) => rows[0] ?? null);
}

export function obtenerRecurso(id: number) {
  return request<Recurso[]>(`/recursos?select=*&id=eq.${id}&limit=1`).then((r) => r[0] ?? null);
}

export function listarRecursosPorTipo(tipo: string) {
  return request<Recurso[]>(
    `/recursos?select=*&activo=eq.1&tipo=eq.${encodeURIComponent(tipo)}&order=nombre.asc`,
  );
}

export function listarFranjas(recursoIds: number[], desde: string) {
  if (recursoIds.length === 0) return Promise.resolve([] as Franja[]);
  return request<Franja[]>(
    `/franjas?select=*&recurso_id=in.(${recursoIds.join(",")})&fecha=gte.${desde}` +
      `&order=fecha.asc&order=hora_inicio.asc`,
  );
}

export function listarReservasActivas(franjaIds: number[]) {
  if (franjaIds.length === 0) return Promise.resolve([] as Reserva[]);
  return request<Reserva[]>(
    `/reservas?select=id,franja_id,estado&estado=eq.activa&franja_id=in.(${franjaIds.join(",")})`,
  );
}

export function franjaEstaOcupada(franjaId: number) {
  return request<{ id: number }[]>(
    `/reservas?select=id&estado=eq.activa&franja_id=eq.${franjaId}&limit=1`,
  ).then((rows) => rows.length > 0);
}

// `id` y `creada_en` ahora los genera la base de datos automáticamente.
export async function crearReserva(input: {
  franja: Franja;
  usuarioId: number;
}): Promise<Reserva> {
  const res = await fetch(`${REST}/reservas`, {
    method: "POST",
    headers: { ...baseHeaders, Prefer: "return=representation" },
    body: JSON.stringify({
      franja_id: input.franja.id,
      recurso_id: input.franja.recurso_id,
      usuario_id: input.usuarioId,
      fecha: input.franja.fecha,
      hora_inicio: input.franja.hora_inicio,
      hora_fin: input.franja.hora_fin,
      estado: "activa",
    }),
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = String(body?.message ?? "");
    // Errores lanzados por las reglas de integridad en PostgreSQL.
    if (body?.code === "23505" || msg.includes("FRANJA_OCUPADA"))
      throw new ReservaError("franja_ocupada", msg);
    if (msg.includes("ESTUDIANTE_CON_RESERVA_ACTIVA"))
      throw new ReservaError("estudiante_con_reserva", msg);
    throw new ReservaError("otro", msg || `Error ${res.status}`);
  }
  const creada = (body as Reserva[])[0];
  if (!creada) throw new ReservaError("otro", "No se pudo crear la reserva.");
  return creada;
}
