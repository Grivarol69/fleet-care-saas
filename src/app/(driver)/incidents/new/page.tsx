'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  MapPin,
  MapPinOff,
  Camera,
  Loader2,
  AlertOctagon,
  Info,
  AlertCircle,
  Skull,
} from 'lucide-react';
import { saveIncidentDraft } from '../../_lib/checklist-db';

type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

const SEVERITY_OPTIONS: {
  key: Severity;
  label: string;
  icon: React.ElementType;
  active: string;
  full?: boolean;
}[] = [
  {
    key: 'LOW',
    label: 'Baja',
    icon: Info,
    active: 'bg-blue-100 border-blue-400 text-blue-700',
  },
  {
    key: 'MEDIUM',
    label: 'Media',
    icon: AlertCircle,
    active: 'bg-amber-100 border-amber-400 text-amber-700',
  },
  {
    key: 'HIGH',
    label: 'Alta',
    icon: AlertCircle,
    active: 'bg-orange-100 border-orange-500 text-orange-700',
  },
  {
    key: 'CRITICAL',
    label: 'Crítica',
    icon: Skull,
    active: 'bg-red-100 border-red-500 text-red-700',
    full: true,
  },
];

export default function IncidentFormScreen() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [severity, setSeverity] = useState<Severity | null>(null);
  const [description, setDescription] = useState('');
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'loading' | 'ok' | 'error'>(
    'loading'
  );
  const [gpsLabel, setGpsLabel] = useState('Obteniendo ubicación...');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [shakeFields, setShakeFields] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch('/api/driver/me')
      .then(r => r.json())
      .then(data => {
        if (data.vehicle) setVehicleId(data.vehicle.id);
        if (data.driver) setDriverId(data.driver.id);
      })
      .catch(() => {});

    navigator.geolocation?.getCurrentPosition(
      pos => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setGpsLabel(
          `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`
        );
        setGpsStatus('ok');
      },
      () => {
        setGpsStatus('error');
        setGpsLabel('Ubicación no disponible');
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoBlob(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!severity) errs.severity = 'Seleccioná una severidad';
    if (!description || description.trim().length < 10)
      errs.description = 'Mínimo 10 caracteres';
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      const shakes: Record<string, boolean> = {};
      for (const k of Object.keys(errs)) shakes[k] = true;
      setShakeFields(shakes);
      setTimeout(() => setShakeFields({}), 500);
      return;
    }

    setSubmitting(true);

    const isOnline = navigator.onLine;
    const clientUuid = crypto.randomUUID();

    if (!isOnline) {
      await saveIncidentDraft({
        id: clientUuid,
        tenantId: '',
        vehicleId,
        driverId,
        description: description.trim(),
        severity: severity!,
        photoBlob,
        lat,
        lng,
        createdAt: new Date().toISOString(),
        syncStatus: 'pending',
      });
      router.push('/home');
      return;
    }

    try {
      let photoUrl: string | null = null;

      if (photoBlob) {
        const formData = new FormData();
        formData.append('file', photoBlob, 'incident.jpg');
        const uploadRes = await fetch('/api/uploadthing', {
          method: 'POST',
          body: formData,
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          photoUrl = uploadData.url ?? null;
        }
      }

      const res = await fetch('/api/hseq/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientUuid,
          vehicleId,
          driverId,
          description: description.trim(),
          severity: severity!,
          photoUrl,
          latitude: lat,
          longitude: lng,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Error al enviar');
      }

      router.push('/home');
    } catch (e: any) {
      setErrors({ submit: e.message ?? 'Error al enviar' });
      setSubmitting(false);
    }
  };

  const isValid = severity !== null && description.trim().length >= 10;

  return (
    <div>
      <header
        className="px-4 py-4 flex items-center gap-3"
        style={{ backgroundColor: '#1E3A5F', color: '#F8FAFC' }}
      >
        <button
          onClick={() => router.push('/home')}
          className="text-slate-300 hover:text-white"
        >
          ✕ Cancelar
        </button>
        <span className="font-semibold flex-1 text-center">Nueva Novedad</span>
      </header>

      <div className="px-4 py-5 space-y-5">
        {/* Severity */}
        <div>
          <p
            className={`text-sm font-semibold text-slate-700 mb-2 ${shakeFields.severity ? 'drv-shake' : ''}`}
          >
            Severidad <span className="text-red-500">*</span>
          </p>
          <div className="flex gap-2 mb-2">
            {SEVERITY_OPTIONS.filter(o => !o.full).map(
              ({ key, label, icon: SIcon, active }) => (
                <button
                  key={key}
                  onClick={() => {
                    setSeverity(key);
                    setErrors(e => ({ ...e, severity: '' }));
                  }}
                  className={`flex-1 flex flex-col items-center gap-1 min-h-[80px] rounded-xl border-2 p-3 transition-all duration-150 ${
                    severity === key
                      ? active
                      : 'bg-slate-100 border-slate-200 text-slate-500'
                  }`}
                >
                  <SIcon className="w-5 h-5" />
                  <span className="text-xs font-semibold">{label}</span>
                </button>
              )
            )}
          </div>
          {SEVERITY_OPTIONS.filter(o => o.full).map(
            ({ key, label, icon: SIcon, active }) => (
              <button
                key={key}
                onClick={() => {
                  setSeverity(key);
                  setErrors(e => ({ ...e, severity: '' }));
                }}
                className={`w-full flex items-center justify-center gap-2 min-h-[56px] rounded-xl border-2 p-3 font-semibold transition-all duration-150 ${
                  severity === key
                    ? active
                    : 'bg-slate-100 border-slate-200 text-slate-500'
                }`}
              >
                <SIcon className="w-5 h-5" />
                {label}
              </button>
            )
          )}
          {errors.severity && (
            <p className="text-red-500 text-xs mt-1">{errors.severity}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Descripción <span className="text-red-500">*</span>
          </label>
          <textarea
            value={description}
            onChange={e => {
              setDescription(e.target.value);
              setErrors(er => ({ ...er, description: '' }));
            }}
            placeholder="Describí la novedad con el mayor detalle posible..."
            rows={4}
            className={`w-full px-3 py-3 rounded-lg border-2 outline-none resize-none text-slate-900 transition-colors ${
              shakeFields.description
                ? 'drv-shake border-red-500'
                : 'border-slate-200 focus:border-primary'
            }`}
            style={{ fontSize: 'max(1rem, 16px)' }}
          />
          {description.trim().length < 10 && description.length > 0 && (
            <p className="text-xs text-slate-400 mt-1">
              Mínimo 10 caracteres ({description.trim().length}/10)
            </p>
          )}
          {errors.description && (
            <p className="text-red-500 text-xs mt-1">{errors.description}</p>
          )}
        </div>

        {/* Photo */}
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-2">
            Foto (opcional)
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 px-4 h-12 rounded-lg border-2 border-slate-200 bg-white text-slate-600 font-medium text-sm"
            >
              <Camera className="w-5 h-5" />
              Sacar foto
            </button>
            {photoPreview && (
              <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200">
                <img
                  src={photoPreview}
                  alt="preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handlePhoto}
          />
        </div>

        {/* GPS */}
        <div className="bg-white rounded-xl shadow-sm p-3 flex items-center gap-2">
          {gpsStatus === 'loading' && (
            <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />
          )}
          {gpsStatus === 'ok' && (
            <MapPin className="w-4 h-4 text-green-600 flex-shrink-0" />
          )}
          {gpsStatus === 'error' && (
            <MapPinOff className="w-4 h-4 text-slate-400 flex-shrink-0" />
          )}
          <span
            className={`text-sm ${gpsStatus === 'error' ? 'text-slate-400' : 'text-slate-700'}`}
          >
            {gpsLabel}
          </span>
        </div>

        {errors.submit && (
          <p className="text-red-500 text-sm text-center bg-red-50 rounded-lg p-3">
            {errors.submit}
          </p>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting || !isValid}
          className="w-full h-14 bg-primary text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none active:scale-95 transition-transform"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <AlertOctagon className="w-5 h-5" />
              Reportar novedad
            </>
          )}
        </button>
      </div>
    </div>
  );
}
