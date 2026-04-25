'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Loader2, Fuel, CheckCircle2 } from 'lucide-react';
import { useUploadThing } from '@/lib/uploadthing';

type FuelType = 'GASOLINE' | 'DIESEL' | 'GAS' | 'ELECTRIC' | 'HYBRID';

const FUEL_TYPE_LABELS: Record<FuelType, string> = {
  GASOLINE: 'Gasolina',
  DIESEL: 'Diesel',
  GAS: 'Gas natural',
  ELECTRIC: 'Eléctrico',
  HYBRID: 'Híbrido',
};

export default function FuelNewScreen() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [lastOdometerKm, setLastOdometerKm] = useState<number | null>(null);
  const [licensePlate, setLicensePlate] = useState('');

  const [odometer, setOdometer] = useState('');
  const [quantity, setQuantity] = useState('');
  const [fuelType, setFuelType] = useState<FuelType>('DIESEL');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [vehicleError, setVehicleError] = useState<string | null>(null);

  const { startUpload, isUploading } = useUploadThing('fuelReceiptUploader');

  useEffect(() => {
    fetch('/api/driver/me')
      .then(r => r.json())
      .then(data => {
        if (!data.vehicle) {
          setVehicleError('Sin vehículo asignado. Iniciá un turno primero.');
          return;
        }
        setVehicleId(data.vehicle.id);
        setDriverId(data.driver?.id ?? '');
        setLastOdometerKm(data.vehicle.lastOdometerKm ?? null);
        setLicensePlate(data.vehicle.licensePlate ?? '');
      })
      .catch(() => setVehicleError('No se pudo cargar el vehículo.'));
  }, []);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setErrors(er => ({ ...er, photo: '' }));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    const km = parseFloat(odometer);
    if (!odometer || isNaN(km) || km <= 0)
      errs.odometer = 'Ingresá el odómetro actual';
    else if (lastOdometerKm !== null && km <= lastOdometerKm)
      errs.odometer = `Debe ser mayor al último registro (${lastOdometerKm} km)`;
    const qty = parseFloat(quantity);
    if (!quantity || isNaN(qty) || qty <= 0)
      errs.quantity = 'Ingresá los litros cargados';
    if (!photoFile) errs.photo = 'La foto del comprobante es obligatoria';
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    if (!vehicleId) return;

    setSubmitting(true);
    try {
      let receiptUrl: string | null = null;
      if (photoFile) {
        const uploaded = await startUpload([photoFile]);
        receiptUrl = uploaded?.[0]?.url ?? null;
        if (!receiptUrl) throw new Error('Error al subir la foto');
      }

      const res = await fetch('/api/fuel/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId,
          driverId: driverId || undefined,
          date: new Date().toISOString(),
          fuelType,
          quantity: parseFloat(quantity),
          odometer: parseFloat(odometer),
          volumeUnit: 'LITERS',
          receiptUrl,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message ?? data.error ?? 'Error al registrar');
      }

      router.push('/home');
    } catch (e: unknown) {
      setErrors({ submit: e instanceof Error ? e.message : 'Error al enviar' });
      setSubmitting(false);
    }
  };

  const isLoading = submitting || isUploading;

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
        <span className="font-semibold flex-1 text-center">
          Cargar Combustible
        </span>
      </header>

      <div className="px-4 py-5 space-y-5">
        {vehicleError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm text-red-700 font-medium">{vehicleError}</p>
          </div>
        )}

        {licensePlate && (
          <p className="text-xl font-bold font-mono tracking-wider text-slate-900">
            {licensePlate}
          </p>
        )}

        {/* Tipo combustible */}
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-2">
            Tipo de combustible
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(FUEL_TYPE_LABELS) as FuelType[]).map(type => (
              <button
                key={type}
                onClick={() => setFuelType(type)}
                className={`py-3 px-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                  fuelType === type
                    ? 'border-[#1E3A5F] bg-blue-50 text-[#1E3A5F]'
                    : 'border-slate-200 bg-white text-slate-500'
                }`}
              >
                {FUEL_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </div>

        {/* Odómetro */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Odómetro actual <span className="text-red-500">*</span>
          </label>
          {lastOdometerKm !== null && (
            <p className="text-xs text-slate-400 mb-1">
              Último registro: {lastOdometerKm} km
            </p>
          )}
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              value={odometer}
              onChange={e => {
                setOdometer(e.target.value);
                setErrors(er => ({ ...er, odometer: '' }));
              }}
              placeholder={lastOdometerKm ? `> ${lastOdometerKm}` : 'Ej: 45200'}
              className={`flex-1 h-12 px-3 rounded-lg border-2 text-slate-900 font-mono text-lg outline-none transition-colors ${errors.odometer ? 'border-red-500' : 'border-slate-200 focus:border-[#1E3A5F]'}`}
            />
            <span className="text-slate-500 font-medium">km</span>
          </div>
          {errors.odometer && (
            <p className="text-red-500 text-xs mt-1">{errors.odometer}</p>
          )}
        </div>

        {/* Litros */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Litros cargados <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="decimal"
              value={quantity}
              onChange={e => {
                setQuantity(e.target.value);
                setErrors(er => ({ ...er, quantity: '' }));
              }}
              placeholder="Ej: 40.5"
              className={`flex-1 h-12 px-3 rounded-lg border-2 text-slate-900 font-mono text-lg outline-none transition-colors ${errors.quantity ? 'border-red-500' : 'border-slate-200 focus:border-[#1E3A5F]'}`}
            />
            <span className="text-slate-500 font-medium">L</span>
          </div>
          {errors.quantity && (
            <p className="text-red-500 text-xs mt-1">{errors.quantity}</p>
          )}
        </div>

        {/* Foto comprobante */}
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-2">
            Foto comprobante <span className="text-red-500">*</span>
          </p>
          <div className="flex gap-3 items-center">
            <button
              onClick={() => fileRef.current?.click()}
              className={`flex items-center gap-2 px-4 h-12 rounded-lg border-2 font-medium text-sm transition-colors ${
                errors.photo
                  ? 'border-red-500 text-red-600'
                  : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              <Camera className="w-5 h-5" />
              {photoFile ? 'Cambiar foto' : 'Tomar foto'}
            </button>
            {photoPreview && (
              <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 flex-shrink-0">
                <img
                  src={photoPreview}
                  alt="comprobante"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            {photoFile && !photoPreview && (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
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
          {errors.photo && (
            <p className="text-red-500 text-xs mt-1">{errors.photo}</p>
          )}
        </div>

        {errors.submit && (
          <div className="bg-red-50 rounded-xl p-3">
            <p className="text-red-600 text-sm text-center">{errors.submit}</p>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={isLoading || !vehicleId}
          className="w-full h-14 bg-[#1E3A5F] text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none active:scale-95 transition-transform"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {isUploading ? 'Subiendo foto...' : 'Enviando...'}
            </>
          ) : (
            <>
              <Fuel className="w-5 h-5" />
              Registrar carga
            </>
          )}
        </button>
      </div>
    </div>
  );
}
