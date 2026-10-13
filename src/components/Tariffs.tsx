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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a1a2e]/30 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#f0f1f7] p-6">
          <div>
            <h2 className="text-lg font-bold text-[#1a1a2e]">
              {editing ? "Editar tarifa" : "Nueva tarifa"}
            </h2>
            <p className="mt-0.5 text-xs text-[#9098b1]">
              {editing
                ? `Configuración de la tarifa ${tarifa.codigo}`
                : "Agregar una tarifa al catálogo"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f2f3f7] hover:bg-[#e5e7ef] disabled:opacity-50"
          >
            <X size={14} className="text-[#9098b1]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          {error && (
            <div className="flex items-start gap-2 rounded-2xl bg-[#fef2f2] p-3 text-xs text-[#b91c1c]">
              <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-[#606881]">
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
                className="rounded-xl border border-[#e5e7ef] px-3 py-2.5 text-sm outline-none focus:border-[#ff8a1f] disabled:bg-[#f8f9fc] disabled:text-[#9098b1]"
                placeholder="Ej. 7"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-[#606881]">
                Código
              </span>
              <input
                type="text"
                required
                maxLength={6}
                disabled={saving}
                value={form.codigo}
                onChange={(event) => updateField("codigo", event.target.value)}
                className="rounded-xl border border-[#e5e7ef] px-3 py-2.5 text-sm uppercase outline-none focus:border-[#ff8a1f]"
                placeholder="Ej. PDBT"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-[#606881]">Nombre</span>
            <input
              type="text"
              required
              maxLength={60}
              disabled={saving}
              value={form.nombre}
              onChange={(event) => updateField("nombre", event.target.value)}
              className="rounded-xl border border-[#e5e7ef] px-3 py-2.5 text-sm outline-none focus:border-[#ff8a1f]"
              placeholder="Nombre descriptivo de la tarifa"
            />
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-[#606881]">
                Categoría
              </span>
              <input
                type="text"
                required
                maxLength={18}
                disabled={saving}
                value={form.categoria}
                onChange={(event) => updateField("categoria", event.target.value)}
                className="rounded-xl border border-[#e5e7ef] px-3 py-2.5 text-sm outline-none focus:border-[#ff8a1f]"
                placeholder="Ej. DOMESTICA"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-[#606881]">
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
                className="rounded-xl border border-[#e5e7ef] px-3 py-2.5 text-sm outline-none focus:border-[#ff8a1f]"
                placeholder="Vacío si no aplica"
              />
            </label>
          </div>

          <div className="mt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-[#e5e7ef] px-4 py-2.5 text-xs font-semibold text-[#606881] disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#ff8a1f] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear tarifa"}
            </button>
          </div>
        </form>
      </div>
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
          <RefreshCw size={20} className="animate-spin text-[#ff8a1f]" />
          <p className="text-sm text-[#9098b1]">
            Cargando tarifas desde PostgreSQL...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1
            className="text-2xl font-bold text-[#1a1a2e]"
            style={{ fontFamily: "Nunito, sans-serif" }}
          >
            Módulo de Tarifas
          </h1>
          <p className="mt-0.5 text-sm text-[#9098b1]">
            Administración del catálogo tarifario de PostgreSQL
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void cargarTarifas()}
            className="flex items-center gap-2 rounded-xl border border-[#e5e7ef] bg-white px-3 py-2 text-xs font-semibold text-[#606881]"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Actualizar
          </button>

          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-[#ff8a1f] px-4 py-2 text-xs font-semibold text-white"
          >
            <Plus size={14} />
            Nueva tarifa
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start justify-between gap-3 rounded-2xl bg-[#fef2f2] p-4 text-xs text-[#b91c1c]">
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
        <div className="flex items-center justify-between rounded-2xl bg-[#ecfdf5] p-4 text-xs font-medium text-[#047857]">
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
            color: "#6366f1",
            background: "#eef2ff",
          },
          {
            label: "Categorías",
            value: categorias.length,
            icon: BadgeDollarSign,
            color: "#ff8a1f",
            background: "#fff4ea",
          },
          {
            label: "Tarifas con límite DAC",
            value: tarifasConDac,
            icon: AlertTriangle,
            color: "#f59e0b",
            background: "#fffbeb",
          },
          {
            label: "Servicios asociados",
            value: totalServicios,
            icon: Users,
            color: "#10b981",
            background: "#ecfdf5",
          },
        ].map((item) => (
          <div key={item.label} className="card p-4">
            <div
              className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ background: item.background }}
            >
              <item.icon size={16} color={item.color} />
            </div>
            <p className="text-[11px] font-medium text-[#9098b1]">
              {item.label}
            </p>
            <p className="mt-0.5 text-lg font-bold text-[#1a1a2e]">
              {item.value.toLocaleString("es-MX")}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-52 flex-1">
          <Search
            size={14}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9098b1]"
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por ID, código, nombre o categoría..."
            className="w-full rounded-2xl border border-[#e5e7ef] bg-white py-2.5 pl-10 pr-4 text-sm text-[#1a1a2e] outline-none placeholder:text-[#9098b1] focus:border-[#ff8a1f]"
          />
        </div>

        <select
          value={filterCategory}
          onChange={(event) => setFilterCategory(event.target.value)}
          className="rounded-2xl border border-[#e5e7ef] bg-white px-4 py-2.5 text-sm text-[#1a1a2e] outline-none focus:border-[#ff8a1f]"
        >
          <option value="Todas">Todas las categorías</option>
          {categorias.map((categoria) => (
            <option key={categoria} value={categoria}>
              {formatCategory(categoria)}
            </option>
          ))}
        </select>

        <span className="text-xs font-medium text-[#9098b1]">
          {filtered.length} registros
        </span>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left">
            <thead className="border-b border-[#f0f1f7] bg-[#f8f9fc]">
              <tr className="text-[11px] font-semibold uppercase tracking-wide text-[#9098b1]">
                <th className="px-5 py-3">ID</th>
                <th className="px-5 py-3">Código</th>
                <th className="px-5 py-3">Nombre</th>
                <th className="px-5 py-3">Categoría</th>
                <th className="px-5 py-3">Límite DAC</th>
                <th className="px-5 py-3">Servicios</th>
                <th className="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#f0f1f7]">
              {filtered.map((tarifa) => (
                <tr key={tarifa.id_tarifa} className="hover:bg-[#fbfbfd]">
                  <td className="px-5 py-4 text-xs font-semibold text-[#9098b1]">
                    {tarifa.id_tarifa}
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-[#eef2ff] px-2.5 py-1 text-xs font-bold text-[#6366f1]">
                      {tarifa.codigo}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm font-semibold text-[#1a1a2e]">
                    {tarifa.nombre}
                  </td>
                  <td className="px-5 py-4 text-xs text-[#606881]">
                    {formatCategory(tarifa.categoria)}
                  </td>
                  <td className="px-5 py-4 text-xs font-semibold text-[#f59e0b]">
                    {tarifa.limite_dac_kwh_mes === null
                      ? "No aplica"
                      : `${tarifa.limite_dac_kwh_mes.toLocaleString("es-MX")} kWh/mes`}
                  </td>
                  <td className="px-5 py-4 text-xs font-bold text-[#10b981]">
                    {tarifa.total_servicios.toLocaleString("es-MX")}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(tarifa)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eef2ff] text-[#6366f1] hover:bg-[#e0e7ff]"
                        title="Editar tarifa"
                      >
                        <Edit3 size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleDelete(tarifa)}
                        disabled={deletingId === tarifa.id_tarifa}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#fef2f2] text-[#ef4444] hover:bg-[#fee2e2] disabled:opacity-40"
                        title={
                          tarifa.total_servicios > 0
                            ? "La API impedirá eliminar una tarifa asignada"
                            : "Eliminar tarifa"
                        }
                      >
                        {deletingId === tarifa.id_tarifa ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="p-10 text-center">
            <BadgeDollarSign size={30} className="mx-auto mb-3 text-[#b0b6c8]" />
            <p className="text-sm text-[#9098b1]">
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
