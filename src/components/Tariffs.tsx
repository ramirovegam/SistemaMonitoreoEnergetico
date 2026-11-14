import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  AlertTriangle,
  BadgeDollarSign,
  Edit3,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";

import {
  actualizarTarifa,
  crearTarifa,
  eliminarTarifa,
  obtenerTarifas,
  type Tarifa,
  type TarifaCreate,
  type TarifaUpdate,
} from "../services/tarifasService";
import { PageHeader } from "./ui/PageHeader";

interface FormState {
  id_tarifa: string;
  codigo: string;
  nombre: string;
  categoria: string;
  limite_dac_kwh_mes: string;
}

interface TarifaFormProps {
  tarifa: Tarifa | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}

const EMPTY_FORM: FormState = {
  id_tarifa: "",
  codigo: "",
  nombre: "",
  categoria: "",
  limite_dac_kwh_mes: "",
};

const formatCategory = (value: string): string => {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (character: string) => character.toUpperCase());
};

const normalizeCategory = (value: string): string => {
  return value.trim().toUpperCase().replace(/\s+/g, "_");
};

function TarifaForm({ tarifa, onClose, onSaved }: TarifaFormProps) {
  const editing = tarifa !== null;

  const [form, setForm] = useState<FormState>(() => {
    if (!tarifa) return EMPTY_FORM;

    return {
      id_tarifa: String(tarifa.id_tarifa),
      codigo: tarifa.codigo,
      nombre: tarifa.nombre,
      categoria: tarifa.categoria,
      limite_dac_kwh_mes:
        tarifa.limite_dac_kwh_mes === null
          ? ""
          : String(tarifa.limite_dac_kwh_mes),
    };
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateField = (field: keyof FormState, value: string): void => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const idTarifa = Number(form.id_tarifa);
    const limite =
      form.limite_dac_kwh_mes.trim() === ""
        ? null
        : Number(form.limite_dac_kwh_mes);

    if (!editing && (!Number.isInteger(idTarifa) || idTarifa < 1 || idTarifa > 32767)) {
      setError("El ID debe ser un número entero entre 1 y 32767.");
      return;
    }

    if (form.codigo.trim().length < 1 || form.codigo.trim().length > 6) {
      setError("El código debe contener entre 1 y 6 caracteres.");
      return;
    }

    if (form.nombre.trim().length < 1 || form.nombre.trim().length > 60) {
      setError("El nombre debe contener entre 1 y 60 caracteres.");
      return;
    }

    const categoria = normalizeCategory(form.categoria);
    if (categoria.length < 1 || categoria.length > 18) {
      setError("La categoría debe contener entre 1 y 18 caracteres.");
      return;
    }

    if (limite !== null && (!Number.isInteger(limite) || limite < 0)) {
      setError("El límite DAC debe ser un número entero mayor o igual a cero.");
      return;
    }

    try {
      setSaving(true);

      const common: TarifaUpdate = {
        codigo: form.codigo.trim().toUpperCase(),
        nombre: form.nombre.trim(),
        categoria,
        limite_dac_kwh_mes: limite,
      };

      if (tarifa) {
        await actualizarTarifa(tarifa.id_tarifa, common);
      } else {
        const createData: TarifaCreate = {
          id_tarifa: idTarifa,
          ...common,
        };
        await crearTarifa(createData);
      }

      await onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la tarifa.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] backdrop-blur-sm p-4">
      <div className="w-full max-w-xl rounded-3xl bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] p-6">
          <div>
            <h2 className="text-lg font-bold text-[var(--color-fg)]">
              {editing ? "Editar tarifa" : "Nueva tarifa"}
            </h2>
            <p className="mt-0.5 text-xs text-[var(--color-muted)]">
              {editing
                ? `Configuración de la tarifa ${tarifa.codigo}`
                : "Agregar una tarifa al catálogo"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-bg)] hover:bg-[var(--color-border)] disabled:opacity-50"
          >
            <X size={14} className="text-[var(--color-muted)]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          {error && (
            <div className="flex items-start gap-2 rounded-2xl bg-[var(--color-danger-soft)] p-3 text-xs text-[var(--color-danger-strong)]">
              <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-[var(--color-fg-secondary)]">
                ID de tarifa
              </span>
              <input
                type="number"
                min={1}
                max={32767}
                required
                disabled={editing || saving}
                value={form.id_tarifa}
                onChange={(event) => updateField("id_tarifa", event.target.value)}
                className="rounded-xl border border-[var(--color-border)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-accent)] disabled:bg-[var(--color-surface-2)] disabled:text-[var(--color-muted)]"
                placeholder="Ej. 7"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-[var(--color-fg-secondary)]">
                Código
              </span>
              <input
                type="text"
                required
                maxLength={6}
                disabled={saving}
                value={form.codigo}
                onChange={(event) => updateField("codigo", event.target.value)}
                className="rounded-xl border border-[var(--color-border)] px-3 py-2.5 text-sm uppercase outline-none focus:border-[var(--color-accent)]"
                placeholder="Ej. PDBT"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-[var(--color-fg-secondary)]">Nombre</span>
            <input
              type="text"
              required
              maxLength={60}
              disabled={saving}
              value={form.nombre}
              onChange={(event) => updateField("nombre", event.target.value)}
              className="rounded-xl border border-[var(--color-border)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-accent)]"
              placeholder="Nombre descriptivo de la tarifa"
            />
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-[var(--color-fg-secondary)]">
                Categoría
              </span>
              <input
                type="text"
                required
                maxLength={18}
                disabled={saving}
                value={form.categoria}
                onChange={(event) => updateField("categoria", event.target.value)}
                className="rounded-xl border border-[var(--color-border)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-accent)]"
                placeholder="Ej. DOMESTICA"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-[var(--color-fg-secondary)]">
                Límite DAC (kWh/mes)
              </span>
              <input
                type="number"
                min={0}
                step={1}
                disabled={saving}
                value={form.limite_dac_kwh_mes}
                onChange={(event) =>
                  updateField("limite_dac_kwh_mes", event.target.value)
                }
                className="rounded-xl border border-[var(--color-border)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-accent)]"
                placeholder="Vacío si no aplica"
              />
            </label>
          </div>

          <div className="mt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-xs font-semibold text-[var(--color-fg-secondary)] disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[var(--color-accent)] px-4 py-2.5 text-xs font-semibold text-[var(--accent-contrast)] disabled:opacity-50"
            >
              {saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear tarifa"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AccionesTarifa({
  tarifa,
  deletingId,
  onEdit,
  onDelete,
}: {
  tarifa: Tarifa;
  deletingId: number | null;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const deleting = deletingId === tarifa.id_tarifa;

  return (
    <div className="flex justify-end gap-2">
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Editar ${tarifa.nombre}`}
        title="Editar tarifa"
        className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-info-soft)] text-[var(--chart-2)]"
      >
        <Edit3 size={15} />
      </button>

      <button
        type="button"
        onClick={onDelete}
        disabled={deleting}
        aria-label={`Eliminar ${tarifa.nombre}`}
        title={
          tarifa.total_servicios > 0
            ? "La API impedirá eliminar una tarifa asignada"
            : "Eliminar tarifa"
        }
        className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-danger-soft)] text-[var(--color-danger)] disabled:opacity-40"
      >
        {deleting ? (
          <RefreshCw size={15} className="animate-spin" />
        ) : (
          <Trash2 size={15} />
        )}
      </button>
    </div>
  );
}

export default function Tariffs() {
  const [tarifas, setTarifas] = useState<Tarifa[]>([]);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("Todas");
  const [editing, setEditing] = useState<Tarifa | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const cargarTarifas = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const data = await obtenerTarifas();
      setTarifas(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar las tarifas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void cargarTarifas();
  }, []);

  const categorias = useMemo(() => {
    return [...new Set(tarifas.map((tarifa) => tarifa.categoria))].sort(
      (a, b) => a.localeCompare(b, "es"),
    );
  }, [tarifas]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return tarifas.filter((tarifa) => {
      const matchSearch =
        query.length === 0 ||
        tarifa.codigo.toLowerCase().includes(query) ||
        tarifa.nombre.toLowerCase().includes(query) ||
        tarifa.categoria.toLowerCase().includes(query) ||
        String(tarifa.id_tarifa).includes(query);

      const matchCategory =
        filterCategory === "Todas" || tarifa.categoria === filterCategory;

      return matchSearch && matchCategory;
    });
  }, [tarifas, search, filterCategory]);

  const totalServicios = tarifas.reduce(
    (total, tarifa) => total + tarifa.total_servicios,
    0,
  );

  const tarifasConDac = tarifas.filter(
    (tarifa) => tarifa.limite_dac_kwh_mes !== null,
  ).length;

  const openCreate = (): void => {
    setEditing(null);
    setShowForm(true);
    setError(null);
    setNotice(null);
  };

  const openEdit = (tarifa: Tarifa): void => {
    setEditing(tarifa);
    setShowForm(true);
    setError(null);
    setNotice(null);
  };

  const handleSaved = async (): Promise<void> => {
    await cargarTarifas();
    setNotice(editing ? "Tarifa actualizada correctamente." : "Tarifa creada correctamente.");
  };

  const handleDelete = async (tarifa: Tarifa): Promise<void> => {
    const confirmed = window.confirm(
      `¿Deseas eliminar la tarifa ${tarifa.codigo}?\n\n` +
        "La operación no será permitida si existen servicios asociados.",
    );

    if (!confirmed) return;

    try {
      setDeletingId(tarifa.id_tarifa);
      setError(null);
      setNotice(null);
      const result = await eliminarTarifa(tarifa.id_tarifa);
      setNotice(result.mensaje);
      await cargarTarifas();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar la tarifa.");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading && tarifas.length === 0) {
    return (
      <div className="card p-8">
        <div className="flex items-center justify-center gap-3">
          <RefreshCw size={20} className="animate-spin text-[var(--color-accent)]" />
          <p className="text-sm text-[var(--color-muted)]">
            Cargando tarifas desde PostgreSQL...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Tarifas"
        description="Administración del catálogo tarifario de PostgreSQL."
        actions={
          <>
            <button
              type="button"
              onClick={() => void cargarTarifas()}
              className="flex h-10 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-surface px-3.5 text-xs font-semibold text-[var(--color-fg-secondary)]"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Actualizar
            </button>

            <button
              type="button"
              onClick={openCreate}
              className="flex h-10 items-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 text-xs font-semibold text-[var(--accent-contrast)]"
            >
              <Plus size={15} />
              Nueva tarifa
            </button>
          </>
        }
      />

      {error && (
        <div className="flex items-start justify-between gap-3 rounded-2xl bg-[var(--color-danger-soft)] p-4 text-xs text-[var(--color-danger-strong)]">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      {notice && (
        <div className="flex items-center justify-between rounded-2xl bg-[var(--color-success-soft)] p-4 text-xs font-medium text-[var(--color-success-strong)]">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Tarifas registradas",
            value: tarifas.length,
            icon: BadgeDollarSign,
            color: "var(--chart-2)",
            background: "var(--color-info-soft)",
          },
          {
            label: "Categorías",
            value: categorias.length,
            icon: BadgeDollarSign,
            color: "var(--color-accent)",
            background: "var(--color-accent-soft)",
          },
          {
            label: "Tarifas con límite DAC",
            value: tarifasConDac,
            icon: AlertTriangle,
            color: "var(--color-warning)",
            background: "var(--color-warning-soft)",
          },
          {
            label: "Servicios asociados",
            value: totalServicios,
            icon: Users,
            color: "var(--color-success)",
            background: "var(--color-success-soft)",
          },
        ].map((item) => (
          <div key={item.label} className="card p-4">
            <div
              className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ background: item.background }}
            >
              <item.icon size={16} color={item.color} />
            </div>
            <p className="text-[11px] font-medium text-[var(--color-muted)]">
              {item.label}
            </p>
            <p className="mt-0.5 text-lg font-bold text-[var(--color-fg)]">
              {item.value.toLocaleString("es-MX")}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-52 flex-1">
          <Search
            size={14}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por ID, código, nombre o categoría..."
            aria-label="Buscar tarifas"
            className="w-full rounded-2xl border border-[var(--color-border)] bg-surface py-2.5 pl-10 pr-4 text-sm text-[var(--color-fg)] outline-none placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)]"
          />
        </div>

        <select
          value={filterCategory}
          onChange={(event) => setFilterCategory(event.target.value)}
          aria-label="Filtrar por categoría"
          className="rounded-2xl border border-[var(--color-border)] bg-surface px-4 py-2.5 text-sm text-[var(--color-fg)] outline-none focus:border-[var(--color-accent)]"
        >
          <option value="Todas">Todas las categorías</option>
          {categorias.map((categoria) => (
            <option key={categoria} value={categoria}>
              {formatCategory(categoria)}
            </option>
          ))}
        </select>

        <span className="text-xs font-medium text-[var(--color-muted)]">
          {filtered.length} registros
        </span>
      </div>

      <div className="card overflow-hidden">
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[850px] text-left">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
              <tr className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                <th className="px-5 py-3">ID</th>
                <th className="px-5 py-3">Código</th>
                <th className="px-5 py-3">Nombre</th>
                <th className="px-5 py-3">Categoría</th>
                <th className="px-5 py-3">Límite DAC</th>
                <th className="px-5 py-3">Servicios</th>
                <th className="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[var(--color-border)]">
              {filtered.map((tarifa) => (
                <tr key={tarifa.id_tarifa} className="hover:bg-[var(--color-surface-2)]">
                  <td className="px-5 py-4 text-xs font-semibold text-[var(--color-muted)]">
                    {tarifa.id_tarifa}
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-[var(--color-info-soft)] px-2.5 py-1 text-xs font-bold text-[var(--chart-2)]">
                      {tarifa.codigo}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm font-semibold text-[var(--color-fg)]">
                    {tarifa.nombre}
                  </td>
                  <td className="px-5 py-4 text-xs text-[var(--color-fg-secondary)]">
                    {formatCategory(tarifa.categoria)}
                  </td>
                  <td className="px-5 py-4 text-xs font-semibold text-[var(--color-warning)]">
                    {tarifa.limite_dac_kwh_mes === null
                      ? "No aplica"
                      : `${tarifa.limite_dac_kwh_mes.toLocaleString("es-MX")} kWh/mes`}
                  </td>
                  <td className="px-5 py-4 text-xs font-bold text-[var(--color-success)]">
                    {tarifa.total_servicios.toLocaleString("es-MX")}
                  </td>
                  <td className="px-5 py-4">
                    <AccionesTarifa
                      tarifa={tarifa}
                      deletingId={deletingId}
                      onEdit={() => openEdit(tarifa)}
                      onDelete={() => void handleDelete(tarifa)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="divide-y divide-[var(--color-border)] lg:hidden">
          {filtered.map((tarifa) => (
            <li key={tarifa.id_tarifa} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-[var(--color-info-soft)] px-2.5 py-1 text-[11px] font-bold text-[var(--chart-2)]">
                      {tarifa.codigo}
                    </span>
                    <span className="text-[11px] font-semibold text-[var(--color-muted)]">
                      #{tarifa.id_tarifa}
                    </span>
                  </div>
                  <p className="mt-1.5 truncate text-sm font-semibold text-[var(--color-fg)]">
                    {tarifa.nombre}
                  </p>
                  <p className="text-xs text-[var(--color-fg-secondary)]">
                    {formatCategory(tarifa.categoria)}
                  </p>
                </div>
                <AccionesTarifa
                  tarifa={tarifa}
                  deletingId={deletingId}
                  onEdit={() => openEdit(tarifa)}
                  onDelete={() => void handleDelete(tarifa)}
                />
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-[var(--color-surface-2)] p-2.5">
                  <dt className="text-[10px] font-medium text-[var(--color-muted)]">
                    Límite DAC
                  </dt>
                  <dd className="mt-0.5 font-semibold text-[var(--color-warning)]">
                    {tarifa.limite_dac_kwh_mes === null
                      ? "No aplica"
                      : `${tarifa.limite_dac_kwh_mes.toLocaleString("es-MX")} kWh/mes`}
                  </dd>
                </div>
                <div className="rounded-xl bg-[var(--color-surface-2)] p-2.5">
                  <dt className="text-[10px] font-medium text-[var(--color-muted)]">
                    Servicios
                  </dt>
                  <dd className="mt-0.5 font-semibold text-[var(--color-success)]">
                    {tarifa.total_servicios.toLocaleString("es-MX")}
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>

        {filtered.length === 0 && (
          <div className="p-10 text-center">
            <BadgeDollarSign size={30} className="mx-auto mb-3 text-[var(--color-muted-2)]" />
            <p className="text-sm text-[var(--color-muted)]">
              No se encontraron tarifas con los filtros seleccionados.
            </p>
          </div>
        )}
      </div>

      {showForm && (
        <TarifaForm
          tarifa={editing}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}


